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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";

type Program = {
  id: string;
  title: string;
  description: string | null;
  status: string;
};

export default function StudentClassroomProgramsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const classroomId = params.id as string;

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
      const { data, error } = await supabase
        .from("programs")
        .select("id, title, description, status")
        .eq("classroom_id", classroomId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPrograms(data);
      }

      setIsLoading(false);
    }

    loadData();
  }, [classroomId]);

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
                <Badge
                  variant={
                    program.status === "active" ? "default" : "secondary"
                  }
                  className="shrink-0"
                >
                  {program.status}
                </Badge>
              </CardHeader>
              <CardContent>
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
