"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Editor from "@monaco-editor/react";
import {
  Check,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  Sparkles,
  X,
} from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/status-badge";
import { supabase } from "@/lib/supabase/client";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

type AlgorithmSubmission = {
  id: string;
  content: string;
  status: string;
  feedback: string | null;
  created_at: string;
};

const LANGUAGE_IDS: Record<string, number> = {
  javascript: 63,
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,
};

// Some submissions store "c++" (older editor); normalize to Monaco/Judge0 ids.
const normalizeLanguage = (language: string | null | undefined) =>
  language === "c++" ? "cpp" : language || "plaintext";

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
  const [programDescription, setProgramDescription] = useState<string | null>(
    null,
  );
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
  const [pendingAiMode, setPendingAiMode] = useState<
    "algorithm" | "code" | null
  >(null);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isCodeFullscreen, setIsCodeFullscreen] = useState(false);

  const [testInput, setTestInput] = useState("");
  const [testOutput, setTestOutput] = useState("No output");
  const [isExecuting, setIsExecuting] = useState(false);

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
    setProgramDescription(programData?.description || null);
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
    setTestInput(
      (codeData?.metadata as { custom_input?: string } | null)?.custom_input ||
        "",
    );
    setTestOutput(codeData?.output || "No output");
    setIsLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadDetails();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [orgId, programId, studentId]);

  const handleGetAIFeedback = async (mode: "algorithm" | "code") => {
    if (!programDescription?.trim()) {
      setAiFeedback(
        "Question description is missing. Add a description to this program before requesting AI review.",
      );
      setIsAiDrawerOpen(true);
      return;
    }

    if (mode === "algorithm" && !algorithmSubmission?.content?.trim()) {
      setAiFeedback("No algorithm content to review.");
      setIsAiDrawerOpen(true);
      return;
    }

    if (mode === "code" && !codeSubmission?.code?.trim()) {
      setAiFeedback("No code content to review.");
      setIsAiDrawerOpen(true);
      return;
    }

    setAiFeedback(null);
    setIsAiDrawerOpen(true);
    setPendingAiMode(mode);

    try {
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          algorithm: algorithmSubmission?.content || "",
          code: codeSubmission?.code || "",
          language: codeSubmission?.language || "javascript",
          description: programDescription,
          question: programDescription,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setAiFeedback(data?.error || "Failed to get AI feedback.");
        return;
      }

      setAiFeedback(data?.feedback || "No AI feedback received.");
    } catch {
      setAiFeedback("Failed to connect to AI service.");
    } finally {
      setPendingAiMode(null);
    }
  };

  const handleRunCode = async () => {
    if (!codeSubmission?.code?.trim()) {
      toast.error("No code submission to run.");
      return;
    }

    setIsExecuting(true);
    setTestOutput("Running code...");
    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: codeSubmission.code,
          language_id: LANGUAGE_IDS[normalizeLanguage(codeSubmission.language)] || 63,
          stdin: testInput,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setTestOutput(
          `Error: ${data.error || "Execution failed"}\n${data.details || ""}`,
        );
      } else {
        if (data.compile_output) {
          setTestOutput(`Compile Error:\n${data.compile_output}`);
        } else if (data.stderr) {
          setTestOutput(`Error:\n${data.stderr}`);
        } else {
          setTestOutput(
            data.stdout || "Code executed successfully with no output.",
          );
        }
      }
    } catch {
      setTestOutput("Failed to connect to execution server. Try again later.");
    } finally {
      setIsExecuting(false);
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
                    disabled={pendingAiMode !== null}
                    onClick={() => handleGetAIFeedback("algorithm")}
                  >
                    {pendingAiMode === "algorithm" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    AI Review Algorithm
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Code Submission</CardTitle>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      status={codeSubmission?.status || "not_started"}
                    />
                    {codeSubmission?.code?.trim() && (
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => setIsCodeFullscreen(true)}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <CardDescription>
                  {codeSubmission?.language?.toUpperCase() || "Language N/A"} •{" "}
                  {codeSubmission?.created_at
                    ? new Date(codeSubmission.created_at).toLocaleString()
                    : "N/A"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {codeSubmission?.code?.trim() ? (
                  <div className="rounded-lg overflow-hidden border bg-zinc-950 h-[320px]">
                    <Editor
                      height="100%"
                      language={normalizeLanguage(codeSubmission.language)}
                      value={codeSubmission.code}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        padding: { top: 16, bottom: 16 },
                      }}
                      loading={
                        <div className="flex bg-zinc-950 items-center justify-center p-8 text-sm text-zinc-500 h-full w-full">
                          Loading editor...
                        </div>
                      }
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed overflow-x-auto">
                      No code submission.
                    </pre>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">
                        Input (editable, test runs are not saved)
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 px-2 text-xs"
                        disabled={isExecuting || !codeSubmission?.code?.trim()}
                        onClick={handleRunCode}
                      >
                        {isExecuting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                        Run
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Provide input values for execution..."
                      className="min-h-[90px] font-mono text-xs"
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                    />
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Output
                    </p>
                    <pre className="whitespace-pre-wrap text-xs font-mono">
                      {testOutput}
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
                    disabled={pendingAiMode !== null}
                    onClick={() => handleGetAIFeedback("code")}
                  >
                    {pendingAiMode === "code" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    AI Review Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      {isCodeFullscreen && (
        <div className="fixed inset-0 z-50 bg-background p-4">
          <div className="flex h-full flex-col rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold">Code Submission</h3>
                <span className="text-sm text-muted-foreground">
                  {codeSubmission?.language?.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleRunCode}
                  disabled={isExecuting}
                  className="h-8 gap-2 bg-green-600 text-white hover:bg-green-700"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    "Run Code"
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsCodeFullscreen(false)}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <ResizablePanelGroup orientation="horizontal">
                <ResizablePanel defaultSize={70} minSize={30}>
                  <div className="h-full bg-zinc-950">
                    <Editor
                      height="100%"
                      language={normalizeLanguage(codeSubmission?.language)}
                      value={codeSubmission?.code || ""}
                      theme="vs-dark"
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        padding: { top: 16, bottom: 16 },
                      }}
                      loading={
                        <div className="flex bg-zinc-950 items-center justify-center p-8 text-sm text-zinc-500 h-full w-full">
                          Loading editor...
                        </div>
                      }
                    />
                  </div>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={30} minSize={15}>
                  <div className="flex h-full flex-col bg-background">
                    <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Input (stdin)</h4>
                        <Textarea
                          placeholder="Input values... (test runs are not saved)"
                          className="min-h-[100px] resize-y font-mono"
                          value={testInput}
                          onChange={(e) => setTestInput(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 flex-1 flex flex-col">
                        <h4 className="text-sm font-medium">Output</h4>
                        <pre className="flex-1 whitespace-pre-wrap rounded-lg border bg-zinc-950 p-4 font-mono text-sm text-zinc-100 overflow-auto">
                          {testOutput}
                        </pre>
                      </div>
                    </div>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </div>
        </div>
      )}

      <Sheet open={isAiDrawerOpen} onOpenChange={setIsAiDrawerOpen}>
        <SheetContent side="right" className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>AI Review</SheetTitle>
            <SheetDescription>
              Suggestions for this algorithm and code.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 h-[calc(100%-5rem)] overflow-y-auto rounded-lg border p-4">
            {pendingAiMode !== null ? (
              <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing with Gemini...
              </div>
            ) : aiFeedback ? (
              <div className="whitespace-pre-wrap text-sm">{aiFeedback}</div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <Sparkles className="h-8 w-8" />
                <p>Run AI review from the algorithm or code section.</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
