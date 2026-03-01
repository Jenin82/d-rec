"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen } from "lucide-react";

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
import { useAuthStore } from "@/stores/auth-store";

type Program = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  studentStatus: string;
  rejectionReason: string | null;
};

export default function StudentClassroomProgramsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const classroomId = params.id as string;
  const user = useAuthStore((state) => state.user);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [classroomName, setClassroomName] = useState("Classroom");
  const [isLoading, setIsLoading] = useState(true);

  const navItems = [
    { label: "Dashboard", href: `/${orgId}/student` },
    { label: "My Classrooms", href: `/${orgId}/student/classrooms` },
  ];

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);

      // Load classroom name
      const { data: classroomData } = await supabase
        .from("classrooms")
        .select("name")
        .eq("id", classroomId)
        .single();

      if (classroomData) setClassroomName(classroomData.name);

      // Load programs for this classroom
      const { data: programData, error } = await supabase
        .from("programs")
        .select("id, title, description, status")
        .eq("classroom_id", classroomId)
        .order("created_at", { ascending: false });

      if (!error && programData) {
        if (!user?.id) {
          setPrograms(
            programData.map((program) => ({
              ...program,
              studentStatus: "pending",
              rejectionReason: null,
            })),
          );
          setIsLoading(false);
          return;
        }

        const programIds = programData.map((program) => program.id);

        const [{ data: algorithmSubs }, { data: codeSubs }] = await Promise.all(
          [
            supabase
              .from("algorithm_submissions")
              .select("program_id, status, feedback, created_at")
              .eq("student_id", user.id)
              .in("program_id", programIds)
              .order("created_at", { ascending: false }),
            supabase
              .from("code_submissions")
              .select("program_id, status, metadata, created_at")
              .eq("student_id", user.id)
              .in("program_id", programIds)
              .order("created_at", { ascending: false }),
          ],
        );

        const latestAlgorithmByProgram = new Map<
          string,
          {
            status: string;
            feedback: string | null;
          }
        >();
        (algorithmSubs || []).forEach((submission) => {
          if (!latestAlgorithmByProgram.has(submission.program_id)) {
            latestAlgorithmByProgram.set(submission.program_id, {
              status: submission.status,
              feedback: submission.feedback,
            });
          }
        });

        const latestCodeByProgram = new Map<
          string,
          {
            status: string;
            metadata: unknown;
          }
        >();
        (codeSubs || []).forEach((submission) => {
          if (!latestCodeByProgram.has(submission.program_id)) {
            latestCodeByProgram.set(submission.program_id, {
              status: submission.status,
              metadata: submission.metadata,
            });
          }
        });

        const mappedPrograms: Program[] = programData.map((program) => {
          const algorithmSubmission = latestAlgorithmByProgram.get(program.id);
          const codeSubmission = latestCodeByProgram.get(program.id);

          if (codeSubmission?.status === "approved") {
            return {
              ...program,
              studentStatus: "completed",
              rejectionReason: null,
            };
          }

          if (codeSubmission?.status === "rejected") {
            const codeFeedback =
              (codeSubmission.metadata as { feedback?: string } | null)
                ?.feedback || null;
            return {
              ...program,
              studentStatus: "rejected",
              rejectionReason: codeFeedback,
            };
          }

          if (codeSubmission?.status === "pending") {
            return {
              ...program,
              studentStatus: "submitted",
              rejectionReason: null,
            };
          }

          if (algorithmSubmission?.status === "rejected") {
            return {
              ...program,
              studentStatus: "rejected",
              rejectionReason: algorithmSubmission.feedback,
            };
          }

          return {
            ...program,
            studentStatus: "pending",
            rejectionReason: null,
          };
        });

        setPrograms(mappedPrograms);
      }

      setIsLoading(false);
    }

    loadData();
  }, [classroomId, user?.id]);

  return (
    <AppShell
      title={classroomName}
      subtitle="Browse and open the programs assigned to this classroom."
      navItems={navItems}
    >
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : programs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 opacity-40" />
          <p className="font-medium">No programs yet</p>
          <p className="text-sm">
            Your teacher hasn&apos;t posted any programs in this classroom yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {programs.map((program) => (
            <Card key={program.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="leading-snug">
                    {program.title}
                  </CardTitle>
                  {program.description && (
                    <CardDescription className="mt-1 line-clamp-2">
                      {program.description}
                    </CardDescription>
                  )}
                </div>
                <StatusBadge
                  status={program.studentStatus}
                  className="shrink-0"
                />
              </CardHeader>
              <CardContent>
                {program.rejectionReason && (
                  <p className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                    Rejection reason: {program.rejectionReason}
                  </p>
                )}
                <Button asChild size="sm" className="w-fit">
                  <Link
                    href={`/${orgId}/student/classrooms/${classroomId}/programs/${program.id}`}
                  >
                    Open Workspace
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
