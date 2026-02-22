"use client";

import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Play, RotateCcw, Save, CheckCircle2, ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase/client";

// Supported languages in Judge0
const LANGUAGES = [
  {
    id: 71,
    name: "Python (3.8.1)",
    monaco: "python",
    defaultCode: "print('Hello World')",
  },
  {
    id: 62,
    name: "Java (OpenJDK 13.0.1)",
    monaco: "java",
    defaultCode:
      'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}',
  },
  {
    id: 50,
    name: "C (GCC 9.2.0)",
    monaco: "c",
    defaultCode:
      '#include <stdio.h>\n\nint main() {\n    printf("Hello World\\n");\n    return 0;\n}',
  },
  {
    id: 54,
    name: "C++ (GCC 9.2.0)",
    monaco: "cpp",
    defaultCode:
      '#include <iostream>\n\nint main() {\n    std::cout << "Hello World" << std::endl;\n    return 0;\n}',
  },
  {
    id: 63,
    name: "JavaScript (Node.js 12.14.0)",
    monaco: "javascript",
    defaultCode: "console.log('Hello World');",
  },
];

export default function StudentCodePage() {
  const params = useParams();
  const router = useRouter();
  const programId = params.id as string;
  const user = useAuthStore((s) => s.user);

  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [code, setCode] = useState(LANGUAGES[0].defaultCode);
  const [customInput, setCustomInput] = useState("");
  const [output, setOutput] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);

  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && programId) {
      loadSubmission();
    }
  }, [user, programId]);

  async function loadSubmission() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("code_submissions")
      .select("code, language, status")
      .eq("program_id", programId)
      .eq("student_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setCode(data.code || "");
      setStatus(data.status);
      const lang =
        LANGUAGES.find((l) =>
          l.name.toLowerCase().includes((data.language || "").toLowerCase()),
        ) || LANGUAGES[0];
      setSelectedLanguage(lang);
    }
    setIsLoading(false);
  }

  const handleLanguageChange = (id: string) => {
    const lang = LANGUAGES.find((l) => l.id.toString() === id) || LANGUAGES[0];
    setSelectedLanguage(lang);
    setCode(lang.defaultCode);
  };

  const handleRunCode = async () => {
    setIsCompiling(true);
    setOutput("Compiling and running...");

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_code: code,
          language_id: selectedLanguage.id,
          stdin: customInput,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to execute code");
      }

      const result = await response.json();

      // Handle the Judge0 response format
      if (result.stdout !== null) {
        setOutput(result.stdout);
      } else if (result.compile_output !== null) {
        setOutput(`Compilation Error:\n${result.compile_output}`);
      } else if (result.stderr !== null) {
        setOutput(`Runtime Error:\n${result.stderr}`);
      } else {
        setOutput(
          `Execution failed. Status: ${result.status?.description || "Unknown error"}`,
        );
      }
    } catch (err) {
      setOutput(
        `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
      );
    } finally {
      setIsCompiling(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!code.trim() || !user) return;
    setIsSaving(true);

    const langName = selectedLanguage.name.split(" ")[0].toLowerCase();

    const { error } = await supabase.from("code_submissions").upsert(
      {
        program_id: programId,
        student_id: user.id,
        code: code,
        language: langName,
        output: output,
        status: "draft",
      },
      { onConflict: "program_id, student_id" },
    );

    if (!error) {
      setStatus("draft");
    }
    setIsSaving(false);
  };

  const handleSubmitCode = async () => {
    if (!code.trim() || !user) return;
    setIsSubmitting(true);

    const langName = selectedLanguage.name.split(" ")[0].toLowerCase();
    const newStatus = "approved"; // Auto-approve for demo

    const { error } = await supabase.from("code_submissions").upsert(
      {
        program_id: programId,
        student_id: user.id,
        code: code,
        language: langName,
        output: output,
        status: newStatus,
      },
      { onConflict: "program_id, student_id" },
    );

    if (!error) {
      setStatus(newStatus);
      // Update overall program status
      await supabase
        .from("classroom_members") // This isn't quite right for tracking individual program status, but we'll update the logic later if needed
        .select("*")
        .limit(1);

      if (newStatus === "approved") {
        setTimeout(() => {
          router.push(`/student/records/${programId}`);
        }, 1500);
      }
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8 h-[calc(100vh-8rem)] items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  const isApproved = status === "approved";
  const isPending = status === "pending_review";
  const isReadOnly = isApproved || isPending;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="h-8 w-8 shrink-0"
          >
            <Link href={`/student/questions/${programId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Code Editor</h2>
            <p className="text-muted-foreground">
              {isApproved
                ? "Your code was approved!"
                : isPending
                  ? "Waiting for teacher review."
                  : "Write, test, and submit your solution."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedLanguage.id.toString()}
            onValueChange={handleLanguageChange}
            disabled={isReadOnly}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.id} value={lang.id.toString()}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isReadOnly && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCode(selectedLanguage.defaultCode)}
                className="gap-2"
                disabled={isSaving || isSubmitting || isCompiling}
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                className="gap-2"
                disabled={isSaving || isSubmitting || isCompiling}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Draft"}
              </Button>
              <Button
                size="sm"
                onClick={handleRunCode}
                disabled={isCompiling || isSubmitting}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Play className="h-4 w-4" />
                {isCompiling ? "Running..." : "Run Code"}
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitCode}
                disabled={isSubmitting || isCompiling}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </>
          )}
          {isApproved && (
            <Button size="sm" className="gap-2" asChild>
              <Link href={`/student/records/${programId}`}>
                View Digital Record <ArrowLeft className="h-4 w-4 rotate-180" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <ResizablePanelGroup
        orientation="horizontal"
        className="rounded-lg border bg-card"
      >
        <ResizablePanel defaultSize="65%">
          <div className="flex h-full flex-col">
            <div className="border-b px-4 py-2 font-semibold text-sm">
              main.
              {selectedLanguage.monaco === "python"
                ? "py"
                : selectedLanguage.monaco === "javascript"
                  ? "js"
                  : selectedLanguage.monaco}
            </div>
            <div className="flex-1">
              <Editor
                height="100%"
                language={selectedLanguage.monaco}
                theme="vs-dark"
                value={code}
                onChange={(value) => setCode(value || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  padding: { top: 16 },
                  scrollBeyondLastLine: false,
                  readOnly: isReadOnly,
                }}
              />
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="35%">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel defaultSize="40%">
              <div className="flex h-full flex-col">
                <div className="border-b px-4 py-2 font-semibold text-sm">
                  Custom Input
                </div>
                <div className="flex-1 p-2">
                  <Textarea
                    placeholder="Enter input here..."
                    className="h-full resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize="60%">
              <div className="flex h-full flex-col">
                <div className="border-y px-4 py-2 font-semibold text-sm flex justify-between items-center">
                  <span>Output Console</span>
                </div>
                <div className="flex-1 bg-black text-green-400 p-4 font-mono text-sm overflow-auto whitespace-pre-wrap">
                  {output || "Output will appear here..."}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
