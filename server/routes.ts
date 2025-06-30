import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertDetaineeSchema, searchDetaineeSchema } from "@shared/schema";
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
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  app.get('/api/dashboard/activities', isAuthenticated, async (req: any, res) => {
    try {
      const activities = await storage.getRecentActivities();
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ message: "Failed to fetch recent activities" });
    }
  });

  app.get('/api/dashboard/weekly-activity', isAuthenticated, async (req: any, res) => {
    try {
      const weeklyActivity = await storage.getWeeklyActivity();
      res.json(weeklyActivity);
    } catch (error) {
      console.error("Error fetching weekly activity:", error);
      res.status(500).json({ message: "Failed to fetch weekly activity" });
    }
  });

  // Detainee routes
  app.post('/api/detainees', isAuthenticated, upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'idDocument', maxCount: 1 }
  ]), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get('/api/detainees', isAuthenticated, async (req: any, res) => {
    try {
      const detainees = await storage.getAllDetainees();
      res.json(detainees);
    } catch (error) {
      console.error("Error fetching detainees:", error);
      res.status(500).json({ message: "Failed to fetch detainee records" });
    }
  });

  app.get('/api/detainees/:id', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { cedula } = searchDetaineeSchema.parse(req.body);
      
      const results = await storage.searchDetaineesByCedula(cedula);
      
      // Log the search
      await storage.logSearch(userId, cedula, results.length);
      await storage.logActivity(userId, 'search', `Searched for cedula: ${cedula}`);

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

  // OCR simulation endpoint for ID document processing
  app.post('/api/ocr/process', isAuthenticated, upload.single('document'), async (req: any, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
