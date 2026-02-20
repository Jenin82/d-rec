"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Play, Send, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useQuestionStore, type Program } from "@/stores/question-store";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase/client";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
    ssr: false,
    loading: () => (
        <div className="flex h-[500px] items-center justify-center rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground">Loading editor...</p>
        </div>
    ),
});

const LANGUAGES = [
    { id: "c", label: "C", monaco: "c", piston: "c", version: "10.2.0" },
    { id: "cpp", label: "C++", monaco: "cpp", piston: "c++", version: "10.2.0" },
    { id: "python", label: "Python", monaco: "python", piston: "python", version: "3.10.0" },
    { id: "java", label: "Java", monaco: "java", piston: "java", version: "15.0.2" },
    { id: "javascript", label: "JavaScript", monaco: "javascript", piston: "javascript", version: "18.15.0" },
];

const DEFAULT_CODE: Record<string, string> = {
    c: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
    cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
    python: 'print("Hello, World!")',
    java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
    javascript: 'console.log("Hello, World!");',
};

export default function CodingWorkspacePage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { fetchProgramById } = useQuestionStore();
    const user = useAuthStore((s) => s.user);

    const [program, setProgram] = useState<Program | null>(null);
    const [selectedLang, setSelectedLang] = useState("python");
    const [code, setCode] = useState(DEFAULT_CODE.python);
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [algorithm, setAlgorithm] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        const p = await fetchProgramById(id);
        setProgram(p);

        if (p && user) {
            // Load approved algorithm
            const { data: algo } = await supabase
                .from("algorithm_submissions")
                .select("content")
                .eq("program_id", id)
                .eq("student_id", user.id)
                .eq("status", "approved")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (algo?.content) setAlgorithm(algo.content);

            // Load existing code submission
            const { data: codeSub } = await supabase
                .from("code_submissions")
                .select("code, language, output")
                .eq("program_id", id)
                .eq("student_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (codeSub?.code) {
                setCode(codeSub.code);
                if (codeSub.language) setSelectedLang(codeSub.language);
                if (codeSub.output) setOutput(codeSub.output);
            }
        }
        setIsLoading(false);
    }

    const changeLang = useCallback(
        (langId: string) => {
            setSelectedLang(langId);
            setCode(DEFAULT_CODE[langId] ?? "");
        },
        []
    );

    const runCode = async () => {
        setIsRunning(true);
        setOutput("");
        setError(null);

        const lang = LANGUAGES.find((l) => l.id === selectedLang);
        if (!lang) return;

        try {
            const res = await fetch("https://emkc.org/api/v2/piston/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    language: lang.piston,
                    version: lang.version,
                    files: [{ content: code }],
                    stdin: input,
                }),
            });

            const data = await res.json();
            const result = data.run;
            if (result.stderr) {
                setOutput(`Error:\n${result.stderr}`);
            } else {
                setOutput(result.stdout || "(No output)");
            }
        } catch (err) {
            setError("Failed to connect to the compiler. Please try again.");
        } finally {
            setIsRunning(false);
        }
    };

    const handleSubmit = async () => {
        if (!user || !code.trim()) return;
        setIsSubmitting(true);
        setError(null);

        const { error: insertError } = await supabase
            .from("code_submissions")
            .insert({
                program_id: id,
                student_id: user.id,
                code: code.trim(),
                language: selectedLang,
                output: output || null,
                status: "pending",
            });

        if (insertError) {
            setError(insertError.message);
            setIsSubmitting(false);
            return;
        }

        router.push(`/student/questions/${id}`);
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 rounded bg-muted animate-pulse" />
                <div className="h-[600px] rounded bg-muted animate-pulse" />
            </div>
        );
    }

    const currentLang = LANGUAGES.find((l) => l.id === selectedLang)!;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button asChild variant="ghost" size="sm">
                        <Link href={`/student/questions/${id}`}>
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-lg font-bold tracking-tight">
                            Coding Workspace
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {program?.title ?? "Loading..."}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={isRunning || !code.trim()}
                        onClick={runCode}
                    >
                        {isRunning ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Play className="h-4 w-4" />
                        )}
                        Run
                    </Button>
                    <Button
                        size="sm"
                        className="gap-2"
                        disabled={isSubmitting || !code.trim()}
                        onClick={handleSubmit}
                    >
                        <Send className="h-4 w-4" />
                        Submit
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
                {/* Editor Column */}
                <div className="space-y-4">
                    {/* Language selector */}
                    <div className="flex gap-1 rounded-lg bg-muted p-1 overflow-x-auto">
                        {LANGUAGES.map((lang) => (
                            <button
                                key={lang.id}
                                type="button"
                                onClick={() => changeLang(lang.id)}
                                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-all ${selectedLang === lang.id
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {lang.label}
                            </button>
                        ))}
                    </div>

                    {/* Code Editor */}
                    <div className="rounded-lg border overflow-hidden">
                        <MonacoEditor
                            height="500px"
                            language={currentLang.monaco}
                            theme="vs-dark"
                            value={code}
                            onChange={(value) => setCode(value ?? "")}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                lineHeight: 20,
                                padding: { top: 12 },
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                            }}
                        />
                    </div>

                    {/* Input */}
                    <Card>
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm">Input (stdin)</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <Textarea
                                placeholder="Enter your input here..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="min-h-[60px] font-mono text-sm"
                            />
                        </CardContent>
                    </Card>

                    {/* Output */}
                    <Card>
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm">Output</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="min-h-[60px] rounded-lg bg-muted p-3 font-mono text-sm whitespace-pre-wrap">
                                {isRunning ? (
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Running...
                                    </span>
                                ) : (
                                    output || (
                                        <span className="text-muted-foreground">
                                            Run your code to see output
                                        </span>
                                    )
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar - Algorithm Reference */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Approved Algorithm</CardTitle>
                            <CardDescription className="text-xs">
                                Reference your approved algorithm while coding
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-[400px] overflow-y-auto rounded-lg bg-muted/50 p-3">
                                <pre className="whitespace-pre-wrap text-xs font-mono leading-relaxed">
                                    {algorithm ??
                                        "No approved algorithm found for this question."}
                                </pre>
                            </div>
                        </CardContent>
                    </Card>

                    {error && (
                        <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
