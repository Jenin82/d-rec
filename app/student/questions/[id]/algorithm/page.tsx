"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useQuestionStore, type Program } from "@/stores/question-store";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase/client";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
    ssr: false,
    loading: () => (
        <div className="flex h-[400px] items-center justify-center rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Loading editor...</p>
        </div>
    ),
});

export default function AlgorithmWritingPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { fetchProgramById } = useQuestionStore();
    const user = useAuthStore((s) => s.user);
    const [program, setProgram] = useState<Program | null>(null);
    const [content, setContent] = useState(
        `Algorithm: [Title]\n\nStep 1: Start\nStep 2: [Describe your approach]\nStep 3: [Process input]\nStep 4: [Compute result]\nStep 5: [Output result]\nStep 6: Stop`
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        const p = await fetchProgramById(id);
        setProgram(p);

        // Load existing submission if any
        if (p && user) {
            const { data: existing } = await supabase
                .from("algorithm_submissions")
                .select("content")
                .eq("program_id", id)
                .eq("student_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (existing?.content) {
                setContent(existing.content);
            }
        }
        setIsLoading(false);
    }

    const handleSubmit = async () => {
        if (!user || !content.trim()) return;
        setIsSubmitting(true);
        setError(null);

        const { error: insertError } = await supabase
            .from("algorithm_submissions")
            .insert({
                program_id: id,
                student_id: user.id,
                content: content.trim(),
                status: "pending",
            });

        if (insertError) {
            setError(insertError.message);
            setIsSubmitting(false);
            return;
        }

        router.push(`/student/questions/${id}`);
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 rounded bg-muted animate-pulse" />
                <div className="h-[400px] rounded bg-muted animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Button asChild variant="ghost" size="sm">
                    <Link href={`/student/questions/${id}`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        Write Algorithm
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {program?.title ?? "Loading..."}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Algorithm Editor</CardTitle>
                    <CardDescription>
                        Write your algorithm in structured pseudocode format. Use clear step
                        numbering and descriptive language.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border overflow-hidden">
                        <MonacoEditor
                            height="400px"
                            language="plaintext"
                            theme="vs-light"
                            value={content}
                            onChange={(value) => setContent(value ?? "")}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                lineHeight: 22,
                                wordWrap: "on",
                                padding: { top: 16 },
                                scrollBeyondLastLine: false,
                            }}
                        />
                    </div>
                </CardContent>
            </Card>

            {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {error}
                </div>
            )}

            <div className="flex items-center gap-3">
                <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !content.trim()}
                    className="gap-2"
                >
                    <Send className="h-4 w-4" />
                    {isSubmitting ? "Submitting..." : "Submit Algorithm for Review"}
                </Button>
                <p className="text-xs text-muted-foreground">
                    Your teacher will review and provide feedback.
                </p>
            </div>
        </div>
    );
}
