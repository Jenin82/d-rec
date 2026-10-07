"use client";
import { useEffect, useRef } from "react";
import { authClient, toAuthUser } from "@/lib/auth-client";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgStore } from "@/stores/org-store";
import { useQuestionStore } from "@/stores/question-store";
import { useSubmissionStore } from "@/stores/submission-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const previousUser = useRef<string | null | undefined>(undefined);
  const session = authClient.useSession();
  const setSession = useAuthStore((state) => state.setSession);
  const setLoading = useAuthStore((state) => state.setLoading);
  useEffect(() => {
    if (session.isPending) { setLoading(true); return; }
    const userId = session.data?.user.id ?? null;
    if (previousUser.current !== undefined && previousUser.current !== userId) {
      useOrgStore.setState({ organizations: [], currentOrg: null, isLoading: false, error: null });
      useQuestionStore.setState({ programs: [], isLoading: false, error: null });
      useSubmissionStore.setState({ algorithmSubmissions: [], codeSubmissions: [], isLoading: false, error: null });
      localStorage.removeItem("selected_org_id");
    }
    previousUser.current = userId;
    setSession(session.data ? { user: toAuthUser(session.data.user) } : null);
  }, [session.data, session.isPending, setSession, setLoading]);
  return <>{children}</>;
}
