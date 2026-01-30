"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect } from "react";

import { supabase } from "@/lib/supabase/client";
import { type AuthState, useAuthStore } from "@/stores/auth-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((state: AuthState) => state.setSession);
  const setLoading = useAuthStore((state: AuthState) => state.setLoading);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        if (isMounted) {
          setSession(data.session ?? null);
        }
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: string, session: Session | null) => {
        if (isMounted) {
          setSession(session);
        }
      },
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      setLoading(false);
    };
  }, [setSession, setLoading]);

  return <>{children}</>;
}
