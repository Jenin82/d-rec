"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  FileText,
  Eye,
  CheckCircle2,
  Download,
  BookOpenCheck,
} from "lucide-react";
import { useParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase/client";
import { downloadFullRecordPdf, type RecordPdfData } from "@/lib/record-pdf";

type ApprovedRecord = {
  id: string;
  program_id: string;
  program_title: string;
  language: string | null;
  created_at: string;
};

type FullRecordData = ApprovedRecord & {
  classroom_name: string;
  aim: string;
  algorithm: string;
  code: string;
  input: string;
  output: string;
};

export default function RecordsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const user = useAuthStore((s) => s.user);
  const [records, setRecords] = useState<ApprovedRecord[]>([]);
  const [fullRecords, setFullRecords] = useState<FullRecordData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingFull, setIsDownloadingFull] = useState(false);

  const navItems = [
    { label: "Dashboard", href: `/${orgId}/student` },
    { label: "My Classrooms", href: `/${orgId}/student/classrooms` },
    { label: "Record Book", href: `/${orgId}/student/records` },
  ];

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    const { data: codeSubs } = await supabase
      .from("code_submissions")
      .select("id, program_id, code, language, output, metadata, created_at")
      .eq("student_id", user!.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (codeSubs) {
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
              .eq("student_id", user!.id)
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
              (cs.metadata as { custom_input?: string } | null)?.custom_input ??
              "",
            output: cs.output ?? "",
          };
        }),
      );

      setFullRecords(enrichedRecords);
      setRecords(
        enrichedRecords.map((record) => ({
          id: record.id,
          program_id: record.program_id,
          program_title: record.program_title,
          language: record.language,
          created_at: record.created_at,
        })),
      );
    } else {
      setFullRecords([]);
      setRecords([]);
    }
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

  const getFullRecordHeading = () => {
    const uniqueClassrooms = Array.from(
      new Set(fullRecords.map((record) => record.classroom_name)),
    );

    return uniqueClassrooms.length === 1
      ? uniqueClassrooms[0]
      : "All Classrooms";
  };

  const handleDownloadFullRecord = async () => {
    if (fullRecords.length === 0) {
      return;
    }

    setIsDownloadingFull(true);
    const recordsForPdf: RecordPdfData[] = fullRecords.map((record) => ({
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
      classroomName: getFullRecordHeading(),
      records: recordsForPdf,
      filePrefix: "record-book",
    });
    setIsDownloadingFull(false);
  };

  return (
    <AppShell
      title="Record Book"
      subtitle="View and manage your approved digital records ready for printing."
      navItems={navItems}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpenCheck className="h-5 w-5 text-primary" />
            Full Record Book
          </CardTitle>
          <CardDescription>
            Preview all solved programs in one place and download a single PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href={`/${orgId}/student/records/full`}>
              Preview Full Record
            </Link>
          </Button>

          <Button
            className="gap-2"
            onClick={handleDownloadFullRecord}
            disabled={isDownloadingFull || fullRecords.length === 0}
          >
            <Download className="h-4 w-4" />
            {isDownloadingFull ? "Preparing..." : "Download Full PDF"}
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-28">
                <div className="h-6 w-2/3 rounded bg-muted mb-2" />
                <div className="h-4 w-1/3 rounded bg-muted" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : records.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Records Available</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              You do not have any approved records yet. Complete your program
              submissions and get them approved by your teacher to generate
              records.
            </p>
            <Button asChild className="gap-2">
              <Link href={`/${orgId}/student/classrooms`}>
                View My Classrooms
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {records.map((record) => (
            <Card
              key={record.id}
              className="group flex flex-col justify-between overflow-hidden transition-all hover:border-primary/50 hover:shadow-md"
            >
              <CardHeader>
                <div className="mb-2 flex items-center justify-between">
                  <div className="rounded-lg bg-emerald-500/10 p-2.5">
                    <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                  </div>
                  <Badge
                    variant="outline"
                    className="gap-1 border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Approved
                  </Badge>
                </div>
                <CardTitle className="line-clamp-1 text-lg">
                  {record.program_title}
                </CardTitle>
                <CardDescription className="flex items-center justify-between mt-2">
                  <span>
                    Approved: {new Date(record.created_at).toLocaleDateString()}
                  </span>
                  {record.language && (
                    <Badge variant="secondary" className="capitalize text-xs">
                      {record.language}
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>

              <div className="flex-1" />

              <div className="border-t bg-muted/20 p-4">
                <Button asChild className="w-full gap-2" variant="default">
                  <Link href={`/${orgId}/student/records/${record.program_id}`}>
                    <Eye className="h-4 w-4" />
                    View Record Document
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
