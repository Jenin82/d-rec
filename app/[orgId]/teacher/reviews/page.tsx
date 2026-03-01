"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { BookCheck, Code2, RefreshCw } from "lucide-react";

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

type ReviewItem = {
  key: string;
  programId: string;
  studentId: string;
  programTitle: string;
  question: string;
  studentName: string;
  classroomName: string;
  algorithmStatus: string | null;
  codeStatus: string | null;
  latestRequestedAt: string;
};

export default function TeacherReviewQueuePage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const [orgName, setOrgName] = useState("Organization");
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const signatureRef = useRef("");

  const navItems = [
    { label: "Overview", href: `/${orgId}/teacher` },
    { label: "Classrooms", href: `/${orgId}/teacher/classrooms` },
    { label: "Questions", href: `/${orgId}/teacher/questions` },
    { label: "Review Queue", href: `/${orgId}/teacher/reviews` },
  ];

  async function loadOrgDetails() {
    if (!orgId) return;
    const { data: orgData } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();

    if (orgData?.name) {
      setOrgName((prev) => (prev === orgData.name ? prev : orgData.name));
    }
  }

  async function loadReviewQueue(showLoading: boolean) {
    if (!orgId) return;
    if (showLoading) setIsLoading(true);

    const { data: classrooms } = await supabase
      .from("classrooms")
      .select("id, name")
      .eq("organization_id", orgId);

    const classroomRows = classrooms || [];
    const classroomById = new Map(
      classroomRows.map((classroom) => [classroom.id, classroom.name]),
    );
    const classroomIds = classroomRows.map((classroom) => classroom.id);

    if (classroomIds.length === 0) {
      const nextSignature = "[]";
      if (signatureRef.current !== nextSignature) {
        signatureRef.current = nextSignature;
        setReviews([]);
      }
      setLastCheckedAt(new Date());
      if (showLoading) setIsLoading(false);
      return;
    }

    const { data: programs } = await supabase
      .from("programs")
      .select("id, title, description, classroom_id")
      .in("classroom_id", classroomIds);

    const programRows = programs || [];
    const programIds = programRows.map((program) => program.id);
    const programById = new Map(programRows.map((program) => [program.id, program]));

    if (programIds.length === 0) {
      const nextSignature = "[]";
      if (signatureRef.current !== nextSignature) {
        signatureRef.current = nextSignature;
        setReviews([]);
      }
      setLastCheckedAt(new Date());
      if (showLoading) setIsLoading(false);
      return;
    }

    const [{ data: algorithmSubs }, { data: codeSubs }] = await Promise.all([
      supabase
        .from("algorithm_submissions")
        .select("id, program_id, student_id, status, created_at")
        .in("program_id", programIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("code_submissions")
        .select("id, program_id, student_id, status, created_at")
        .in("program_id", programIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

    const studentIds = Array.from(
      new Set(
        [...(algorithmSubs || []), ...(codeSubs || [])].map(
          (submission) => submission.student_id,
        ),
      ),
    );

    let profileById = new Map<string, string>();
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);

      profileById = new Map(
        (profiles || []).map((profile) => [
          profile.id,
          profile.full_name || "Student",
        ]),
      );
    }

    const reviewMap = new Map<string, ReviewItem>();

    for (const submission of algorithmSubs || []) {
      const key = `${submission.program_id}:${submission.student_id}`;
      const program = programById.get(submission.program_id);
      const current = reviewMap.get(key);
      const latestRequestedAt =
        !current ||
        new Date(submission.created_at).getTime() >
          new Date(current.latestRequestedAt).getTime()
          ? submission.created_at
          : current.latestRequestedAt;

      reviewMap.set(key, {
        key,
        programId: submission.program_id,
        studentId: submission.student_id,
        programTitle: program?.title || "Program",
        question: program?.description || "No question description",
        studentName: profileById.get(submission.student_id) || "Student",
        classroomName: program?.classroom_id
          ? classroomById.get(program.classroom_id) || "Classroom"
          : "Classroom",
        algorithmStatus: submission.status,
        codeStatus: current?.codeStatus || null,
        latestRequestedAt,
      });
    }

    for (const submission of codeSubs || []) {
      const key = `${submission.program_id}:${submission.student_id}`;
      const program = programById.get(submission.program_id);
      const current = reviewMap.get(key);
      const latestRequestedAt =
        !current ||
        new Date(submission.created_at).getTime() >
          new Date(current.latestRequestedAt).getTime()
          ? submission.created_at
          : current.latestRequestedAt;

      reviewMap.set(key, {
        key,
        programId: submission.program_id,
        studentId: submission.student_id,
        programTitle: program?.title || "Program",
        question: program?.description || "No question description",
        studentName: profileById.get(submission.student_id) || "Student",
        classroomName: program?.classroom_id
          ? classroomById.get(program.classroom_id) || "Classroom"
          : "Classroom",
        algorithmStatus: current?.algorithmStatus || null,
        codeStatus: submission.status,
        latestRequestedAt,
      });
    }

    const nextReviews = Array.from(reviewMap.values()).sort(
      (a, b) =>
        new Date(b.latestRequestedAt).getTime() -
        new Date(a.latestRequestedAt).getTime(),
    );

    const nextSignature = JSON.stringify(
      nextReviews.map((item) => ({
        key: item.key,
        algorithmStatus: item.algorithmStatus,
        codeStatus: item.codeStatus,
        latestRequestedAt: item.latestRequestedAt,
      })),
    );

    if (signatureRef.current !== nextSignature) {
      signatureRef.current = nextSignature;
      setReviews(nextReviews);
    }

    setLastCheckedAt(new Date());
    if (showLoading) setIsLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadOrgDetails();
      loadReviewQueue(true);
    }, 0);

    const intervalId = window.setInterval(() => {
      loadReviewQueue(false);
    }, 30000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [orgId]);

  return (
    <AppShell
      title="Review Queue"
      subtitle={`One queue for algorithm and code approvals in ${orgName}`}
      navItems={navItems}
      actions={
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => loadReviewQueue(true)}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Pending Reviews</h2>
          {lastCheckedAt && (
            <p className="text-xs text-muted-foreground">
              Last checked {lastCheckedAt.toLocaleTimeString()}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((index) => (
              <Card key={index} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 w-1/3 rounded bg-muted" />
                  <div className="h-4 w-2/3 rounded bg-muted" />
                </CardHeader>
                <CardContent>
                  <div className="h-10 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No pending review requests right now.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((item) => (
              <Card key={item.key} className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{item.programTitle}</CardTitle>
                      <CardDescription className="mt-1">
                        {item.studentName} • {item.classroomName}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.algorithmStatus && (
                        <div className="flex items-center gap-1">
                          <BookCheck className="h-4 w-4 text-amber-500" />
                          <StatusBadge status={item.algorithmStatus} />
                        </div>
                      )}
                      {item.codeStatus && (
                        <div className="flex items-center gap-1">
                          <Code2 className="h-4 w-4 text-violet-500" />
                          <StatusBadge status={item.codeStatus} />
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {item.question}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Requested {new Date(item.latestRequestedAt).toLocaleString()}
                    </p>
                    <Button asChild size="sm">
                      <Link
                        href={`/${orgId}/teacher/reviews/${item.programId}/${item.studentId}`}
                      >
                        Open Review
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
