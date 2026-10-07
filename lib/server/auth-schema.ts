import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";

const createdAt = () => integer("createdAt", { mode: "timestamp_ms" }).notNull();
const updatedAt = () => integer("updatedAt", { mode: "timestamp_ms" }).notNull();
export const user = sqliteTable("user", {
  id: text("id").primaryKey(), name: text("name").notNull(), email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false), image: text("image"),
  createdAt: createdAt(), updatedAt: updatedAt(),
});
export const session = sqliteTable("session", {
  id: text("id").primaryKey(), expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(), createdAt: createdAt(), updatedAt: updatedAt(),
  ipAddress: text("ipAddress"), userAgent: text("userAgent"), userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (t) => [index("session_user_idx").on(t.userId)]);
export const account = sqliteTable("account", {
  id: text("id").primaryKey(), accountId: text("accountId").notNull(), providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"), refreshToken: text("refreshToken"), idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp_ms" }),
  scope: text("scope"), password: text("password"), createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [index("account_user_idx").on(t.userId)]);
export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(), identifier: text("identifier").notNull(), value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(), createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [index("verification_identifier_idx").on(t.identifier)]);
export const rateLimit = sqliteTable("rateLimit", {
  id: text("id").primaryKey(), key: text("key").notNull().unique(), count: integer("count").notNull(), lastRequest: integer("lastRequest").notNull(),
});
