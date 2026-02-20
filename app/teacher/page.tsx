"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FileQuestion,
  BookCheck,
  Code2,
  CheckCircle2,
  Clock,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { supabase } from "@/lib/supabase/client";

type Stats = {
  totalQuestions: number;
  pendingAlgorithms: number;
  pendingCode: number;
  approved: number;
};

type RecentSubmission = {
  id: string;
  student_name: string;
  program_title: string;
  type: "algorithm" | "code";
  status: string;
  created_at: string;
};

export default function TeacherDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalQuestions: 0,
    pendingAlgorithms: 0,
    pendingCode: 0,
    approved: 0,
  });
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    // Load stats
    const [programsRes, algoRes, codeRes, approvedRes] = await Promise.all([
      supabase.from("programs").select("id", { count: "exact", head: true }),
      supabase
        .from("algorithm_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("code_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("code_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
    ]);

    setStats({
      totalQuestions: programsRes.count ?? 0,
      pendingAlgorithms: algoRes.count ?? 0,
      pendingCode: codeRes.count ?? 0,
      approved: approvedRes.count ?? 0,
    });

    // Load recent algorithm submissions
    const { data: recentAlgos } = await supabase
      .from("algorithm_submissions")
      .select("id, status, created_at, student_id, program_id")
      .order("created_at", { ascending: false })
      .limit(5);

    // Load recent code submissions
    const { data: recentCodes } = await supabase
      .from("code_submissions")
      .select("id, status, created_at, student_id, program_id")
      .order("created_at", { ascending: false })
      .limit(5);

    const combined: RecentSubmission[] = [
      ...(recentAlgos ?? []).map((a) => ({
        id: a.id,
        student_name: "Student",
        program_title: "Program",
        type: "algorithm" as const,
        status: a.status,
        created_at: a.created_at,
      })),
      ...(recentCodes ?? []).map((c) => ({
        id: c.id,
        student_name: "Student",
        program_title: "Program",
        type: "code" as const,
        status: c.status,
        created_at: c.created_at,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 8);

    setRecentSubmissions(combined);
  }

  const statCards = [
    {
      title: "Total Questions",
      value: stats.totalQuestions,
      icon: <FileQuestion className="h-5 w-5" />,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "Pending Algorithms",
      value: stats.pendingAlgorithms,
      icon: <BookCheck className="h-5 w-5" />,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      title: "Pending Code Reviews",
      value: stats.pendingCode,
      icon: <Code2 className="h-5 w-5" />,
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-950/30",
    },
    {
      title: "Approved Records",
      value: stats.approved,
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
          <p className="text-sm text-muted-foreground">
            Monitor submissions and manage your classroom
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/teacher/questions/new">
            <Plus className="h-4 w-4" />
            Add Question
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="flex items-center gap-4 p-6">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.bg} ${stat.color}`}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="group cursor-pointer transition-shadow hover:shadow-md">
          <Link href="/teacher/algorithms">
            <CardContent className="flex items-center gap-3 p-6">
              <BookCheck className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium">Review Algorithms</p>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingAlgorithms} pending
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>
        <Card className="group cursor-pointer transition-shadow hover:shadow-md">
          <Link href="/teacher/code-review">
            <CardContent className="flex items-center gap-3 p-6">
              <Code2 className="h-5 w-5 text-violet-500" />
              <div>
                <p className="text-sm font-medium">Review Code</p>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingCode} pending
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>
        <Card className="group cursor-pointer transition-shadow hover:shadow-md">
          <Link href="/teacher/questions/new">
            <CardContent className="flex items-center gap-3 p-6">
              <Plus className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">New Question</p>
                <p className="text-xs text-muted-foreground">
                  Create a new assignment
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
          <CardDescription>
            Latest algorithm and code submissions from students
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentSubmissions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No submissions yet. Create a question and wait for student
                submissions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${sub.type === "algorithm"
                          ? "bg-amber-50 text-amber-600 dark:bg-amber-950/30"
                          : "bg-violet-50 text-violet-600 dark:bg-violet-950/30"
                        }`}
                    >
                      {sub.type === "algorithm" ? (
                        <BookCheck className="h-4 w-4" />
                      ) : (
                        <Code2 className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {sub.type} Submission
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={sub.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
