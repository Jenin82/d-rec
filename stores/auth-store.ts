import { create, type StateCreator } from "zustand";

import type { Session, User } from "@supabase/supabase-js";

export type AuthState = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setLoading: (value: boolean) => void;
};

const createAuthStore: StateCreator<AuthState> = (set) => ({
  user: null,
  session: null,
  isLoading: true,
  setSession: (session) =>
    set({ session, user: session?.user ?? null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
});

export const useAuthStore = create<AuthState>(createAuthStore);
