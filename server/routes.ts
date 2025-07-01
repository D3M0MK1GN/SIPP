import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, comparePassword } from "./auth";
import { 
  insertDetaineeSchema, 
  searchDetaineeSchema, 
  loginSchema, 
  registerUserSchema,
  createUserSchema,
  updateUserSchema,
  suspendUserSchema,
  searchUserSchema
} from "@shared/schema";
import multer from "multer";
import { z } from "zod";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
      }

      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Usuario o contraseña incorrectos" });
      }

      // Verificar si el usuario ya tiene una sesión activa
      if (user.activeSessionId) {
        return res.status(409).json({ 
          message: "Este usuario ya tiene una sesión activa en otro dispositivo. Cierre la sesión anterior para continuar." 
        });
      }

      const session = req.session as any;
      session.userId = user.id;

      // Actualizar el usuario con el nuevo ID de sesión
      await storage.updateUserSession(user.id, session.id);

      // Log the login activity
      await storage.logActivity(user.id, 'login', `Usuario ${username} inició sesión`);

      res.json({ 
        message: "Inicio de sesión exitoso",
        user: {
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Datos inválidos", errors: error.errors });
      } else {
        console.error("Error during login:", error);
        res.status(500).json({ message: "Error del servidor" });
      }
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    try {
      const session = req.session as any;
      const userId = session.userId;
      
      // Limpiar la sesión activa del usuario en la base de datos
      if (userId) {
        await storage.updateUserSession(userId, null);
        await storage.logActivity(userId, 'logout', 'Usuario cerró sesión');
      }
      
      session.destroy((err: any) => {
        if (err) {
          return res.status(500).json({ message: "Error al cerrar sesión" });
        }
        res.json({ message: "Sesión cerrada exitosamente" });
      });
    } catch (error) {
      console.error("Error during logout:", error);
      res.status(500).json({ message: "Error al cerrar sesión" });
    }
  });

  app.get('/api/auth/user', requireAuth, async (req: any, res) => {
    try {
      const user = req.user;
      res.json({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Error al obtener información del usuario" });
    }
  });

  // Admin middleware
  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: "Acceso denegado - Solo administradores" });
    }
    next();
  };

  // Role-based middleware
  const requireSupervisorOrAdmin = (req: any, res: any, next: any) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'supervisor')) {
      return res.status(403).json({ message: "Acceso denegado - Solo administradores y supervisores" });
    }
    next();
  };

  const requireRegistrationAccess = (req: any, res: any, next: any) => {
    const allowedRoles = ['admin', 'officer', 'supervisor'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Acceso denegado - Sin permisos para registrar" });
    }
    next();
  };

  const requireSearchAccess = (req: any, res: any, next: any) => {
    const allowedRoles = ['admin', 'officer', 'supervisor', 'agent'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Acceso denegado - Sin permisos para buscar" });
    }
    next();
  };

  // Dashboard routes (Admin and Supervisor)
  app.get('/api/dashboard/stats', requireAuth, requireSupervisorOrAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  app.get('/api/dashboard/activities', requireAuth, requireSupervisorOrAdmin, async (req: any, res) => {
    try {
      const activities = await storage.getRecentActivities();
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch recent activities" });
    }
  });

  app.get('/api/dashboard/weekly-activity', requireAuth, requireSupervisorOrAdmin, async (req: any, res) => {
    try {
      const weeklyActivity = await storage.getWeeklyActivity();
      res.json(weeklyActivity);
    } catch (error) {
      console.error("Error fetching weekly activity:", error);
      res.status(500).json({ message: "Failed to fetch weekly activity" });
    }
  });

  // Detainee routes
  app.post('/api/detainees', requireAuth, requireRegistrationAccess, upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'idDocument', maxCount: 1 }
  ]), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertDetaineeSchema.parse(req.body);
      
      // Handle file uploads (in a real app, you'd upload to cloud storage)
      let photoUrl = null;
      let idDocumentUrl = null;
      
      if (req.files?.photo) {
        // In production, upload to cloud storage and get URL
        photoUrl = `data:image/jpeg;base64,${req.files.photo[0].buffer.toString('base64')}`;
      }
      
      if (req.files?.idDocument) {
        // In production, upload to cloud storage and get URL
        idDocumentUrl = `data:image/jpeg;base64,${req.files.idDocument[0].buffer.toString('base64')}`;
      }

      const detainee = await storage.createDetainee({
        ...validatedData,
        photoUrl,
        idDocumentUrl,
        registeredBy: userId,
      });

      // Log the activity
      await storage.logActivity(userId, 'registration', `Registered detainee: ${validatedData.fullName}`);

      res.status(201).json(detainee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error creating detainee:", error);
        res.status(500).json({ message: "Failed to create detainee record" });
      }
    }
  });

  app.get('/api/detainees', requireAuth, async (req: any, res) => {
    try {
      const detainees = await storage.getAllDetainees();
      res.json(detainees);
    } catch (error) {
      console.error("Error fetching detainees:", error);
      res.status(500).json({ message: "Failed to fetch detainee records" });
    }
  });

  app.get('/api/detainees/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid detainee ID" });
      }

      const detainee = await storage.getDetaineeById(id);
      if (!detainee) {
        return res.status(404).json({ message: "Detainee not found" });
      }

      res.json(detainee);
    } catch (error) {
      console.error("Error fetching detainee:", error);
      res.status(500).json({ message: "Failed to fetch detainee record" });
    }
  });

  // Search routes
  app.post('/api/search', requireAuth, requireSearchAccess, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const searchCriteria = searchDetaineeSchema.parse(req.body);
      
      const results = await storage.searchDetainees(searchCriteria);
      
      // Log the search
      const searchTerm = searchCriteria.cedula || 'simple search';
      await storage.logSearch(userId, searchTerm, results.length);
      await storage.logActivity(userId, 'search', `Simple search with cedula: ${searchCriteria.cedula}`);

      res.json(results);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        console.error("Error searching detainees:", error);
        res.status(500).json({ message: "Failed to search detainee records" });
      }
    }
  });

  // Advanced search route
  app.post('/api/search/advanced', requireAuth, requireSearchAccess, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const searchCriteria = req.body;
      
      // Validate that at least one search criteria is provided
      const hasValidCriteria = Object.values(searchCriteria).some(value => 
        value && typeof value === 'string' && value.trim() !== ''
      );
      
      if (!hasValidCriteria) {
        return res.status(400).json({ message: "Debe proporcionar al menos un criterio de búsqueda" });
      }
      
      const results = await storage.searchDetainees(searchCriteria);
      
      // Log the search
      const searchTerms = Object.entries(searchCriteria)
        .filter(([_, value]) => value && value.toString().trim() !== '')
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      
      await storage.logSearch(userId, `Advanced: ${searchTerms}`, results.length);
      await storage.logActivity(userId, 'advanced_search', `Advanced search with criteria: ${JSON.stringify(searchCriteria)}`);

      res.json(results);
    } catch (error) {
      console.error("Error in advanced search:", error);
      res.status(500).json({ message: "Error en la búsqueda avanzada" });
    }
  });

  // OCR simulation endpoint for ID document processing
  app.post('/api/ocr/process', requireAuth, upload.single('document'), async (req: any, res) => {
    try {
      // Simulate OCR processing
      // In a real application, you would use an OCR service like Tesseract or cloud OCR APIs
      const simulatedData = {
        fullName: "JUAN CARLOS RODRIGUEZ",
        cedula: "V-12345678",
        birthDate: "1985-03-15",
        confidence: 0.85
      };
      
      res.json(simulatedData);
    } catch (error) {
      console.error("Error processing OCR:", error);
      res.status(500).json({ message: "Failed to process document" });
    }
  });

  // Admin user management routes

  // Get all users (admin only)
  app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove password from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Error al obtener usuarios" });
    }
  });

  // Search users (admin only)
  app.post('/api/admin/users/search', requireAuth, requireAdmin, async (req, res) => {
    try {
      const criteria = searchUserSchema.parse(req.body);
      const users = await storage.searchUsers(criteria);
      // Remove password from response
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Error al buscar usuarios" });
    }
  });

  // Create new user (admin only)
  app.post('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userData = createUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "El nombre de usuario ya existe" });
      }

      // Hash password before storing
      const { hashPassword } = await import("./auth");
      const hashedPassword = await hashPassword(userData.password);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });

      // Log activity
      await storage.logActivity(req.session.userId, 'create_user', `Creó usuario ${userData.username}`);

      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Error al crear usuario" });
    }
  });

  // Update user (admin only)
  app.put('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = updateUserSchema.parse(req.body);
      
      // Check if updating username and it already exists
      if (userData.username) {
        const existingUser = await storage.getUserByUsername(userData.username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "El nombre de usuario ya existe" });
        }
      }

      const user = await storage.updateUser(userId, userData);
      
      // Log activity
      await storage.logActivity(req.session.userId, 'update_user', `Actualizó usuario ID ${userId}`);

      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Error al actualizar usuario" });
    }
  });

  // Suspend user (admin only)
  app.post('/api/admin/users/:id/suspend', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { suspendedUntil, suspendedReason } = suspendUserSchema.parse(req.body);
      
      const suspendDate = new Date(suspendedUntil);
      const user = await storage.suspendUser(userId, suspendDate, suspendedReason);
      
      // Log activity
      await storage.logActivity(req.session.userId, 'suspend_user', `Suspendió usuario ID ${userId} hasta ${suspendedUntil}`);

      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error suspending user:", error);
      res.status(500).json({ message: "Error al suspender usuario" });
    }
  });

  // Reactivate user (admin only)
  app.post('/api/admin/users/:id/reactivate', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.reactivateUser(userId);
      
      // Log activity
      await storage.logActivity(req.session.userId, 'reactivate_user', `Reactivó usuario ID ${userId}`);

      // Remove password from response
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error reactivating user:", error);
      res.status(500).json({ message: "Error al reactivar usuario" });
    }
  });

  // Delete user (admin only)
  app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Prevent admin from deleting themselves
      if (userId === req.session.userId) {
        return res.status(400).json({ message: "No puedes eliminarte a ti mismo" });
      }

      await storage.deleteUser(userId);
      
      // Log activity
      await storage.logActivity(req.session.userId, 'delete_user', `Eliminó usuario ID ${userId}`);

      res.json({ message: "Usuario eliminado exitosamente" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Error al eliminar usuario" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
