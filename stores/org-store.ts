import { captureCacheContext, invalidateCacheContext } from "@/lib/client-cache-context";
import { useQuestionStore } from "./question-store";
import { useSubmissionStore } from "./submission-store";
import { create } from "zustand";
import { getAccessibleOrganizations } from "@/lib/api-client";

export type Organization = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
};

type OrgState = {
  organizations: Organization[];
  currentOrg: Organization | null;
  isLoading: boolean;
  error: string | null;
  fetchOrganizations: () => Promise<void>;
  setCurrentOrg: (org: Organization) => void;
};

export const useOrgStore = create<OrgState>((set, get) => ({
  organizations: [],
  currentOrg: null,
  isLoading: false,
  error: null,

  fetchOrganizations: async () => {
    const isCurrent = captureCacheContext();
    set({ isLoading: true, error: null });

    const { data, error } = await getAccessibleOrganizations();
    if (!isCurrent()) return;
    if (error) {
      set({ error: error.message, isLoading: false });
      return;
    }
    const orgs = data || [];
    if (orgs.length === 0) {
      set({ organizations: [], currentOrg: null, isLoading: false });
      return;
    }

    // Check if we have a saved org preference in localStorage
    const savedOrgId =
      typeof window !== "undefined"
        ? localStorage.getItem("selected_org_id")
        : null;
    let defaultOrg = orgs[0];

    if (savedOrgId) {
      const found = orgs.find((o) => o.id === savedOrgId);
      if (found) defaultOrg = found;
    }

    set({
      organizations: orgs,
      currentOrg: get().currentOrg
        ? orgs.find((o) => o.id === get().currentOrg?.id) || defaultOrg
        : defaultOrg,
      isLoading: false,
    });
  },

  setCurrentOrg: (org) => {
    if (get().currentOrg?.id !== org.id) {
      invalidateCacheContext();
      useQuestionStore.setState({ programs: [], isLoading: false, error: null });
      useSubmissionStore.setState({ algorithmSubmissions: [], codeSubmissions: [], isLoading: false, error: null });
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("selected_org_id", org.id);
    }
    set({ currentOrg: org, isLoading: false, error: null });
  },
}));
