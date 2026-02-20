"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Printer, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useQuestionStore, type Program } from "@/stores/question-store";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase/client";

type RecordData = {
    program: Program;
    algorithm: string;
    code: string;
    language: string;
    output: string;
};

export default function RecordViewPage() {
    const params = useParams();
    const programId = params.id as string;
    const { fetchProgramById } = useQuestionStore();
    const user = useAuthStore((s) => s.user);
    const [record, setRecord] = useState<RecordData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadRecord();
    }, [programId]);

    async function loadRecord() {
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
            .select("code, language, output")
            .eq("program_id", programId)
            .eq("student_id", user.id)
            .eq("status", "approved")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        setRecord({
            program,
            algorithm: algo?.content ?? "",
            code: codeSub?.code ?? "",
            language: codeSub?.language ?? "unknown",
            output: codeSub?.output ?? "",
        });
        setIsLoading(false);
    }

    const handlePrintPDF = useCallback(async () => {
        if (!record) return;

        const { default: jsPDF } = await import("jspdf");
        const doc = new jsPDF();
        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const lineWidth = pageWidth - margin * 2;
        let y = margin;

        // Title
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("Digital Record", pageWidth / 2, y, { align: "center" });
        y += 12;

        // Program title
        doc.setFontSize(14);
        doc.text(record.program.title, pageWidth / 2, y, { align: "center" });
        y += 8;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(
            `Language: ${record.language.toUpperCase()} | Date: ${new Date().toLocaleDateString()}`,
            pageWidth / 2,
            y,
            { align: "center" }
        );
        y += 12;

        // Line
        doc.setDrawColor(200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        // Description
        if (record.program.description) {
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Problem Description", margin, y);
            y += 7;
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            const descLines = doc.splitTextToSize(record.program.description, lineWidth);
            doc.text(descLines, margin, y);
            y += descLines.length * 5 + 8;
        }

        // Algorithm
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Algorithm", margin, y);
        y += 7;
        doc.setFontSize(9);
        doc.setFont("courier", "normal");
        const algoLines = doc.splitTextToSize(record.algorithm, lineWidth);
        for (const line of algoLines) {
            if (y > 270) {
                doc.addPage();
                y = margin;
            }
            doc.text(line, margin, y);
            y += 4.5;
        }
        y += 8;

        // Code
        if (y > 250) {
            doc.addPage();
            y = margin;
        }
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(`Source Code (${record.language.toUpperCase()})`, margin, y);
        y += 7;
        doc.setFontSize(9);
        doc.setFont("courier", "normal");
        const codeLines = doc.splitTextToSize(record.code, lineWidth);
        for (const line of codeLines) {
            if (y > 270) {
                doc.addPage();
                y = margin;
            }
            doc.text(line, margin, y);
            y += 4.5;
        }
        y += 8;

        // Output
        if (record.output) {
            if (y > 250) {
                doc.addPage();
                y = margin;
            }
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.text("Output", margin, y);
            y += 7;
            doc.setFontSize(9);
            doc.setFont("courier", "normal");
            const outLines = doc.splitTextToSize(record.output, lineWidth);
            for (const line of outLines) {
                if (y > 270) {
                    doc.addPage();
                    y = margin;
                }
                doc.text(line, margin, y);
                y += 4.5;
            }
        }

        doc.save(`digital-record-${record.program.title.replace(/\s+/g, "-").toLowerCase()}.pdf`);
    }, [record]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 rounded bg-muted animate-pulse" />
                <div className="h-[600px] rounded bg-muted animate-pulse" />
            </div>
        );
    }

    if (!record) {
        return (
            <div className="flex flex-col items-center gap-4 py-12">
                <p className="text-muted-foreground">Record not found.</p>
                <Button asChild variant="outline">
                    <Link href="/student/records">Back to Records</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/student/records">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">
                            {record.program.title}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Digital Record • {record.language.toUpperCase()}
                        </p>
                    </div>
                </div>
                <Button onClick={handlePrintPDF} className="gap-2">
                    <Download className="h-4 w-4" />
                    Download PDF
                </Button>
            </div>

            {/* Record content */}
            <div className="space-y-6 print:space-y-4" id="record-content">
                {/* Description */}
                {record.program.description && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Problem Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                {record.program.description}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Algorithm */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Algorithm</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg bg-muted/50 p-4">
                            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                                {record.algorithm}
                            </pre>
                        </div>
                    </CardContent>
                </Card>

                {/* Code */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Source Code ({record.language.toUpperCase()})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg bg-zinc-950 p-4 text-zinc-100">
                            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed overflow-x-auto">
                                {record.code}
                            </pre>
                        </div>
                    </CardContent>
                </Card>

                {/* Output */}
                {record.output && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Output</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-lg bg-muted p-4">
                                <pre className="whitespace-pre-wrap text-sm font-mono">
                                    {record.output}
                                </pre>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
