"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase/client";

export default function NewQuestionPage() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        title: "",
        description: "",
        difficulty: "medium",
        input_format: "",
        output_format: "",
        constraints: "",
        sample_input: "",
        sample_output: "",
    });

    const updateForm = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        setIsSubmitting(true);
        setError(null);

        const { error: insertError } = await supabase.from("programs").insert({
            title: form.title,
            description: form.description || null,
            status: "active",
            metadata: {
                difficulty: form.difficulty,
                input_format: form.input_format || null,
                output_format: form.output_format || null,
                constraints: form.constraints || null,
                sample_input: form.sample_input || null,
                sample_output: form.sample_output || null,
                teacher_id: user?.id || null,
            },
        });

        if (insertError) {
            setError(insertError.message);
            setIsSubmitting(false);
            return;
        }

        router.push("/teacher/questions");
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <Button asChild variant="ghost" size="sm">
                    <Link href="/teacher/questions">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Add Question</h2>
                    <p className="text-sm text-muted-foreground">
                        Create a new programming assignment for your students
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                    {/* Main form */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Question Details</CardTitle>
                                <CardDescription>
                                    Basic information about the programming problem
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Title *</Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g., Binary Search Implementation"
                                        value={form.title}
                                        onChange={(e) => updateForm("title", e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Describe the problem statement in detail..."
                                        value={form.description}
                                        onChange={(e) => updateForm("description", e.target.value)}
                                        className="min-h-[120px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="difficulty">Difficulty</Label>
                                    <div className="flex gap-2">
                                        {["easy", "medium", "hard"].map((d) => (
                                            <button
                                                key={d}
                                                type="button"
                                                onClick={() => updateForm("difficulty", d)}
                                                className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all ${form.difficulty === d
                                                        ? d === "easy"
                                                            ? "bg-emerald-100 text-emerald-800 ring-2 ring-emerald-300"
                                                            : d === "medium"
                                                                ? "bg-amber-100 text-amber-800 ring-2 ring-amber-300"
                                                                : "bg-red-100 text-red-800 ring-2 ring-red-300"
                                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                    }`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Input / Output</CardTitle>
                                <CardDescription>
                                    Define the expected formats and constraints
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="input_format">Input Format</Label>
                                        <Textarea
                                            id="input_format"
                                            placeholder="Describe the input format..."
                                            value={form.input_format}
                                            onChange={(e) =>
                                                updateForm("input_format", e.target.value)
                                            }
                                            className="min-h-[80px]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="output_format">Output Format</Label>
                                        <Textarea
                                            id="output_format"
                                            placeholder="Describe the output format..."
                                            value={form.output_format}
                                            onChange={(e) =>
                                                updateForm("output_format", e.target.value)
                                            }
                                            className="min-h-[80px]"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="constraints">Constraints</Label>
                                    <Textarea
                                        id="constraints"
                                        placeholder="e.g., 1 ≤ n ≤ 10⁵, Time limit: 2 seconds"
                                        value={form.constraints}
                                        onChange={(e) => updateForm("constraints", e.target.value)}
                                        className="min-h-[60px]"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Sample Test Case</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="sample_input">Sample Input</Label>
                                    <Textarea
                                        id="sample_input"
                                        placeholder="5&#10;1 2 3 4 5"
                                        value={form.sample_input}
                                        onChange={(e) =>
                                            updateForm("sample_input", e.target.value)
                                        }
                                        className="min-h-[80px] font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sample_output">Sample Output</Label>
                                    <Textarea
                                        id="sample_output"
                                        placeholder="15"
                                        value={form.sample_output}
                                        onChange={(e) =>
                                            updateForm("sample_output", e.target.value)
                                        }
                                        className="min-h-[80px] font-mono text-sm"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {error && (
                            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isSubmitting || !form.title.trim()}
                        >
                            {isSubmitting ? "Publishing..." : "Publish Question"}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
