"use client";

import { useEffect, useState } from "react";
import { BookCheck, Check, X, MessageSquare } from "lucide-react";

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
import { useSubmissionStore, type AlgorithmSubmission } from "@/stores/submission-store";

export default function AlgorithmReviewPage() {
    const {
        algorithmSubmissions,
        fetchAlgorithmSubmissions,
        reviewAlgorithm,
        isLoading,
    } = useSubmissionStore();
    const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchAlgorithmSubmissions({ status: "pending" });
    }, [fetchAlgorithmSubmissions]);

    const handleReview = async (
        id: string,
        status: "approved" | "rejected"
    ) => {
        setActionLoading(id);
        await reviewAlgorithm(id, status, feedbackMap[id] || undefined);
        setActionLoading(null);
        // Refresh
        fetchAlgorithmSubmissions({ status: "pending" });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Algorithm Review</h2>
                <p className="text-sm text-muted-foreground">
                    Review and provide feedback on student algorithm submissions
                </p>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader>
                                <div className="h-5 w-1/3 rounded bg-muted" />
                            </CardHeader>
                            <CardContent>
                                <div className="h-20 rounded bg-muted" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : algorithmSubmissions.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-12">
                        <BookCheck className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">
                            No pending algorithm submissions to review.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {algorithmSubmissions.map((sub: AlgorithmSubmission) => (
                        <Card key={sub.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base">
                                            Algorithm Submission
                                        </CardTitle>
                                        <CardDescription>
                                            Submitted{" "}
                                            {new Date(sub.created_at).toLocaleDateString()} at{" "}
                                            {new Date(sub.created_at).toLocaleTimeString()}
                                        </CardDescription>
                                    </div>
                                    <StatusBadge status={sub.status} />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Algorithm content */}
                                <div className="rounded-lg bg-muted/50 p-4">
                                    <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                                        {sub.content}
                                    </pre>
                                </div>

                                {/* Feedback section */}
                                <div className="space-y-3">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-2"
                                        onClick={() =>
                                            setExpandedId(expandedId === sub.id ? null : sub.id)
                                        }
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                        {expandedId === sub.id ? "Hide Feedback" : "Add Feedback"}
                                    </Button>

                                    {expandedId === sub.id && (
                                        <Textarea
                                            placeholder="Write your feedback here..."
                                            value={feedbackMap[sub.id] ?? ""}
                                            onChange={(e) =>
                                                setFeedbackMap((prev) => ({
                                                    ...prev,
                                                    [sub.id]: e.target.value,
                                                }))
                                            }
                                            className="min-h-[80px]"
                                        />
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="gap-2"
                                        disabled={actionLoading === sub.id}
                                        onClick={() => handleReview(sub.id, "approved")}
                                    >
                                        <Check className="h-4 w-4" />
                                        Approve
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
