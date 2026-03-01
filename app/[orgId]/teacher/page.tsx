"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  FileQuestion,
  BookCheck,
  Code2,
  CheckCircle2,
  Clock,
  Plus,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
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

type SubmissionRow = {
  id: string;
  status: string;
  created_at: string;
  student_id: string;
  program_id: string;
};

export default function TeacherDashboard() {
  const routeParams = useParams();
  const orgId = routeParams.orgId as string;
  const [stats, setStats] = useState<Stats>({
    totalQuestions: 0,
    pendingAlgorithms: 0,
    pendingCode: 0,
    approved: 0,
  });
  const [recentSubmissions, setRecentSubmissions] = useState<
    RecentSubmission[]
  >([]);
  const [orgName, setOrgName] = useState("Organization");

  const navItems = [
    { label: "Overview", href: `/${orgId}/teacher` },
    { label: "Classrooms", href: `/${orgId}/teacher/classrooms` },
    { label: "Questions", href: `/${orgId}/teacher/questions` },
    { label: "Review Queue", href: `/${orgId}/teacher/reviews` },
  ];

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadDashboardData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function loadDashboardData() {
    // Load Org Name
    const { data: orgData } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();
    if (orgData) setOrgName(orgData.name);

    const { data: classrooms } = await supabase
      .from("classrooms")
      .select("id")
      .eq("organization_id", orgId);

    const classroomIds = (classrooms || []).map((classroom) => classroom.id);
    if (classroomIds.length === 0) {
      setStats({
        totalQuestions: 0,
        pendingAlgorithms: 0,
        pendingCode: 0,
        approved: 0,
      });
      setRecentSubmissions([]);
      return;
    }

    const { data: programs } = await supabase
      .from("programs")
      .select("id, title")
      .in("classroom_id", classroomIds);

    const programRows = programs || [];
    const programIds = programRows.map((program) => program.id);
    const programTitleById = new Map(
      programRows.map((program) => [program.id, program.title]),
    );

    if (programIds.length === 0) {
      setStats({
        totalQuestions: 0,
        pendingAlgorithms: 0,
        pendingCode: 0,
        approved: 0,
      });
      setRecentSubmissions([]);
      return;
    }

    const [algoRes, codeRes, approvedRes, recentAlgoRes, recentCodeRes] =
      await Promise.all([
        supabase
          .from("algorithm_submissions")
          .select("id", { count: "exact", head: true })
          .in("program_id", programIds)
          .eq("status", "pending"),
        supabase
          .from("code_submissions")
          .select("id", { count: "exact", head: true })
          .in("program_id", programIds)
          .eq("status", "pending"),
        supabase
          .from("code_submissions")
          .select("id", { count: "exact", head: true })
          .in("program_id", programIds)
          .eq("status", "approved"),
        supabase
          .from("algorithm_submissions")
          .select("id, status, created_at, student_id, program_id")
          .in("program_id", programIds)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("code_submissions")
          .select("id, status, created_at, student_id, program_id")
          .in("program_id", programIds)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

    setStats({
      totalQuestions: programIds.length,
      pendingAlgorithms: algoRes.count ?? 0,
      pendingCode: codeRes.count ?? 0,
      approved: approvedRes.count ?? 0,
    });

    const recentAlgos = recentAlgoRes.data;
    const recentCodes = recentCodeRes.data;

    const studentIds = Array.from(
      new Set(
        [...(recentAlgos || []), ...(recentCodes || [])].map(
          (submission) => submission.student_id,
        ),
      ),
    );

    let studentNameById = new Map<string, string>();
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);

      studentNameById = new Map(
        (profiles || []).map((profile) => [
          profile.id,
          profile.full_name || "Student",
        ]),
      );
    }

    const combined: RecentSubmission[] = [
      ...(recentAlgos ?? []).map((a: SubmissionRow) => ({
        id: a.id,
        student_name: studentNameById.get(a.student_id) || "Student",
        program_title: programTitleById.get(a.program_id) || "Program",
        type: "algorithm" as const,
        status: a.status,
        created_at: a.created_at,
      })),
      ...(recentCodes ?? []).map((c: SubmissionRow) => ({
        id: c.id,
        student_name: studentNameById.get(c.student_id) || "Student",
        program_title: programTitleById.get(c.program_id) || "Program",
        type: "code" as const,
        status: c.status,
        created_at: c.created_at,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
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
    <AppShell
      title={`Teacher Dashboard - ${orgName}`}
      subtitle="Monitor submissions and manage your classroom."
      navItems={navItems}
    >
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
            <Link href={`/${orgId}/teacher/questions/new`}>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="group cursor-pointer transition-shadow hover:shadow-md">
            <Link href={`/${orgId}/teacher/reviews`}>
              <CardContent className="flex items-center gap-3 p-6">
                <BookCheck className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">Review Queue</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.pendingAlgorithms + stats.pendingCode} pending
                  </p>
                </div>
              </CardContent>
            </Link>
          </Card>
          <Card className="group cursor-pointer transition-shadow hover:shadow-md">
            <Link href={`/${orgId}/teacher/questions/new`}>
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
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          sub.type === "algorithm"
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
                        <p className="text-sm font-medium">
                          {sub.program_title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sub.student_name} •{" "}
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
    </AppShell>
  );
}
