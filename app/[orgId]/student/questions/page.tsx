"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuestionStore, type Program } from "@/stores/question-store";

const difficultyColor: Record<string, string> = {
    easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
    hard: "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400",
};

export default function StudentQuestionsPage() {
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
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Questions</h2>
                <p className="text-sm text-muted-foreground">
                    Browse all available programming questions
                </p>
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
                <div className="grid gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                                <div className="h-5 w-2/3 rounded bg-muted mb-2" />
                                <div className="h-4 w-full rounded bg-muted" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-12">
                        <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">
                            {search ? "No questions match your search." : "No questions available yet."}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filtered.map((program: Program) => {
                        const metadata = program.metadata as Record<string, unknown> | undefined;
                        const difficulty = (metadata?.difficulty as string) ?? "medium";

                        return (
                            <Card key={program.id} className="transition-shadow hover:shadow-md">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-medium">{program.title}</h4>
                                                <Badge
                                                    variant="secondary"
                                                    className={`capitalize text-xs border-0 ${difficultyColor[difficulty] ?? difficultyColor.medium
                                                        }`}
                                                >
                                                    {difficulty}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {program.description ?? "No description"}
                                            </p>
                                        </div>
                                        <Button asChild size="sm">
                                            <Link href={`/student/questions/${program.id}`}>View</Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
