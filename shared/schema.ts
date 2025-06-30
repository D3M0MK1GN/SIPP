import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  date,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  email: varchar("email"),
  role: varchar("role").default("officer"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Detainees table
export const detainees = pgTable("detainees", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name").notNull(),
  cedula: varchar("cedula").notNull().unique(),
  birthDate: date("birth_date").notNull(),
  state: varchar("state").notNull(),
  municipality: varchar("municipality").notNull(),
  parish: varchar("parish").notNull(),
  address: text("address").notNull(),
  registro: text("registro"),
  phone: varchar("phone"),
  photoUrl: varchar("photo_url"),
  idDocumentUrl: varchar("id_document_url"),
  registeredBy: integer("registered_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Search logs table for tracking searches
export const searchLogs = pgTable("search_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  searchTerm: varchar("search_term").notNull(),
  resultsCount: integer("results_count").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity logs table for dashboard tracking
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  action: varchar("action").notNull(), // 'registration', 'search', 'login'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// User authentication schemas
export const loginSchema = z.object({
  username: z.string().min(3, "Usuario debe tener al menos 3 caracteres"),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
});

export const registerUserSchema = z.object({
  username: z.string().min(3, "Usuario debe tener al menos 3 caracteres"),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
  firstName: z.string().min(1, "Nombre es requerido"),
  lastName: z.string().min(1, "Apellido es requerido"),
  email: z.string().email("Email inválido").optional(),
});

export const insertDetaineeSchema = createInsertSchema(detainees).omit({
  id: true,
  registeredBy: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  cedula: z.string().min(1, "Cédula es requerida").transform(val => {
    // Automatically add V- prefix if not present
    if (!val.toLowerCase().startsWith('v-') && !val.toLowerCase().startsWith('e-')) {
      return `V-${val}`;
    }
    return val.toUpperCase();
  }),
});

export const searchDetaineeSchema = z.object({
  cedula: z.string().min(1, "Cédula es requerida").optional(),
  fullName: z.string().optional(),
  state: z.string().optional(),
  municipality: z.string().optional(),
  parish: z.string().optional(),
});

export type InsertDetainee = z.infer<typeof insertDetaineeSchema>;
export type Detainee = typeof detainees.$inferSelect;
export type SearchLog = typeof searchLogs.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
