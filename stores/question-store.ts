import { create } from "zustand";

import { supabase } from "@/lib/supabase/client";

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
    fetchPrograms: (classroomId?: string) => Promise<void>;
    fetchProgramById: (id: string) => Promise<Program | null>;
    createProgram: (
        program: Omit<Program, "id" | "created_at" | "updated_at">
    ) => Promise<Program | null>;
};

export const useQuestionStore = create<QuestionState>((set, get) => ({
    programs: [],
    isLoading: false,
    error: null,

    fetchPrograms: async (classroomId?: string) => {
        set({ isLoading: true, error: null });
        let query = supabase.from("programs").select("*").order("created_at", { ascending: false });
        if (classroomId) {
            query = query.eq("classroom_id", classroomId);
        }
        const { data, error } = await query;
        if (error) {
            set({ error: error.message, isLoading: false });
            return;
        }
        set({ programs: (data ?? []) as unknown as Program[], isLoading: false });
    },

    fetchProgramById: async (id: string) => {
        const { data, error } = await supabase
            .from("programs")
            .select("*")
            .eq("id", id)
            .single();
        if (error) return null;
        return data as unknown as Program;
    },

    createProgram: async (program) => {
        const { data, error } = await supabase
            .from("programs")
            .insert(program as never)
            .select()
            .single();
        if (error) return null;
        const newProgram = data as unknown as Program;
        set((state) => ({ programs: [newProgram, ...state.programs] }));
        return newProgram;
    },
}));
