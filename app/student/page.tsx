"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, FileText, Clock } from "lucide-react";

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
import { ProgressTracker } from "@/components/progress-tracker";
import { useQuestionStore, type Program } from "@/stores/question-store";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase/client";

type ProgramWithStatus = Program & { studentStatus: string };

export default function StudentDashboard() {
  const { programs, fetchPrograms, isLoading } = useQuestionStore();
  const user = useAuthStore((s) => s.user);
  const [programStatuses, setProgramStatuses] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  useEffect(() => {
    if (programs.length > 0 && user) {
      loadStatuses();
    }
  }, [programs, user]);

  async function loadStatuses() {
    if (!user) return;
    const statuses: Record<string, string> = {};

    for (const program of programs) {
      // Check for code submissions
      const { data: codeSub } = await supabase
        .from("code_submissions")
        .select("status")
        .eq("program_id", program.id)
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (codeSub?.status === "approved") {
        statuses[program.id] = "final_approved";
        continue;
      }
      if (codeSub?.status === "pending") {
        statuses[program.id] = "code_submitted";
        continue;
      }

      // Check for algorithm submissions
      const { data: algoSub } = await supabase
        .from("algorithm_submissions")
        .select("status")
        .eq("program_id", program.id)
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (algoSub?.status === "approved") {
        statuses[program.id] = "coding_stage";
      } else if (algoSub?.status === "pending") {
        statuses[program.id] = "algorithm_pending";
      } else if (algoSub?.status === "rejected") {
        statuses[program.id] = "algorithm_rejected";
      } else {
        statuses[program.id] = "not_started";
      }
    }

    setProgramStatuses(statuses);
  }

  const approvedCount = Object.values(programStatuses).filter(
    (s) => s === "final_approved"
  ).length;
  const inProgressCount = Object.values(programStatuses).filter(
    (s) => s !== "not_started" && s !== "final_approved"
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ""}
        </h2>
        <p className="text-sm text-muted-foreground">
          Here&apos;s your current progress across all questions
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{programs.length}</p>
              <p className="text-xs text-muted-foreground">Total Questions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgressCount}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">Approved Records</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approved records link */}
      {approvedCount > 0 && (
        <Button asChild variant="outline" className="gap-2">
          <Link href="/student/records">
            <FileText className="h-4 w-4" />
            View Approved Records ({approvedCount})
          </Link>
        </Button>
      )}

      {/* Questions List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Available Questions</h3>
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
        ) : programs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <BookOpen className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No questions available yet. Your teacher will post assignments soon.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {programs.map((program) => {
              const status = programStatuses[program.id] ?? "not_started";
              const metadata = program.metadata as Record<string, unknown> | undefined;
              const difficulty = (metadata?.difficulty as string) ?? "medium";

              return (
                <Card
                  key={program.id}
                  className="transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{program.title}</h4>
                          <Badge
                            variant="secondary"
                            className={`capitalize text-xs border-0 ${difficulty === "easy"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30"
                                : difficulty === "hard"
                                  ? "bg-red-100 text-red-800 dark:bg-red-950/30"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/30"
                              }`}
                          >
                            {difficulty}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {program.description ?? "No description"}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <StatusBadge status={status} />
                        <Button asChild size="sm">
                          <Link href={`/student/questions/${program.id}`}>
                            {status === "not_started"
                              ? "Start"
                              : status === "final_approved"
                                ? "View Record"
                                : "Continue"}
                          </Link>
                        </Button>
                      </div>
                    </div>
                    {status !== "not_started" && (
                      <div className="mt-4 pt-4 border-t">
                        <ProgressTracker status={status} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
