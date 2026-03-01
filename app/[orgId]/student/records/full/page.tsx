"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase/client";
import { downloadFullRecordPdf, type RecordPdfData } from "@/lib/record-pdf";

type FullRecordData = {
  id: string;
  program_id: string;
  program_title: string;
  language: string | null;
  created_at: string;
  classroom_name: string;
  aim: string;
  algorithm: string;
  code: string;
  input: string;
  output: string;
};

export default function FullRecordPreviewPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const user = useAuthStore((s) => s.user);

  const [records, setRecords] = useState<FullRecordData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const loadRecords = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    const { data: codeSubs } = await supabase
      .from("code_submissions")
      .select("id, program_id, code, language, output, metadata, created_at")
      .eq("student_id", user.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (!codeSubs) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    const enrichedRecords: FullRecordData[] = await Promise.all(
      codeSubs.map(async (cs) => {
        const [{ data: prog }, { data: algo }] = await Promise.all([
          supabase
            .from("programs")
            .select("title, description, classroom_id")
            .eq("id", cs.program_id)
            .single(),
          supabase
            .from("algorithm_submissions")
            .select("content")
            .eq("program_id", cs.program_id)
            .eq("student_id", user.id)
            .eq("status", "approved")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const { data: classroom } = prog?.classroom_id
          ? await supabase
              .from("classrooms")
              .select("name")
              .eq("id", prog.classroom_id)
              .maybeSingle()
          : { data: null };

        return {
          id: cs.id,
          program_id: cs.program_id,
          program_title: prog?.title ?? "Unknown",
          language: cs.language,
          created_at: cs.created_at,
          classroom_name: classroom?.name ?? "Classroom",
          aim: prog?.description ?? "",
          algorithm: algo?.content ?? "",
          code: cs.code ?? "",
          input:
            (cs.metadata as { custom_input?: string } | null)?.custom_input ?? "",
          output: cs.output ?? "",
        };
      }),
    );

    setRecords(enrichedRecords);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      const timerId = window.setTimeout(() => {
        void loadRecords();
      }, 0);

      return () => {
        window.clearTimeout(timerId);
      };
    }
  }, [loadRecords, user]);

  const getHeading = () => {
    const uniqueClassrooms = Array.from(
      new Set(records.map((record) => record.classroom_name)),
    );

    return uniqueClassrooms.length === 1
      ? uniqueClassrooms[0]
      : "All Classrooms";
  };

  const handleDownload = async () => {
    if (records.length === 0) return;

    setIsDownloading(true);
    const recordsForPdf: RecordPdfData[] = records.map((record) => ({
      programTitle: record.program_title,
      aim: record.aim,
      algorithm: record.algorithm,
      code: record.code,
      language: record.language ?? "unknown",
      input: record.input,
      output: record.output,
      createdAt: record.created_at,
    }));

    await downloadFullRecordPdf({
      classroomName: getHeading(),
      records: recordsForPdf,
      filePrefix: "record-book",
    });
    setIsDownloading(false);
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-[radial-gradient(ellipse_at_top,oklch(0.95_0.04_200),oklch(0.98_0.01_200))] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.2_0.04_200),oklch(0.1_0.01_200))]">
        <div className="mx-auto w-full max-w-6xl px-6 py-10 space-y-4">
          <div className="h-8 w-64 rounded bg-muted animate-pulse" />
          <div className="h-40 rounded bg-muted animate-pulse" />
          <div className="h-40 rounded bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[radial-gradient(ellipse_at_top,oklch(0.95_0.04_200),oklch(0.98_0.01_200))] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.2_0.04_200),oklch(0.1_0.01_200))]">
      <div className="mx-auto w-full max-w-6xl px-6 py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link href={`/${orgId}/student/records`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Record Book
            </Link>
          </Button>

          <Button
            className="gap-2"
            onClick={handleDownload}
            disabled={isDownloading || records.length === 0}
          >
            <Download className="h-4 w-4" />
            {isDownloading ? "Preparing..." : "Download Full PDF"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{getHeading()}</CardTitle>
            <CardDescription>
              Full Record Preview with aim, algorithm, code, input, and output.
            </CardDescription>
          </CardHeader>
        </Card>

        {records.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Records Available</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                No approved records found to preview.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {records.map((record) => (
              <Card key={record.id}>
                <CardHeader>
                  <CardTitle>{record.program_title}</CardTitle>
                  <CardDescription>
                    {record.classroom_name} • {record.language?.toUpperCase()} •{" "}
                    {new Date(record.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <h4 className="font-medium mb-2">Aim</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {record.aim || "-"}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Algorithm</h4>
                    <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-xs leading-relaxed">
                      {record.algorithm || "-"}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">
                      Source Code ({record.language?.toUpperCase() ?? "UNKNOWN"})
                    </h4>
                    <pre className="whitespace-pre-wrap rounded-md bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100 overflow-x-auto">
                      {record.code || "-"}
                    </pre>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-medium mb-2">Input</h4>
                      <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-xs leading-relaxed">
                        {record.input || "No custom input used."}
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Output</h4>
                      <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-xs leading-relaxed">
                        {record.output || "No output available."}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
