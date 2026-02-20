"use client";

import { useEffect, useState } from "react";
import { Code2, Check, X, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { supabase } from "@/lib/supabase/client";

type CodeSubmissionWithDetails = {
    id: string;
    program_id: string;
    student_id: string;
    code: string | null;
    language: string | null;
    output: string | null;
    status: string;
    created_at: string;
    algorithm_content?: string;
};

export default function CodeReviewPage() {
    const [submissions, setSubmissions] = useState<CodeSubmissionWithDetails[]>(
        []
    );
    const [isLoading, setIsLoading] = useState(true);
    const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Record<string, string>>({});

    useEffect(() => {
        loadSubmissions();
    }, []);

    async function loadSubmissions() {
        setIsLoading(true);
        const { data: codeSubs } = await supabase
            .from("code_submissions")
            .select("*")
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        if (codeSubs) {
            // Load corresponding algorithm submissions
            const withAlgorithms: CodeSubmissionWithDetails[] = await Promise.all(
                codeSubs.map(async (cs) => {
                    const { data: algo } = await supabase
                        .from("algorithm_submissions")
                        .select("content")
                        .eq("program_id", cs.program_id)
                        .eq("student_id", cs.student_id)
                        .eq("status", "approved")
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    return {
                        ...cs,
                        algorithm_content: algo?.content ?? undefined,
                    };
                })
            );
            setSubmissions(withAlgorithms);
        }
        setIsLoading(false);
    }

    const handleReview = async (id: string, status: "approved" | "rejected") => {
        setActionLoading(id);
        const updateData: Record<string, unknown> = { status };
        if (feedbackMap[id]) {
            updateData.metadata = { feedback: feedbackMap[id] };
        }
        await supabase.from("code_submissions").update(updateData).eq("id", id);
        setActionLoading(null);
        loadSubmissions();
    };

    const getTab = (id: string) => activeTab[id] ?? "code";

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Code Review</h2>
                <p className="text-sm text-muted-foreground">
                    Review student code submissions along with their algorithms and output
                </p>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader>
                                <div className="h-5 w-1/3 rounded bg-muted" />
                            </CardHeader>
                            <CardContent>
                                <div className="h-40 rounded bg-muted" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : submissions.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-12">
                        <Code2 className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">
                            No pending code submissions to review.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {submissions.map((sub) => (
                        <Card key={sub.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base">Code Submission</CardTitle>
                                        <CardDescription>
                                            {sub.language?.toUpperCase()} •{" "}
                                            {new Date(sub.created_at).toLocaleDateString()}
                                        </CardDescription>
                                    </div>
                                    <StatusBadge status={sub.status} />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Tab bar */}
                                <div className="flex gap-1 rounded-lg bg-muted p-1">
                                    {["code", "algorithm", "output"].map((tab) => (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() =>
                                                setActiveTab((prev) => ({ ...prev, [sub.id]: tab }))
                                            }
                                            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-all ${getTab(sub.id) === tab
                                                    ? "bg-background shadow-sm text-foreground"
                                                    : "text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab content */}
                                <div className="rounded-lg bg-muted/50 p-4 min-h-[150px]">
                                    {getTab(sub.id) === "code" && (
                                        <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed overflow-x-auto">
                                            {sub.code ?? "No code provided"}
                                        </pre>
                                    )}
                                    {getTab(sub.id) === "algorithm" && (
                                        <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                                            {sub.algorithm_content ?? "No algorithm found"}
                                        </pre>
                                    )}
                                    {getTab(sub.id) === "output" && (
                                        <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                                            {sub.output ?? "No output available"}
                                        </pre>
                                    )}
                                </div>

                                {/* AI Suggestions */}
                                <Card className="border-dashed">
                                    <CardContent className="flex items-start gap-3 p-4">
                                        <Sparkles className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium">AI Suggestions</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                The code appears to follow the algorithm structure. Consider checking
                                                edge cases for empty input and verifying time complexity
                                                matches constraints.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Feedback */}
                                <Textarea
                                    placeholder="Add your feedback..."
                                    value={feedbackMap[sub.id] ?? ""}
                                    onChange={(e) =>
                                        setFeedbackMap((prev) => ({
                                            ...prev,
                                            [sub.id]: e.target.value,
                                        }))
                                    }
                                    className="min-h-[60px]"
                                />

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="gap-2"
                                        disabled={actionLoading === sub.id}
                                        onClick={() => handleReview(sub.id, "approved")}
                                    >
                                        <Check className="h-4 w-4" />
                                        Approve Final
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-2 text-destructive hover:bg-destructive/10"
                                        disabled={actionLoading === sub.id}
                                        onClick={() => handleReview(sub.id, "rejected")}
                                    >
                                        <X className="h-4 w-4" />
                                        Reject
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
