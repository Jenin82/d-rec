"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuestionStore, type Program } from "@/stores/question-store";

const difficultyColor: Record<string, string> = {
    easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
    hard: "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400",
};

export default function QuestionsPage() {
    const { programs, fetchPrograms, isLoading } = useQuestionStore();
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchPrograms();
    }, [fetchPrograms]);

    const filtered = programs.filter(
        (p) =>
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            (p.description ?? "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Questions</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage your posted questions and assignments
                    </p>
                </div>
                <Button asChild className="gap-2">
                    <Link href="/teacher/questions/new">
                        <Plus className="h-4 w-4" />
                        Add Question
                    </Link>
                </Button>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search questions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                />
            </div>

            {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader>
                                <div className="h-5 w-2/3 rounded bg-muted" />
                                <div className="h-4 w-full rounded bg-muted" />
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-12">
                        <p className="text-sm text-muted-foreground">
                            {search ? "No questions match your search." : "No questions yet. Create your first question!"}
                        </p>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/teacher/questions/new">Create Question</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {filtered.map((program: Program) => (
                        <Card
                            key={program.id}
                            className="group transition-shadow hover:shadow-md"
                        >
                            <CardHeader>
                                <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="text-base">{program.title}</CardTitle>
                                    <Badge
                                        variant="secondary"
                                        className={`shrink-0 border-0 capitalize ${difficultyColor[(program.metadata as Record<string, unknown> | null)?.difficulty as string ?? "medium"] ?? difficultyColor.medium
                                            }`}
                                    >
                                        {(program.metadata as Record<string, unknown> | null)?.difficulty as string ?? "medium"}
                                    </Badge>
                                </div>
                                <CardDescription className="line-clamp-2">
                                    {program.description ?? "No description provided."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground">
                                    Created {new Date(program.created_at).toLocaleDateString()}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
