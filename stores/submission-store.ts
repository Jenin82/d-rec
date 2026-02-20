import { create } from "zustand";

import { supabase } from "@/lib/supabase/client";

export type AlgorithmSubmission = {
    id: string;
    program_id: string;
    student_id: string;
    content: string;
    status: string;
    feedback: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
};

export type CodeSubmission = {
    id: string;
    program_id: string;
    student_id: string;
    code: string | null;
    language: string | null;
    output: string | null;
    status: string;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
};

type SubmissionState = {
    algorithmSubmissions: AlgorithmSubmission[];
    codeSubmissions: CodeSubmission[];
    isLoading: boolean;
    error: string | null;

    // Algorithm submissions
    fetchAlgorithmSubmissions: (filters?: {
        programId?: string;
        studentId?: string;
        status?: string;
    }) => Promise<void>;
    submitAlgorithm: (submission: {
        program_id: string;
        student_id: string;
        content: string;
    }) => Promise<AlgorithmSubmission | null>;
    reviewAlgorithm: (
        id: string,
        status: "approved" | "rejected",
        feedback?: string
    ) => Promise<boolean>;

    // Code submissions
    fetchCodeSubmissions: (filters?: {
        programId?: string;
        studentId?: string;
        status?: string;
    }) => Promise<void>;
    submitCode: (submission: {
        program_id: string;
        student_id: string;
        code: string;
        language: string;
        output: string;
    }) => Promise<CodeSubmission | null>;
    reviewCode: (
        id: string,
        status: "approved" | "rejected",
        feedback?: string
    ) => Promise<boolean>;

    // Combined student status for a program
    getStudentProgramStatus: (
        programId: string,
        studentId: string
    ) => Promise<string>;
};

export const useSubmissionStore = create<SubmissionState>((set) => ({
    algorithmSubmissions: [],
    codeSubmissions: [],
    isLoading: false,
    error: null,

    fetchAlgorithmSubmissions: async (filters) => {
        set({ isLoading: true, error: null });
        let query = supabase
            .from("algorithm_submissions")
            .select("*")
            .order("created_at", { ascending: false });
        if (filters?.programId) query = query.eq("program_id", filters.programId);
        if (filters?.studentId) query = query.eq("student_id", filters.studentId);
        if (filters?.status) query = query.eq("status", filters.status);
        const { data, error } = await query;
        if (error) {
            set({ error: error.message, isLoading: false });
            return;
        }
        set({
            algorithmSubmissions: (data as AlgorithmSubmission[]) ?? [],
            isLoading: false,
        });
    },

    submitAlgorithm: async (submission) => {
        const { data, error } = await supabase
            .from("algorithm_submissions")
            .insert({ ...submission, status: "pending" })
            .select()
            .single();
        if (error) return null;
        const newSubmission = data as AlgorithmSubmission;
        set((state) => ({
            algorithmSubmissions: [newSubmission, ...state.algorithmSubmissions],
        }));
        return newSubmission;
    },

    reviewAlgorithm: async (id, status, feedback) => {
        const { error } = await supabase
            .from("algorithm_submissions")
            .update({ status, feedback: feedback ?? null })
            .eq("id", id);
        if (error) return false;
        set((state) => ({
            algorithmSubmissions: state.algorithmSubmissions.map((s) =>
                s.id === id ? { ...s, status, feedback: feedback ?? null } : s
            ),
        }));
        return true;
    },

    fetchCodeSubmissions: async (filters) => {
        set({ isLoading: true, error: null });
        let query = supabase
            .from("code_submissions")
            .select("*")
            .order("created_at", { ascending: false });
        if (filters?.programId) query = query.eq("program_id", filters.programId);
        if (filters?.studentId) query = query.eq("student_id", filters.studentId);
        if (filters?.status) query = query.eq("status", filters.status);
        const { data, error } = await query;
        if (error) {
            set({ error: error.message, isLoading: false });
            return;
        }
        set({
            codeSubmissions: (data as CodeSubmission[]) ?? [],
            isLoading: false,
        });
    },

    submitCode: async (submission) => {
        const { data, error } = await supabase
            .from("code_submissions")
            .insert({ ...submission, status: "pending" })
            .select()
            .single();
        if (error) return null;
        const newSubmission = data as CodeSubmission;
        set((state) => ({
            codeSubmissions: [newSubmission, ...state.codeSubmissions],
        }));
        return newSubmission;
    },

    reviewCode: async (id, status, feedback) => {
        const updateData: Record<string, unknown> = { status };
        if (feedback) updateData.metadata = { feedback };
        const { error } = await supabase
            .from("code_submissions")
            .update(updateData)
            .eq("id", id);
        if (error) return false;
        set((state) => ({
            codeSubmissions: state.codeSubmissions.map((s) =>
                s.id === id ? { ...s, status } : s
            ),
        }));
        return true;
    },

    getStudentProgramStatus: async (programId, studentId) => {
        const { data: codeSub } = await supabase
            .from("code_submissions")
            .select("status")
            .eq("program_id", programId)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (codeSub?.status === "approved") return "final_approved";
        if (codeSub?.status === "pending") return "code_submitted";

        const { data: algoSub } = await supabase
            .from("algorithm_submissions")
            .select("status")
            .eq("program_id", programId)
            .eq("student_id", studentId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (algoSub?.status === "approved") return "coding_stage";
        if (algoSub?.status === "pending") return "algorithm_pending";
        if (algoSub?.status === "rejected") return "algorithm_rejected";

        return "not_started";
    },
}));
