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
import { eq, desc, sql, and, gte, lt, ilike, or } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  
  // Admin user management operations
  getAllUsers(): Promise<User[]>;
  searchUsers(criteria: {
    username?: string;
    role?: string;
    status?: string;
  }): Promise<User[]>;
  updateUser(id: number, user: Partial<UpsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  suspendUser(id: number, suspendedUntil: Date, reason: string): Promise<User>;
  reactivateUser(id: number): Promise<User>;
  
  // Detainee operations
  createDetainee(detainee: InsertDetainee & { registeredBy: number }): Promise<Detainee>;
  searchDetainees(criteria: {
    cedula?: string;
    fullName?: string;
    state?: string;
    municipality?: string;
    parish?: string;
  }): Promise<Detainee[]>;
  getAllDetainees(): Promise<Detainee[]>;
  getDetaineeById(id: number): Promise<Detainee | undefined>;
  
  // Search logging
  logSearch(userId: number, searchTerm: string, resultsCount: number): Promise<SearchLog>;
  
  // Activity logging
  logActivity(userId: number, action: string, description?: string): Promise<ActivityLog>;
  
  // Session management
  updateUserSession(userId: number, sessionId: string | null): Promise<User>;
  getUserBySessionId(sessionId: string): Promise<User | undefined>;
  
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
  // User operations

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  // Detainee operations
  async createDetainee(detaineeData: InsertDetainee & { registeredBy: number }): Promise<Detainee> {
    const [detainee] = await db
      .insert(detainees)
      .values(detaineeData)
      .returning();
    return detainee;
  }

  async searchDetainees(criteria: {
    cedula?: string;
    fullName?: string;
    state?: string;
    municipality?: string;
    parish?: string;
  }): Promise<Detainee[]> {
    let query = db.select().from(detainees);
    
    const conditions = [];
    if (criteria.cedula) {
      conditions.push(eq(detainees.cedula, criteria.cedula));
    }
    if (criteria.fullName) {
      conditions.push(sql`${detainees.fullName} ILIKE ${'%' + criteria.fullName + '%'}`);
    }
    if (criteria.state) {
      conditions.push(eq(detainees.state, criteria.state));
    }
    if (criteria.municipality) {
      conditions.push(eq(detainees.municipality, criteria.municipality));
    }
    if (criteria.parish) {
      conditions.push(eq(detainees.parish, criteria.parish));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(detainees.createdAt));
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
  async logSearch(userId: number, searchTerm: string, resultsCount: number): Promise<SearchLog> {
    const [log] = await db
      .insert(searchLogs)
      .values({ userId, searchTerm, resultsCount })
      .returning();
    return log;
  }

  // Activity logging
  async logActivity(userId: number, action: string, description?: string): Promise<ActivityLog> {
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

  // Admin user management implementations
  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async searchUsers(criteria: {
    username?: string;
    role?: string;
    status?: string;
  }): Promise<User[]> {
    let query = db.select().from(users);
    
    const conditions = [];
    if (criteria.username) {
      conditions.push(ilike(users.username, `%${criteria.username}%`));
    }
    if (criteria.role) {
      conditions.push(eq(users.role, criteria.role));
    }
    if (criteria.status) {
      conditions.push(eq(users.status, criteria.status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(users.createdAt));
  }

  async updateUser(id: number, userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    // Primero eliminar los registros relacionados para evitar violaciones de clave foránea
    await db.delete(activityLogs).where(eq(activityLogs.userId, id));
    await db.delete(searchLogs).where(eq(searchLogs.userId, id));
    
    // Luego eliminar el usuario
    await db.delete(users).where(eq(users.id, id));
  }

  async suspendUser(id: number, suspendedUntil: Date, reason: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        status: "suspended",
        suspendedUntil,
        suspendedReason: reason,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async reactivateUser(id: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        status: "active",
        suspendedUntil: null,
        suspendedReason: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserSession(userId: number, sessionId: string | null): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        activeSessionId: sessionId,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserBySessionId(sessionId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.activeSessionId, sessionId))
      .limit(1);
    return user;
  }
}

export const storage = new DatabaseStorage();
