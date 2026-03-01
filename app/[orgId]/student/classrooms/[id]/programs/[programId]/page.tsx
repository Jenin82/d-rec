"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase/client";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const LANGUAGES = [
  { id: 63, name: "JavaScript", value: "javascript" },
  { id: 71, name: "Python", value: "python" },
  { id: 62, name: "Java", value: "java" },
  { id: 54, name: "C++", value: "cpp" },
];

export default function StudentProgramPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const programId = params.programId as string;
  const classroomId = params.id as string;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const navItems = [
    { label: "Dashboard", href: `/${orgId}/student` },
    { label: "Classrooms", href: `/${orgId}/student/classrooms` },
    {
      label: "Programs",
      href: `/${orgId}/student/classrooms/${classroomId}/programs`,
    },
    { label: "Record Book", href: `/${orgId}/student/records` },
  ];

  const [programDetails, setProgramDetails] = useState<{
    title: string;
    description: string | null;
    status: string | null;
  } | null>(null);
  const [algorithm, setAlgorithm] = useState("");
  const [code, setCode] = useState("// Write your code here");
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [customInput, setCustomInput] = useState("");
  const [output, setOutput] = useState("Awaiting execution run.");
  const [isExecuting, setIsExecuting] = useState(false);

  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isGettingFeedback, setIsGettingFeedback] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [algorithmStatus, setAlgorithmStatus] = useState<string | null>(null);
  const [codeStatus, setCodeStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadProgram() {
      if (!programId) return;

      const { data: programData, error } = await supabase
        .from("programs")
        .select("title, description, status")
        .eq("id", programId)
        .single();

      if (!error && programData) {
        setProgramDetails(programData);
      }

      if (!user?.id) return;

      const [{ data: algorithmSubmission }, { data: codeSubmission }] =
        await Promise.all([
          supabase
            .from("algorithm_submissions")
            .select("content, status")
            .eq("program_id", programId)
            .eq("student_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("code_submissions")
            .select("id, code, language, output, status, metadata")
            .eq("program_id", programId)
            .eq("student_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

      if (algorithmSubmission) {
        setAlgorithm(algorithmSubmission.content || "");
        setAlgorithmStatus(algorithmSubmission.status || null);
      }

      if (codeSubmission) {
        setCode(codeSubmission.code || "");
        setCodeStatus(codeSubmission.status || null);
        setOutput(codeSubmission.output || "Awaiting execution run.");
        setCustomInput(
          (codeSubmission.metadata as { custom_input?: string } | null)
            ?.custom_input || "",
        );
        const matchedLanguage = LANGUAGES.find(
          (lang) => lang.value === codeSubmission.language,
        );
        if (matchedLanguage) setLanguage(matchedLanguage);
      }
    }
    loadProgram();
  }, [programId, user?.id]);

  const getStatusColor = (status: string | null) => {
    if (!status) return "bg-zinc-100 text-zinc-700";
    if (status === "approved") return "bg-emerald-100 text-emerald-700";
    if (status === "pending" || status === "pending_review") {
      return "bg-amber-100 text-amber-700";
    }
    if (status === "rejected") return "bg-red-100 text-red-700";
    return "bg-zinc-100 text-zinc-700";
  };

  const getStatusLabel = (status: string | null) => {
    if (!status) return "Not started";
    return status.replaceAll("_", " ");
  };

  const handleRunCode = async () => {
    setIsExecuting(true);
    setOutput("Running code...");
    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: code,
          language_id: language.id,
          stdin: customInput,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setOutput(
          `Error: ${data.error || "Execution failed"}\n${data.details || ""}`,
        );
      } else {
        if (data.compile_output) {
          setOutput(`Compile Error:\n${data.compile_output}`);
        } else if (data.stderr) {
          setOutput(`Error:\n${data.stderr}`);
        } else {
          setOutput(
            data.stdout || "Code executed successfully with no output.",
          );
        }
      }
    } catch {
      setOutput("Failed to connect to execution server. Try again later.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleGetAIFeedback = async (mode: "algorithm" | "code") => {
    const questionText = (programDetails?.description || "").trim();
    if (!questionText) {
      const message =
        "Question description is missing. Ask your teacher to add it before requesting AI review.";
      setAiFeedback(message);
      setIsAiDrawerOpen(true);
      return;
    }

    if (mode === "algorithm" && !algorithm.trim()) {
      setAiFeedback("Please write your algorithm first.");
      setIsAiDrawerOpen(true);
      return;
    }

    if (mode === "code" && !code.trim()) {
      setAiFeedback("Please write your code first.");
      setIsAiDrawerOpen(true);
      return;
    }

    setIsAiDrawerOpen(true);
    setIsGettingFeedback(true);
    try {
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          algorithm,
          code,
          language: language.name,
          description: questionText,
          question: questionText,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setAiFeedback(data.error || "Failed to get AI feedback.");
        return;
      }

      setAiFeedback(data.feedback || "No feedback received.");
    } catch {
      setAiFeedback(
        "Failed to fetch AI feedback. Ensure your API keys are configured and valid.",
      );
    } finally {
      setIsGettingFeedback(false);
    }
  };

  const saveAlgorithm = async (newStatus: "draft" | "pending") => {
    if (!user) {
      toast.error("You must be logged in to save your algorithm.");
      return;
    }

    if (!algorithm.trim()) {
      toast.error("Please write your algorithm first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: existing } = await supabase
        .from("algorithm_submissions")
        .select("id")
        .eq("program_id", programId)
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from("algorithm_submissions")
          .update({
            content: algorithm,
            status: newStatus,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("algorithm_submissions").insert({
          program_id: programId,
          student_id: user.id,
          content: algorithm,
          status: newStatus,
        });

        if (error) throw error;
      }

      setAlgorithmStatus(newStatus);
      toast.success(
        newStatus === "draft"
          ? "Algorithm draft saved."
          : "Algorithm submitted for teacher approval.",
      );
    } catch (error) {
      console.error("Error saving algorithm:", error);
      toast.error("Failed to save algorithm. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveCode = async () => {
    if (!user) {
      toast.error("You must be logged in to save code.");
      return;
    }

    if (!code.trim()) {
      toast.error("Please write your code first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: existing } = await supabase
        .from("code_submissions")
        .select("id")
        .eq("program_id", programId)
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        const { data: existingCodeData } = await supabase
          .from("code_submissions")
          .select("metadata")
          .eq("id", existing.id)
          .maybeSingle();

        const { error } = await supabase
          .from("code_submissions")
          .update({
            code,
            language: language.value,
            output,
            metadata: {
              ...((existingCodeData?.metadata as Record<string, unknown>) ||
                {}),
              custom_input: customInput,
            },
            status: "draft",
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("code_submissions").insert({
          program_id: programId,
          student_id: user.id,
          code,
          language: language.value,
          output,
          metadata: {
            custom_input: customInput,
          },
          status: "draft",
        });

        if (error) throw error;
      }

      setCodeStatus("draft");
      toast.success("Code draft saved.");
    } catch (error) {
      console.error("Error saving code:", error);
      toast.error("Failed to save code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitRecord = async () => {
    if (!user) {
      toast.error("You must be logged in to submit.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: existingAlgo } = await supabase
        .from("algorithm_submissions")
        .select("id")
        .eq("program_id", programId)
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingAlgo?.id) {
        const { error: algoError } = await supabase
          .from("algorithm_submissions")
          .update({
            content: algorithm,
            status: "pending",
          })
          .eq("id", existingAlgo.id);

        if (algoError) throw algoError;
      } else {
        const { error: algoError } = await supabase
          .from("algorithm_submissions")
          .insert({
            program_id: programId,
            student_id: user.id,
            content: algorithm,
            status: "pending",
          });

        if (algoError) throw algoError;
      }

      const { data: existingCode } = await supabase
        .from("code_submissions")
        .select("id")
        .eq("program_id", programId)
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingCode?.id) {
        const { data: existingCodeData } = await supabase
          .from("code_submissions")
          .select("metadata")
          .eq("id", existingCode.id)
          .maybeSingle();

        const { error: codeError } = await supabase
          .from("code_submissions")
          .update({
            code,
            language: language.value,
            output: output.startsWith("Awaiting")
              ? "No execution output"
              : output,
            metadata: {
              ...((existingCodeData?.metadata as Record<string, unknown>) ||
                {}),
              custom_input: customInput,
            },
            status: "pending",
          })
          .eq("id", existingCode.id);

        if (codeError) throw codeError;
      } else {
        const { error: codeError } = await supabase
          .from("code_submissions")
          .insert({
            program_id: programId,
            student_id: user.id,
            code,
            language: language.value,
            output: output.startsWith("Awaiting")
              ? "No execution output"
              : output,
            metadata: {
              custom_input: customInput,
            },
            status: "pending",
          });

        if (codeError) throw codeError;
      }

      setAlgorithmStatus("pending");
      setCodeStatus("pending");

      toast.success("Record submitted successfully!");
      router.push(`/${orgId}/student/classrooms/${classroomId}/programs`);
    } catch (error) {
      console.error("Error submitting record:", error);
      toast.error("Failed to submit record. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Program Workspace"
      subtitle="Draft the algorithm, write code, and review outputs before submission."
      navItems={navItems}
    >
      <Card>
        <CardHeader>
          <CardTitle>Question</CardTitle>
          <CardDescription>
            Read the question carefully before drafting your algorithm and code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <h3 className="text-lg font-semibold">
            {programDetails?.title || "Loading question..."}
          </h3>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
            {programDetails?.description ||
              "No question description available for this assignment."}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>
                {programDetails ? programDetails.title : "Algorithm Editor"}
              </CardTitle>
              <CardDescription className="max-h-[80px] overflow-y-auto">
                {programDetails?.description
                  ? programDetails.description
                  : "Draft and revise the algorithm for approval."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 flex-1 flex flex-col">
            <Textarea
              className="min-h-[220px] flex-1"
              placeholder="Write your algorithm steps here..."
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => saveAlgorithm("draft")}
                  disabled={isSubmitting}
                >
                  Save Draft
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => saveAlgorithm("pending")}
                  disabled={isSubmitting}
                >
                  Request Approval
                </Button>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleGetAIFeedback("algorithm")}
                disabled={isGettingFeedback}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                AI Algo Review
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Workspace Status</CardTitle>
            <CardDescription>
              Live submission status for this program.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Algorithm</span>
              <Badge className={getStatusColor(algorithmStatus)}>
                {getStatusLabel(algorithmStatus)}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span>Code</span>
              <Badge className={getStatusColor(codeStatus)}>
                {getStatusLabel(codeStatus)}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-center"
              onClick={() => setIsAiDrawerOpen(true)}
            >
              Open AI Review
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="space-y-1">
              <CardTitle>Code Editor</CardTitle>
              <CardDescription>
                Write and execute your implementation.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={language.value}
                onValueChange={(val) => {
                  const lang = LANGUAGES.find((l) => l.value === val);
                  if (lang) setLanguage(lang);
                }}
              >
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.id} value={lang.value}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => setIsFullscreen((prev) => !prev)}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 flex-1 flex flex-col min-h-[400px]">
            <div className="rounded-lg overflow-hidden border flex-1 relative bg-zinc-950">
              <Editor
                height="100%"
                language={language.value}
                value={code}
                onChange={(val) => setCode(val || "")}
                theme="vs-dark"
                options={{
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleRunCode}
                  disabled={isExecuting}
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Executing
                    </>
                  ) : (
                    "Run Code"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={saveCode}
                  disabled={isSubmitting}
                >
                  Save Code
                </Button>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleGetAIFeedback("code")}
                disabled={isGettingFeedback}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                AI Code Review
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Output Console</CardTitle>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => setIsFullscreen((prev) => !prev)}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
            <CardDescription>
              Execution output from Judge0 will show here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 flex-1 flex flex-col min-h-[400px]">
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">Execution Input (stdin)</p>
              <Textarea
                placeholder="Provide input values for Judge0 execution..."
                className="min-h-[90px]"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
              />
            </div>
            <div className="rounded-lg border bg-zinc-950 text-zinc-100 p-4 font-mono text-sm whitespace-pre-wrap flex-1 overflow-y-auto">
              {output}
            </div>
            <div className="flex justify-end mt-auto pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOutput("Awaiting execution run.")}
              >
                Clear Console
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Final Submission</CardTitle>
          <CardDescription>
            Submit once algorithm and code are ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Submission status: Draft ready, waiting for final compile.
          </div>
          <Button onClick={handleSubmitRecord} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Submit Record
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-background p-4">
          <div className="flex h-full flex-col rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold">Workspace</h3>
                <div className="flex items-center gap-2">
                  <Select
                    value={language.value}
                    onValueChange={(val) => {
                      const lang = LANGUAGES.find((l) => l.value === val);
                      if (lang) setLanguage(lang);
                    }}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="Language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang.id} value={lang.value}>
                          {lang.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleGetAIFeedback("code")}
                    disabled={isGettingFeedback}
                    className="h-8"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI Code Review
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAiDrawerOpen(true)}
                    className="h-8"
                  >
                    Open AI Panel
                  </Button>
                </div>
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
                  onClick={() => setIsFullscreen(false)}
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
                      language={language.value}
                      value={code}
                      onChange={(val) => setCode(val || "")}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        fontSize: 14,
                        padding: { top: 16, bottom: 16 },
                      }}
                    />
                  </div>
                </ResizablePanel>
                <ResizableHandle />
                <ResizablePanel defaultSize={30} minSize={15}>
                  <div className="flex h-full flex-col bg-background">
                    <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Input (stdin)</h4>
                        </div>
                        <Textarea
                          placeholder="Input values..."
                          className="min-h-[100px] resize-y"
                          value={customInput}
                          onChange={(e) => setCustomInput(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 flex-1 flex flex-col">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Output</h4>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs px-2"
                            onClick={() => setOutput("Awaiting execution run.")}
                          >
                            Clear
                          </Button>
                        </div>
                        <div className="flex-1 rounded-lg border bg-zinc-950 p-4 font-mono text-sm text-zinc-100 whitespace-pre-wrap overflow-auto">
                          {output}
                        </div>
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
              Suggestions for your algorithm and code.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 h-[calc(100%-5rem)] overflow-y-auto rounded-lg border p-4">
            {isGettingFeedback ? (
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
