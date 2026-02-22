import { create } from "zustand";
import { supabase } from "@/lib/supabase/client";

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
    set({ isLoading: true, error: null });

    // Get organizations where the user is a member with an admin or owner role
    const { data: memberData, error: memberError } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id || "")
      .in("role", ["teacher", "admin", "owner", "student"]);

    if (memberError) {
      set({ error: memberError.message, isLoading: false });
      return;
    }

    if (!memberData || memberData.length === 0) {
      set({ organizations: [], currentOrg: null, isLoading: false });
      return;
    }

    const orgIds = memberData
      .map((m) => m.organization_id)
      .filter((id): id is string => id !== null);

    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .in("id", orgIds)
      .order("name");

    if (orgError) {
      set({ error: orgError.message, isLoading: false });
      return;
    }

    const orgs = orgData as Organization[];

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
    if (typeof window !== "undefined") {
      localStorage.setItem("selected_org_id", org.id);
    }
    set({ currentOrg: org });
  },
}));
