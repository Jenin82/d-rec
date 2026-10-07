"use client";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
export type AuthUser = { id: string; email: string; emailVerified: boolean; user_metadata: { full_name: string; avatar_url?: string | null } };
export type AuthSession = { user: AuthUser };
export function toAuthUser(user: { id: string; email: string; emailVerified: boolean; name: string; image?: string | null }): AuthUser {
  return { id: user.id, email: user.email, emailVerified: user.emailVerified, user_metadata: { full_name: user.name, avatar_url: user.image } };
}
export function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return "/dashboard";
  return value;
}
export const sessionClient = {
  async getUser() {
    const result = await authClient.getSession();
    return { data: { user: result.data ? toAuthUser(result.data.user) : null }, error: result.error };
  },
  async signOut() { return authClient.signOut(); },
};
