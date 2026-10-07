import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./auth-schema";
import { getEnv, type RuntimeEnv } from "./runtime";

export function getAuth(env: RuntimeEnv = getEnv()) {
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  return betterAuth({
    appName: "D-Rec", baseURL: env.APP_ORIGIN, secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.APP_ORIGIN],
    advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
    database: drizzleAdapter(drizzle(env.DB, { schema }), { provider: "sqlite", schema, transaction: false }),
    emailAndPassword: { enabled: false },
    disabledPaths: [
      "/sign-in/email", "/sign-up/email", "/request-password-reset", "/reset-password",
      "/change-password", "/set-password", "/verify-password",
      "/send-verification-email", "/verify-email", "/change-email",
    ],
    account: { accountLinking: { enabled: false } },
    user: {
      validateUserInfo: ({ user, source }) => {
        if (source.method !== "oauth" || source.oauth?.providerId !== "google" || !user.emailVerified) {
          return { error: "email_not_verified", errorDescription: "Sign in with a verified Google account." };
        }
      },
    },
    socialProviders: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? {
      google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, prompt: "select_account" },
    } : {},
    session: { expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
  });
}
