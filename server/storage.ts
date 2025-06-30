import {
  users,
  detainees,
  searchLogs,
  activityLogs,
  type User,
  type UpsertUser,
  type InsertDetainee,
  type Detainee,
  type SearchLog,
  type ActivityLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte, lt } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Detainee operations
  createDetainee(detainee: InsertDetainee & { registeredBy: string }): Promise<Detainee>;
  searchDetaineesByCedula(cedula: string): Promise<Detainee[]>;
  getAllDetainees(): Promise<Detainee[]>;
  getDetaineeById(id: number): Promise<Detainee | undefined>;
  
  // Search logging
  logSearch(userId: string, searchTerm: string, resultsCount: number): Promise<SearchLog>;
  
  // Activity logging
  logActivity(userId: string, action: string, description?: string): Promise<ActivityLog>;
  
  // Dashboard statistics
  getDashboardStats(): Promise<{
    totalRecords: number;
    activeUsers: number;
    todaySearches: number;
    todayRegistrations: number;
  }>;
  
  getRecentActivities(): Promise<ActivityLog[]>;
  getWeeklyActivity(): Promise<{ day: string; count: number }[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Detainee operations
  async createDetainee(detaineeData: InsertDetainee & { registeredBy: string }): Promise<Detainee> {
    const [detainee] = await db
      .insert(detainees)
      .values(detaineeData)
      .returning();
    return detainee;
  }

  async searchDetaineesByCedula(cedula: string): Promise<Detainee[]> {
    return await db
      .select()
      .from(detainees)
      .where(eq(detainees.cedula, cedula))
      .orderBy(desc(detainees.createdAt));
  }

  async getAllDetainees(): Promise<Detainee[]> {
    return await db
      .select()
      .from(detainees)
      .orderBy(desc(detainees.createdAt));
  }

  async getDetaineeById(id: number): Promise<Detainee | undefined> {
    const [detainee] = await db
      .select()
      .from(detainees)
      .where(eq(detainees.id, id));
    return detainee;
  }

  // Search logging
  async logSearch(userId: string, searchTerm: string, resultsCount: number): Promise<SearchLog> {
    const [log] = await db
      .insert(searchLogs)
      .values({ userId, searchTerm, resultsCount })
      .returning();
    return log;
  }

  // Activity logging
  async logActivity(userId: string, action: string, description?: string): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLogs)
      .values({ userId, action, description })
      .returning();
    return log;
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<{
    totalRecords: number;
    activeUsers: number;
    todaySearches: number;
    todayRegistrations: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalRecords] = await db
      .select({ count: sql<number>`count(*)` })
      .from(detainees);

    const [activeUsers] = await db
      .select({ count: sql<number>`count(distinct ${activityLogs.userId})` })
      .from(activityLogs)
      .where(gte(activityLogs.createdAt, today));

    const [todaySearches] = await db
      .select({ count: sql<number>`count(*)` })
      .from(searchLogs)
      .where(and(
        gte(searchLogs.createdAt, today),
        lt(searchLogs.createdAt, tomorrow)
      ));

    const [todayRegistrations] = await db
      .select({ count: sql<number>`count(*)` })
      .from(detainees)
      .where(and(
        gte(detainees.createdAt, today),
        lt(detainees.createdAt, tomorrow)
      ));

    return {
      totalRecords: totalRecords.count,
      activeUsers: activeUsers.count,
      todaySearches: todaySearches.count,
      todayRegistrations: todayRegistrations.count,
    };
  }

  async getRecentActivities(): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(10);
  }

  async getWeeklyActivity(): Promise<{ day: string; count: number }[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activities = await db
      .select({
        day: sql<string>`date_trunc('day', ${activityLogs.createdAt})`,
        count: sql<number>`count(*)`
      })
      .from(activityLogs)
      .where(gte(activityLogs.createdAt, sevenDaysAgo))
      .groupBy(sql`date_trunc('day', ${activityLogs.createdAt})`)
      .orderBy(sql`date_trunc('day', ${activityLogs.createdAt})`);

    return activities.map(activity => ({
      day: activity.day,
      count: activity.count
    }));
  }
}

export const storage = new DatabaseStorage();
