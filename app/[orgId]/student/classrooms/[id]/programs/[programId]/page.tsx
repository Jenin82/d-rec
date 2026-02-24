"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
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
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase/client";

const LANGUAGES = [
  { id: 63, name: "JavaScript", value: "javascript" },
  { id: 71, name: "Python", value: "python" },
  { id: 62, name: "Java", value: "java" },
  { id: 54, name: "C++", value: "cpp" },
];

export default function StudentProgramPage({
  params,
}: {
  params: { orgId: string; id: string; programId: string };
}) {
  const { orgId, programId, id } = params;
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const navItems = [
    { label: "My Classrooms", href: `/${orgId}/student` },
    {
      label: "Classroom Programs",
      href: `/${orgId}/student/classrooms/${id}/programs`,
    },
  ];

  const [programDetails, setProgramDetails] = useState<{
    title: string;
    description: string | null;
  } | null>(null);
  const [algorithm, setAlgorithm] = useState("");
  const [code, setCode] = useState("// Write your code here");
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [output, setOutput] = useState("Awaiting execution run.");
  const [isExecuting, setIsExecuting] = useState(false);

  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isGettingFeedback, setIsGettingFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadProgram() {
      const { data, error } = await supabase
        .from("programs")
        .select("title, description")
        .eq("id", programId)
        .single();

      if (!error && data) {
        setProgramDetails(data);
      }
    }
    loadProgram();
  }, [programId]);

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
          stdin: "",
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
    } catch (err) {
      setOutput("Failed to connect to execution server. Try again later.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleGetAIFeedback = async (mode: "algorithm" | "code") => {
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
          description:
            programDetails?.description || "No description provided.",
        }),
      });
      const data = await response.json();
      setAiFeedback(data.feedback || "No feedback received.");
    } catch (err) {
      setAiFeedback(
        "Failed to fetch AI feedback. Ensure your API keys are configured and valid.",
      );
    } finally {
      setIsGettingFeedback(false);
    }
  };

  const handleSubmitRecord = async () => {
    if (!user) {
      toast.error("You must be logged in to submit.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Submit Algorithm
      const { error: algoError } = await supabase
        .from("algorithm_submissions")
        .insert({
          program_id: programId,
          student_id: user.id,
          content: algorithm,
          status: "pending",
        });

      if (algoError) throw algoError;

      // 2. Submit Code
      const { error: codeError } = await supabase
        .from("code_submissions")
        .insert({
          program_id: programId,
          student_id: user.id,
          code: code,
          language: language.value,
          output: output.startsWith("Awaiting")
            ? "No execution output"
            : output,
          status: "pending",
        });

      if (codeError) throw codeError;

      toast.success("Record submitted successfully!");
      router.push(`/${orgId}/student/progress`);
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
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href={`/${orgId}/student/progress`}>View Progress</Link>
        </Button>
      }
    >
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
            <Badge variant="secondary">Approved</Badge>
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
                <Button size="sm">Save Draft</Button>
                <Button size="sm" variant="outline">
                  Request Re-Approval
                </Button>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleGetAIFeedback("algorithm")}
                disabled={isGettingFeedback}
              >
                <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                AI Algo Review
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>AI Review Panel</CardTitle>
            <CardDescription>
              Suggested improvements and learning prompts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm flex-1 overflow-y-auto min-h-[220px]">
            {isGettingFeedback ? (
              <div className="flex items-center gap-2 text-muted-foreground justify-center h-full">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing with Gemini...
              </div>
            ) : aiFeedback ? (
              <div className="whitespace-pre-wrap">{aiFeedback}</div>
            ) : (
              <div className="text-muted-foreground flex flex-col items-center justify-center h-full gap-2 text-center p-4 border border-dashed rounded-lg">
                <Sparkles className="h-8 w-8 text-muted-foreground/50" />
                <p>
                  Click "AI Review" on your algorithm or code to get instant
                  feedback.
                </p>
              </div>
            )}
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
                <Button size="sm" variant="outline">
                  Save Code
                </Button>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleGetAIFeedback("code")}
                disabled={isGettingFeedback}
              >
                <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                AI Code Review
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Output Console</CardTitle>
            <CardDescription>
              Execution output from Judge0 will show here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 flex-1 flex flex-col min-h-[400px]">
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
    </AppShell>
  );
}
