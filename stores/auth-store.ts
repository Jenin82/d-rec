import { create } from "zustand";
import type { AuthUser, AuthSession } from "@/lib/auth-client";
export type AuthState = {
  user: AuthUser | null; session: AuthSession | null; isLoading: boolean;
  setSession: (session: AuthSession | null) => void; setLoading: (value: boolean) => void;
};
export const useAuthStore = create<AuthState>((set) => ({
  user: null, session: null, isLoading: true,
  setSession: (session) => set({ session, user: session?.user ?? null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
