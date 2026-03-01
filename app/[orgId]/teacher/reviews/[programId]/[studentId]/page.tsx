"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
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

type AlgorithmSubmission = {
  id: string;
  content: string;
  status: string;
  feedback: string | null;
  created_at: string;
};

type CodeSubmission = {
  id: string;
  code: string | null;
  language: string | null;
  output: string | null;
  status: string;
  metadata: unknown;
  created_at: string;
};

export default function TeacherReviewDetailsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const programId = params.programId as string;
  const studentId = params.studentId as string;

  const [orgName, setOrgName] = useState("Organization");
  const [programTitle, setProgramTitle] = useState("Program");
  const [question, setQuestion] = useState("No description available.");
  const [studentName, setStudentName] = useState("Student");

  const [algorithmSubmission, setAlgorithmSubmission] =
    useState<AlgorithmSubmission | null>(null);
  const [codeSubmission, setCodeSubmission] = useState<CodeSubmission | null>(
    null,
  );

  const [algorithmFeedback, setAlgorithmFeedback] = useState("");
  const [codeFeedback, setCodeFeedback] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<
    | "algorithm-approve"
    | "algorithm-reject"
    | "code-approve"
    | "code-reject"
    | null
  >(null);

  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isGettingFeedback, setIsGettingFeedback] = useState(false);

  const navItems = [
    { label: "Overview", href: `/${orgId}/teacher` },
    { label: "Classrooms", href: `/${orgId}/teacher/classrooms` },
    { label: "Questions", href: `/${orgId}/teacher/questions` },
    { label: "Review Queue", href: `/${orgId}/teacher/reviews` },
  ];

  async function loadDetails() {
    if (!orgId || !programId || !studentId) return;

    setIsLoading(true);

    const [{ data: orgData }, { data: programData }, { data: profileData }] =
      await Promise.all([
        supabase.from("organizations").select("name").eq("id", orgId).single(),
        supabase
          .from("programs")
          .select("title, description")
          .eq("id", programId)
          .single(),
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", studentId)
          .single(),
      ]);

    if (orgData?.name) setOrgName(orgData.name);
    if (programData?.title) setProgramTitle(programData.title);
    setQuestion(programData?.description || "No description available.");
    if (profileData?.full_name) setStudentName(profileData.full_name);

    const [{ data: algorithmData }, { data: codeData }] = await Promise.all([
      supabase
        .from("algorithm_submissions")
        .select("id, content, status, feedback, created_at")
        .eq("program_id", programId)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("code_submissions")
        .select("id, code, language, output, status, metadata, created_at")
        .eq("program_id", programId)
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    setAlgorithmSubmission(algorithmData || null);
    setCodeSubmission(codeData || null);
    setAlgorithmFeedback(algorithmData?.feedback || "");
    setCodeFeedback(
      (codeData?.metadata as { feedback?: string } | null)?.feedback || "",
    );
    setIsLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadDetails();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [orgId, programId, studentId]);

  const handleGetAIFeedback = async (mode: "algorithm" | "code") => {
    if (mode === "algorithm" && !algorithmSubmission?.content?.trim()) {
      toast.error("No algorithm content to review.");
      return;
    }

    if (mode === "code" && !codeSubmission?.code?.trim()) {
      toast.error("No code content to review.");
      return;
    }

    setIsGettingFeedback(true);
    setAiFeedback(null);

    try {
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          algorithm: algorithmSubmission?.content || "",
          code: codeSubmission?.code || "",
          language: codeSubmission?.language || "javascript",
          description: question,
          question,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to get AI feedback.");
        return;
      }

      setAiFeedback(data.feedback || "No AI feedback received.");
    } catch {
      toast.error("Failed to connect to AI service.");
    } finally {
      setIsGettingFeedback(false);
    }
  };

  const handleAlgorithmReview = async (status: "approved" | "rejected") => {
    if (!algorithmSubmission?.id) {
      toast.error("No algorithm submission found.");
      return;
    }

    setActionLoading(
      status === "approved" ? "algorithm-approve" : "algorithm-reject",
    );

    const { error } = await supabase
      .from("algorithm_submissions")
      .update({
        status,
        feedback: algorithmFeedback || null,
      })
      .eq("id", algorithmSubmission.id);

    setActionLoading(null);

    if (error) {
      toast.error("Failed to update algorithm review.");
      return;
    }

    toast.success(`Algorithm ${status}.`);
    await loadDetails();
  };

  const handleCodeReview = async (status: "approved" | "rejected") => {
    if (!codeSubmission?.id) {
      toast.error("No code submission found.");
      return;
    }

    setActionLoading(status === "approved" ? "code-approve" : "code-reject");

    const { error } = await supabase
      .from("code_submissions")
      .update({
        status,
        metadata: {
          ...((codeSubmission.metadata as Record<string, unknown>) || {}),
          feedback: codeFeedback || null,
        },
      })
      .eq("id", codeSubmission.id);

    setActionLoading(null);

    if (error) {
      toast.error("Failed to update code review.");
      return;
    }

    toast.success(`Code ${status}.`);
    await loadDetails();
  };

  return (
    <AppShell
      title="Review Workspace"
      subtitle={`Review ${studentName}'s submission for ${programTitle} in ${orgName}`}
      navItems={navItems}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={`/${orgId}/teacher/reviews`}>Back to Queue</Link>
        </Button>
      }
    >
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading review details...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{programTitle}</CardTitle>
              <CardDescription>
                Student: {studentName} • Program ID: {programId}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {question}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Algorithm Submission</CardTitle>
                  <StatusBadge
                    status={algorithmSubmission?.status || "not_started"}
                  />
                </div>
                <CardDescription>
                  Submitted{" "}
                  {algorithmSubmission?.created_at
                    ? new Date(algorithmSubmission.created_at).toLocaleString()
                    : "N/A"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                    {algorithmSubmission?.content || "No algorithm submission."}
                  </pre>
                </div>
                <Textarea
                  placeholder="Feedback for algorithm review..."
                  value={algorithmFeedback}
                  onChange={(e) => setAlgorithmFeedback(e.target.value)}
                  className="min-h-[90px]"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="gap-2"
                    disabled={actionLoading !== null}
                    onClick={() => handleAlgorithmReview("approved")}
                  >
                    {actionLoading === "algorithm-approve" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Approve Algorithm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 text-destructive hover:bg-destructive/10"
                    disabled={actionLoading !== null}
                    onClick={() => handleAlgorithmReview("rejected")}
                  >
                    {actionLoading === "algorithm-reject" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    Reject Algorithm
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-2"
                    disabled={isGettingFeedback}
                    onClick={() => handleGetAIFeedback("algorithm")}
                  >
                    <Sparkles className="h-4 w-4" />
                    AI Review Algorithm
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Code Submission</CardTitle>
                  <StatusBadge
                    status={codeSubmission?.status || "not_started"}
                  />
                </div>
                <CardDescription>
                  {codeSubmission?.language?.toUpperCase() || "Language N/A"} •{" "}
                  {codeSubmission?.created_at
                    ? new Date(codeSubmission.created_at).toLocaleString()
                    : "N/A"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed overflow-x-auto">
                    {codeSubmission?.code || "No code submission."}
                  </pre>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Input
                    </p>
                    <pre className="whitespace-pre-wrap text-xs font-mono">
                      {(
                        codeSubmission?.metadata as {
                          custom_input?: string;
                        } | null
                      )?.custom_input || "No input"}
                    </pre>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Output
                    </p>
                    <pre className="whitespace-pre-wrap text-xs font-mono">
                      {codeSubmission?.output || "No output"}
                    </pre>
                  </div>
                </div>

                <Textarea
                  placeholder="Feedback for code review..."
                  value={codeFeedback}
                  onChange={(e) => setCodeFeedback(e.target.value)}
                  className="min-h-[90px]"
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="gap-2"
                    disabled={actionLoading !== null}
                    onClick={() => handleCodeReview("approved")}
                  >
                    {actionLoading === "code-approve" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Approve Code
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 text-destructive hover:bg-destructive/10"
                    disabled={actionLoading !== null}
                    onClick={() => handleCodeReview("rejected")}
                  >
                    {actionLoading === "code-reject" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    Reject Code
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-2"
                    disabled={isGettingFeedback}
                    onClick={() => handleGetAIFeedback("code")}
                  >
                    <Sparkles className="h-4 w-4" />
                    AI Review Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>AI Feedback</CardTitle>
              <CardDescription>
                Use AI as an assistant before finalizing your feedback.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isGettingFeedback ? (
                <p className="text-sm text-muted-foreground">
                  Generating AI review...
                </p>
              ) : (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {aiFeedback || "No AI feedback generated yet."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
