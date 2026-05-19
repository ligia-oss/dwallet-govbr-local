import { bigint, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here

/**
 * Cache persistente do token M2M Dataprev.
 * Sobrevive a reinicializações do servidor Express/Node.
 * Apenas um registro por escopo de credencial (credentialScope = SHA256 das credenciais).
 */
export const m2mTokenCache = mysqlTable("m2mTokenCache", {
  id: int("id").autoincrement().primaryKey(),
  credentialScope: varchar("credentialScope", { length: 64 }).notNull().unique(),
  tokenHandle: varchar("tokenHandle", { length: 64 }).notNull(),
  encryptedToken: text("encryptedToken").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type M2MTokenCache = typeof m2mTokenCache.$inferSelect;
export type InsertM2MTokenCache = typeof m2mTokenCache.$inferInsert;

/**
 * Cache persistente de tokens de usuário (employee/person) da Dataprev.
 * Sobrevive a reinicializações do servidor Express/Node.
 * Cada handle é único e mapeia para um JWT de acesso do usuário.
 */
export const userTokenCache = mysqlTable("userTokenCache", {
  id: int("id").autoincrement().primaryKey(),
  handle: varchar("handle", { length: 64 }).notNull().unique(),
  token: text("token").notNull(),
  /** Timestamp Unix em milissegundos da expiração do token. Null = sem expiração definida. */
  expiresAt: bigint("expiresAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserTokenCache = typeof userTokenCache.$inferSelect;
export type InsertUserTokenCache = typeof userTokenCache.$inferInsert;