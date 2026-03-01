"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Code2, FileText, CheckCircle2 } from "lucide-react";
import { useParams } from "next/navigation";

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
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";

type ProgramDetails = {
  title: string;
  description: string | null;
};

function normalizeStatus(status: string | null) {
  if (!status) return "not_started";
  if (status === "pending_review" || status === "pending") return "pending";
  return status;
}

export default function QuestionDetailPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const programId = params.id as string;
  const user = useAuthStore((s) => s.user);

  const [program, setProgram] = useState<ProgramDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [questionStatus, setQuestionStatus] = useState({
    algorithm: "not_started",
    code: "not_started",
  });

  useEffect(() => {
    async function loadQuestion() {
      if (!programId) return;
      setIsLoading(true);

      const { data: programData } = await supabase
        .from("programs")
        .select("title, description")
        .eq("id", programId)
        .maybeSingle();

      if (programData) {
        setProgram(programData);
      }

      if (user?.id) {
        const [{ data: algorithmSubmission }, { data: codeSubmission }] =
          await Promise.all([
            supabase
              .from("algorithm_submissions")
              .select("status")
              .eq("program_id", programId)
              .eq("student_id", user.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from("code_submissions")
              .select("status")
              .eq("program_id", programId)
              .eq("student_id", user.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

        setQuestionStatus({
          algorithm: normalizeStatus(algorithmSubmission?.status ?? null),
          code: normalizeStatus(codeSubmission?.status ?? null),
        });
      }

      setIsLoading(false);
    }

    loadQuestion();
  }, [programId, user?.id]);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="h-8 w-8">
          <Link href={`/${orgId}/student/questions`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {program?.title || "Programming Question"}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">Assignment</Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Track your progress step-by-step
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Problem Description</CardTitle>
            </CardHeader>
            <CardContent className="prose dark:prose-invert max-w-none text-sm">
              {isLoading ? (
                <p>Loading question...</p>
              ) : (
                <p className="whitespace-pre-wrap">
                  {program?.description ||
                    "No question description available for this assignment."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
              <CardDescription>Complete the steps in order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Algorithm */}
              <div className="relative pl-6 pb-6 border-l-2 border-primary/20 last:pb-0 last:border-transparent">
                <div
                  className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 bg-background ${
                    questionStatus.algorithm === "approved"
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-primary"
                  }`}
                >
                  {questionStatus.algorithm === "approved" && (
                    <CheckCircle2 className="h-full w-full text-white" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">1. Algorithm</h4>
                    <StatusBadge status={questionStatus.algorithm} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Write and submit your logic for approval.
                  </p>
                  <Button
                    asChild
                    size="sm"
                    variant={
                      questionStatus.algorithm === "approved"
                        ? "outline"
                        : "default"
                    }
                    className="w-full mt-2 gap-2"
                  >
                    <Link
                      href={`/${orgId}/student/questions/${programId}/algorithm`}
                    >
                      <FileText className="h-4 w-4" />
                      {questionStatus.algorithm === "approved"
                        ? "View Algorithm"
                        : "Write Algorithm"}
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Step 2: Code */}
              <div className="relative pl-6 border-l-2 border-transparent">
                <div
                  className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 bg-background ${
                    questionStatus.code === "approved"
                      ? "border-emerald-500 bg-emerald-500"
                      : questionStatus.algorithm === "approved"
                        ? "border-primary"
                        : "border-muted"
                  }`}
                >
                  {questionStatus.code === "approved" && (
                    <CheckCircle2 className="h-full w-full text-white" />
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`font-semibold text-sm ${questionStatus.algorithm !== "approved" ? "text-muted-foreground" : ""}`}
                    >
                      2. Code Implementation
                    </h4>
                    {questionStatus.algorithm === "approved" && (
                      <StatusBadge status={questionStatus.code} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Write, test, and submit your code.
                  </p>
                  <Button
                    asChild
                    size="sm"
                    variant={
                      questionStatus.code === "approved" ? "outline" : "default"
                    }
                    disabled={questionStatus.algorithm !== "approved"}
                    className="w-full mt-2 gap-2"
                  >
                    <Link
                      href={`/${orgId}/student/questions/${programId}/code`}
                    >
                      <Code2 className="h-4 w-4" />
                      {questionStatus.code === "approved"
                        ? "View Code"
                        : "Open Editor"}
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
