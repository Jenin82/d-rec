"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, PenLine, Code2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { ProgressTracker } from "@/components/progress-tracker";
import { useQuestionStore, type Program } from "@/stores/question-store";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase/client";

export default function QuestionDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const { fetchProgramById } = useQuestionStore();
    const user = useAuthStore((s) => s.user);
    const [program, setProgram] = useState<Program | null>(null);
    const [status, setStatus] = useState("not_started");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        setIsLoading(true);
        const p = await fetchProgramById(id);
        setProgram(p);

        if (p && user) {
            // Check code submission
            const { data: codeSub } = await supabase
                .from("code_submissions")
                .select("status")
                .eq("program_id", id)
                .eq("student_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (codeSub?.status === "approved") {
                setStatus("final_approved");
            } else if (codeSub?.status === "pending") {
                setStatus("code_submitted");
            } else {
                // Check algorithm submission
                const { data: algoSub } = await supabase
                    .from("algorithm_submissions")
                    .select("status")
                    .eq("program_id", id)
                    .eq("student_id", user.id)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (algoSub?.status === "approved") setStatus("coding_stage");
                else if (algoSub?.status === "pending") setStatus("algorithm_pending");
                else if (algoSub?.status === "rejected") setStatus("algorithm_rejected");
                else setStatus("not_started");
            }
        }
        setIsLoading(false);
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 rounded bg-muted animate-pulse" />
                <Card className="animate-pulse">
                    <CardContent className="p-6">
                        <div className="h-40 rounded bg-muted" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!program) {
        return (
            <div className="flex flex-col items-center gap-4 py-12">
                <p className="text-muted-foreground">Question not found.</p>
                <Button asChild variant="outline">
                    <Link href="/student">Back to Dashboard</Link>
                </Button>
            </div>
        );
    }

    const metadata = program.metadata as Record<string, unknown> | undefined;
    const difficulty = (metadata?.difficulty as string) ?? "medium";
    const inputFormat = metadata?.input_format as string | undefined;
    const outputFormat = metadata?.output_format as string | undefined;
    const constraints = metadata?.constraints as string | undefined;
    const sampleInput = metadata?.sample_input as string | undefined;
    const sampleOutput = metadata?.sample_output as string | undefined;

    const difficultyColor: Record<string, string> = {
        easy: "bg-emerald-100 text-emerald-800",
        medium: "bg-amber-100 text-amber-800",
        hard: "bg-red-100 text-red-800",
    };

    return (
        <div className="space-y-6">
            {/* Back link */}
            <div className="flex items-center gap-3">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/student">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold tracking-tight">
                            {program.title}
                        </h2>
                        <Badge
                            variant="secondary"
                            className={`capitalize border-0 ${difficultyColor[difficulty] ?? ""}`}
                        >
                            {difficulty}
                        </Badge>
                    </div>
                </div>
                <StatusBadge status={status} />
            </div>

            {/* Progress */}
            {status !== "not_started" && (
                <Card>
                    <CardContent className="p-4">
                        <ProgressTracker status={status} />
                    </CardContent>
                </Card>
            )}

            {/* Description */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Problem Description</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {program.description ?? "No description provided."}
                    </p>
                </CardContent>
            </Card>

            {/* I/O Format */}
            {(inputFormat || outputFormat) && (
                <div className="grid gap-4 sm:grid-cols-2">
                    {inputFormat && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Input Format</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm whitespace-pre-wrap">{inputFormat}</p>
                            </CardContent>
                        </Card>
                    )}
                    {outputFormat && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Output Format</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm whitespace-pre-wrap">{outputFormat}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Constraints */}
            {constraints && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Constraints</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-mono whitespace-pre-wrap">
                            {constraints}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Sample I/O */}
            {(sampleInput || sampleOutput) && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Sample Test Case</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {sampleInput && (
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        Input
                                    </p>
                                    <div className="rounded-lg bg-muted p-3 font-mono text-sm">
                                        {sampleInput}
                                    </div>
                                </div>
                            )}
                            {sampleOutput && (
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        Output
                                    </p>
                                    <div className="rounded-lg bg-muted p-3 font-mono text-sm">
                                        {sampleOutput}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
                {(status === "not_started" || status === "algorithm_rejected") && (
                    <Button asChild className="gap-2">
                        <Link href={`/student/questions/${id}/algorithm`}>
                            <PenLine className="h-4 w-4" />
                            Write Algorithm
                        </Link>
                    </Button>
                )}
                {status === "coding_stage" && (
                    <Button asChild className="gap-2">
                        <Link href={`/student/questions/${id}/code`}>
                            <Code2 className="h-4 w-4" />
                            Open Coding Workspace
                        </Link>
                    </Button>
                )}
                {status === "final_approved" && (
                    <Button asChild variant="outline" className="gap-2">
                        <Link href={`/student/records/${id}`}>View Record</Link>
                    </Button>
                )}
            </div>
        </div>
    );
}
