"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Download, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuestionStore, type Program } from "@/stores/question-store";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase/client";
import { downloadSingleRecordPdf } from "@/lib/record-pdf";

type RecordData = {
  program: Program;
  classroomName: string;
  algorithm: string;
  code: string;
  language: string;
  input: string;
  output: string;
  approvedAt: string;
};

export default function RecordViewPage() {
  const params = useParams();
  const programId = params.id as string;
  const orgId = params.orgId as string;
  const { fetchProgramById } = useQuestionStore();
  const user = useAuthStore((s) => s.user);
  const [record, setRecord] = useState<RecordData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRecord = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const program = await fetchProgramById(programId);
    if (!program) {
      setIsLoading(false);
      return;
    }

    // Load approved algorithm
    const { data: algo } = await supabase
      .from("algorithm_submissions")
      .select("content")
      .eq("program_id", programId)
      .eq("student_id", user.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Load approved code
    const { data: codeSub } = await supabase
      .from("code_submissions")
      .select("code, language, output, metadata, created_at")
      .eq("program_id", programId)
      .eq("student_id", user.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: classroom } = program.classroom_id
      ? await supabase
          .from("classrooms")
          .select("name")
          .eq("id", program.classroom_id)
          .maybeSingle()
      : { data: null };

    setRecord({
      program,
      classroomName: classroom?.name ?? "Classroom",
      algorithm: algo?.content ?? "",
      code: codeSub?.code ?? "",
      language: codeSub?.language ?? "unknown",
      input:
        (codeSub?.metadata as { custom_input?: string } | null)?.custom_input ??
        "",
      output: codeSub?.output ?? "",
      approvedAt: codeSub?.created_at ?? new Date().toISOString(),
    });
    setIsLoading(false);
  }, [fetchProgramById, programId, user]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadRecord();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadRecord]);

  const handleDownloadPDF = useCallback(async () => {
    if (!record) return;

    await downloadSingleRecordPdf({
      programTitle: record.program.title,
      aim: record.program.description ?? "",
      algorithm: record.algorithm,
      code: record.code,
      language: record.language,
      input: record.input,
      output: record.output,
      createdAt: record.approvedAt,
    });
  }, [record]);

  if (isLoading) {
    return (
      <div className="flex-1 bg-[radial-gradient(ellipse_at_top,oklch(0.95_0.04_200),oklch(0.98_0.01_200))] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.2_0.04_200),oklch(0.1_0.01_200))]">
        <div className="mx-auto w-full max-w-5xl px-6 py-10 space-y-4">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="h-[600px] rounded bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex-1 bg-[radial-gradient(ellipse_at_top,oklch(0.95_0.04_200),oklch(0.98_0.01_200))] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.2_0.04_200),oklch(0.1_0.01_200))]">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-6 py-20 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">Record not found.</p>
          <Button asChild variant="outline">
            <Link href={`/${orgId}/student/records`}>Back to Records</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[radial-gradient(ellipse_at_top,oklch(0.95_0.04_200),oklch(0.98_0.01_200))] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.2_0.04_200),oklch(0.1_0.01_200))]">
      <div className="mx-auto w-full max-w-5xl px-6 py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link href={`/${orgId}/student/records`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Records
            </Link>
          </Button>

          <Button onClick={handleDownloadPDF} className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">
                  {record.program.title}
                </CardTitle>
                <CardDescription className="mt-1">
                  {record.classroomName} • {record.language.toUpperCase()}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="capitalize">
                Approved
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-6">
          {record.program.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Aim</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {record.program.description}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Algorithm</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted/50 p-4">
                <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                  {record.algorithm || "No algorithm content available."}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Source Code ({record.language.toUpperCase()})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-zinc-950 p-4 text-zinc-100">
                <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed overflow-x-auto">
                  {record.code || "No source code available."}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Input</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted p-4">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {record.input || "No custom input used."}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Output</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted p-4">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {record.output || "No output available."}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
