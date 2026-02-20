"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase/client";

type ApprovedRecord = {
    id: string;
    program_id: string;
    program_title: string;
    language: string | null;
    created_at: string;
};

export default function RecordsPage() {
    const user = useAuthStore((s) => s.user);
    const [records, setRecords] = useState<ApprovedRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) loadRecords();
    }, [user]);

    async function loadRecords() {
        setIsLoading(true);
        const { data: codeSubs } = await supabase
            .from("code_submissions")
            .select("id, program_id, language, created_at")
            .eq("student_id", user!.id)
            .eq("status", "approved")
            .order("created_at", { ascending: false });

        if (codeSubs) {
            const withTitles: ApprovedRecord[] = await Promise.all(
                codeSubs.map(async (cs) => {
                    const { data: prog } = await supabase
                        .from("programs")
                        .select("title")
                        .eq("id", cs.program_id)
                        .single();

                    return {
                        ...cs,
                        program_title: prog?.title ?? "Unknown",
                    };
                })
            );
            setRecords(withTitles);
        }
        setIsLoading(false);
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">My Records</h2>
                <p className="text-sm text-muted-foreground">
                    View and print your approved digital records
                </p>
            </div>

            {isLoading ? (
                <div className="grid gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                                <div className="h-5 w-2/3 rounded bg-muted mb-2" />
                                <div className="h-4 w-1/3 rounded bg-muted" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : records.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center gap-3 py-12">
                        <FileText className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">
                            No approved records yet. Complete your submissions and get
                            teacher approval.
                        </p>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/student">Go to Dashboard</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {records.map((record) => (
                        <Card
                            key={record.id}
                            className="transition-shadow hover:shadow-md"
                        >
                            <CardContent className="flex items-center justify-between p-6">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium">{record.program_title}</h4>
                                        <p className="text-xs text-muted-foreground">
                                            Approved {new Date(record.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {record.language && (
                                        <Badge variant="secondary" className="capitalize">
                                            {record.language}
                                        </Badge>
                                    )}
                                    <Button asChild size="sm" className="gap-2">
                                        <Link href={`/student/records/${record.program_id}`}>
                                            <Eye className="h-4 w-4" />
                                            View Record
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
