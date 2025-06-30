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

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
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
  address: text("address").notNull(),
  phone: varchar("phone"),
  photoUrl: varchar("photo_url"),
  idDocumentUrl: varchar("id_document_url"),
  registeredBy: varchar("registered_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Search logs table for tracking searches
export const searchLogs = pgTable("search_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  searchTerm: varchar("search_term").notNull(),
  resultsCount: integer("results_count").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity logs table for dashboard tracking
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: varchar("action").notNull(), // 'registration', 'search', 'login'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertDetaineeSchema = createInsertSchema(detainees).omit({
  id: true,
  registeredBy: true,
  createdAt: true,
  updatedAt: true,
});

export const searchDetaineeSchema = z.object({
  cedula: z.string().min(1, "Cédula es requerida"),
});

export type InsertDetainee = z.infer<typeof insertDetaineeSchema>;
export type Detainee = typeof detainees.$inferSelect;
export type SearchLog = typeof searchLogs.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
