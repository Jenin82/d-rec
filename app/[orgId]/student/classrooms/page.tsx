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
import { supabase } from "@/lib/supabase/client";

type Classroom = {
  id: string;
  name: string;
  term: string | null;
};

export default function StudentClassroomsPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const navItems = [
    { label: "Dashboard", href: `/${orgId}/student` },
    { label: "My Classrooms", href: `/${orgId}/student/classrooms` },
  ];

  useEffect(() => {
    async function loadClassrooms() {
      setIsLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setIsLoading(false);
        return;
      }

      // Get classrooms where the student is a member
      const { data, error } = await supabase
        .from("classroom_members")
        .select("classroom_id, classrooms(id, name, term)")
        .eq("user_id", userData.user.id);

      if (error) {
        console.error("Error loading classrooms:", error);
        setIsLoading(false);
        return;
      }

      const mapped = (data ?? [])
        .map((row: any) => row.classrooms)
        .filter(Boolean) as Classroom[];

      setClassrooms(mapped);
      setIsLoading(false);
    }

    loadClassrooms();
  }, []);

  return (
    <AppShell
      title="My Classrooms"
      subtitle="Jump back into programs, algorithms, and coding workspaces."
      navItems={navItems}
    >
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : classrooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 opacity-40" />
          <p className="font-medium">No classrooms yet</p>
          <p className="text-sm">
            You haven&apos;t been added to any classrooms in this organization.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {classrooms.map((classroom) => (
            <Card key={classroom.id}>
              <CardHeader>
                <CardTitle>{classroom.name}</CardTitle>
                {classroom.term && (
                  <CardDescription>{classroom.term}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Button asChild size="sm" className="w-fit">
                  <Link
                    href={`/${orgId}/student/classrooms/${classroom.id}/programs`}
                  >
                    View Programs
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
