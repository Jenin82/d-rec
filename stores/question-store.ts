import { captureCacheContext } from "@/lib/client-cache-context";
import { create } from "zustand";

import { api, organizationProgramIds } from "@/lib/api-client";

export type Program = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  classroom_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type QuestionState = {
  programs: Program[];
  isLoading: boolean;
  error: string | null;
  fetchPrograms: (classroomId?: string, orgId?: string) => Promise<void>;
  fetchProgramById: (id: string) => Promise<Program | null>;
  createProgram: (
    program: Omit<Program, "id" | "created_at" | "updated_at">,
  ) => Promise<Program | null>;
  updateProgram: (
    id: string,
    updates: Partial<Program>,
  ) => Promise<Program | null>;
  deleteProgram: (id: string) => Promise<boolean>;
};

export const useQuestionStore = create<QuestionState>((set, get) => ({
  programs: [],
  isLoading: false,
  error: null,

  fetchPrograms: async (classroomId?: string, orgId?: string) => {
    const isCurrent = captureCacheContext();
    set({ programs: [], isLoading: true, error: null });
    let query = api
      .from("programs")
      .select("*")
      .order("created_at", { ascending: false });
    if (classroomId) {
      query = query.eq("classroom_id", classroomId);
    }
    if (orgId) {
      const ids = await organizationProgramIds(orgId);
      if (!isCurrent()) return;
      if (ids.error) { set({ error: ids.error.message, isLoading: false }); return; }
      query = query.in("id", ids.data || []);
    }
    const { data, error } = await query;
    if (!isCurrent()) return;
    if (error) {
      set({ error: error.message, isLoading: false });
      return;
    }
    set({ programs: (data ?? []) as unknown as Program[], isLoading: false });
  },

  fetchProgramById: async (id: string) => {
    const isCurrent = captureCacheContext();
    const { data, error } = await api
      .from("programs")
      .select("*")
      .eq("id", id)
      .single();
    if (!isCurrent()) return null;
    if (error) { set({ error: error.message }); return null; }
    return data as unknown as Program;
  },

  createProgram: async (program) => {
    const isCurrent = captureCacheContext();
    const { data, error } = await api
      .from("programs")
      .insert(program as never)
      .select()
      .single();
    if (!isCurrent()) return null;
    if (error) { set({ error: error.message }); return null; }
    const newProgram = data as unknown as Program;
    set((state) => ({ programs: [newProgram, ...state.programs] }));
    return newProgram;
  },

  updateProgram: async (id, updates) => {
    const isCurrent = captureCacheContext();
    const { data, error } = await api
      .from("programs")
      .update(updates as never)
      .eq("id", id)
      .select()
      .single();
    if (!isCurrent()) return null;
    if (error) { set({ error: error.message }); return null; }
    const updatedProgram = data as unknown as Program;
    set((state) => ({
      programs: state.programs.map((p) => (p.id === id ? updatedProgram : p)),
    }));
    return updatedProgram;
  },

  deleteProgram: async (id) => {
    const isCurrent = captureCacheContext();
    const { error } = await api.from("programs").delete().eq("id", id);
    if (!isCurrent()) return false;
    if (error) { set({ error: error.message }); return false; }
    set((state) => ({
      programs: state.programs.filter((p) => p.id !== id),
    }));
    return true;
  },
}));
