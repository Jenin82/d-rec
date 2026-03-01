"use client";

import { useState, useEffect } from "react";
import { Save, CheckCircle2, Bot, Info, ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase/client";

export default function StudentAlgorithmPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const programId = params.id as string;
  const user = useAuthStore((s) => s.user);

  const [algorithm, setAlgorithm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questionTitle, setQuestionTitle] = useState("Algorithm");
  const [questionDescription, setQuestionDescription] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (user && programId) {
      loadSubmission();
    }
  }, [user, programId]);

  async function loadSubmission() {
    setIsLoading(true);
    const { data: programData } = await supabase
      .from("programs")
      .select("title, description")
      .eq("id", programId)
      .maybeSingle();

    if (programData) {
      setQuestionTitle(programData.title || "Algorithm");
      setQuestionDescription(programData.description || null);
    }

    const { data, error } = await supabase
      .from("algorithm_submissions")
      .select("content, status")
      .eq("program_id", programId)
      .eq("student_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setAlgorithm(data.content);
      setStatus(data.status);
    }
    setIsLoading(false);
  }

  const handleSaveDraft = async () => {
    if (!algorithm.trim() || !user) return;
    setIsSaving(true);

    const { error } = await supabase.from("algorithm_submissions").upsert(
      {
        program_id: programId,
        student_id: user.id,
        content: algorithm,
        status: "draft",
      },
      { onConflict: "program_id, student_id" },
    );

    if (!error) {
      setStatus("draft");
    }
    setIsSaving(false);
  };

  const handleSubmit = async () => {
    if (!algorithm.trim() || !user) return;
    setIsSubmitting(true);

    // In a real app, this would change status to pending_review for teacher
    // For demo purposes, we'll automatically approve it or set to pending
    const newStatus = "approved"; // Auto-approve for demo

    const { error } = await supabase.from("algorithm_submissions").upsert(
      {
        program_id: programId,
        student_id: user.id,
        content: algorithm,
        status: newStatus,
      },
      { onConflict: "program_id, student_id" },
    );

    if (!error) {
      setStatus(newStatus);
      // Auto-redirect to code step if approved
      if (newStatus === "approved") {
        setTimeout(() => {
          router.push(`/${orgId}/student/questions/${programId}/code`);
        }, 1500);
      }
    }
    setIsSubmitting(false);
  };

  const handleGetAiHelp = async () => {
    if (!algorithm.trim()) {
      setAiSuggestion(
        "Please write some algorithm steps first before asking for suggestions.",
      );
      return;
    }

    const questionText = (questionDescription || "").trim();
    if (!questionText) {
      setAiSuggestion(
        "Question description is missing. Ask your teacher to add it before requesting AI review.",
      );
      return;
    }

    setIsAiLoading(true);
    try {
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "algorithm",
          algorithm,
          code: "",
          language: "plain text",
          description: questionText,
          question: questionText,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setAiSuggestion(data.error || "Failed to get AI feedback.");
        return;
      }

      setAiSuggestion(data.feedback || "No feedback received.");
    } catch {
      setAiSuggestion(
        "Failed to fetch AI feedback. Ensure your API keys are configured and valid.",
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  const isApproved = status === "approved";
  const isPending = status === "pending_review";
  const isReadOnly = isApproved || isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="h-8 w-8 shrink-0"
          >
            <Link href={`/${orgId}/student/questions/${programId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Algorithm</h2>
            <p className="text-muted-foreground">
              {isApproved
                ? "Your algorithm was approved!"
                : isPending
                  ? "Waiting for teacher review."
                  : "Write your algorithm steps for teacher approval."}
            </p>
          </div>
        </div>
        {!isReadOnly && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleSaveDraft}
              disabled={isSaving || isSubmitting || !algorithm.trim()}
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={handleSubmit}
              disabled={isSubmitting || isSaving || !algorithm.trim()}
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? "Submitting..." : "Submit for Approval"}
            </Button>
          </div>
        )}
        {isApproved && (
          <Button size="sm" className="gap-2" asChild>
            <Link href={`/${orgId}/student/questions/${programId}/code`}>
              Proceed to Code Step <ArrowLeft className="h-4 w-4 rotate-180" />
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_350px]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{questionTitle}</CardTitle>
              <CardDescription>
                Problem statement for this assignment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {questionDescription ||
                  "No question description available for this assignment."}
              </p>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Algorithm Steps</CardTitle>
              <CardDescription>
                Write clear, step-by-step instructions. You can use markdown for
                formatting.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Step 1: Start...&#10;Step 2: Initialize variables...&#10;Step 3: Loop..."
                className="min-h-[500px] resize-y font-mono"
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                disabled={isReadOnly}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-5 w-5 text-primary" />
                AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground flex gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  Stuck or want to improve your logic? The AI can review your
                  current steps and offer hints (it won&apos;t write the answer
                  for you).
                </p>
              </div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleGetAiHelp}
                disabled={isAiLoading || isReadOnly || !algorithm.trim()}
              >
                {isAiLoading ? "Analyzing..." : "Review My Algorithm"}
              </Button>

              {aiSuggestion && (
                <div className="mt-4 rounded-lg border bg-card p-4 text-sm">
                  <h4 className="font-semibold mb-2">AI Feedback:</h4>
                  <div className="whitespace-pre-wrap text-muted-foreground">
                    {aiSuggestion}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
