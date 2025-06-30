import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "police-system-secret-key-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Create default admin user if none exists
  try {
    const existingUser = await storage.getUserByUsername("admin");
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash("123456", 10);
      await storage.createUser({
        username: "admin",
        password: hashedPassword,
        firstName: "Administrador",
        lastName: "Sistema",
        email: "admin@policia.gov.ve",
        role: "admin",
      });
      console.log("Created default admin user - username: admin, password: 123456");
    }
  } catch (error) {
    console.error("Error creating default user:", error);
  }
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const session = req.session as any;
  
  if (!session.userId) {
    return res.status(401).json({ message: "No autorizado - Debe iniciar sesión" });
  }

  try {
    const user = await storage.getUser(session.userId);
    if (!user) {
      session.userId = null;
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error checking authentication:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}