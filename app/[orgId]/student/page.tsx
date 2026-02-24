"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpen, Sparkles, GraduationCap } from "lucide-react";

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
import { useAuthStore } from "@/stores/auth-store";

type Classroom = {
  id: string;
  name: string;
  term: string | null;
};

export default function StudentClassroomsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const user = useAuthStore((s) => s.user);

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const navItems = [
    { label: "My Classrooms", href: `/${orgId}/student` },
    { label: "Progress", href: `/${orgId}/student/progress` },
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
      title={`Welcome back, ${user?.user_metadata?.full_name || "Student"}!`}
      subtitle="Jump back into programs, algorithms, and your digital records."
      navItems={navItems}
    >
      {/* Hero Welcome Banner */}
      <section className="relative overflow-hidden rounded-xl border bg-card mb-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.95_0.04_200),transparent_50%)] dark:bg-[radial-gradient(ellipse_at_top_right,oklch(0.3_0.05_200),transparent_50%)] opacity-50" />
        <div className="relative flex flex-col items-start gap-4 p-8 md:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background/50 backdrop-blur-sm px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <Sparkles className="h-3 w-3 text-primary" />
            <span>Ready to code?</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
            Your Digital Record Book
          </h2>
          <p className="max-w-2xl text-base text-muted-foreground">
            Select a classroom below to work on assignments, submit your
            algorithms, and compile your verified digital records.
          </p>
        </div>
      </section>

      {/* Classrooms Grid */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          My Enrolled Classrooms
        </h3>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 w-1/2 rounded bg-muted mb-2" />
                  <div className="h-4 w-1/3 rounded bg-muted" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-1/3 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : classrooms.length === 0 ? (
          <Card className="flex flex-col items-center justify-center gap-4 border-dashed p-12 text-center text-muted-foreground">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">
                No classrooms yet
              </p>
              <p className="mt-1">
                You haven&apos;t been added to any classrooms in this
                organization.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {classrooms.map((classroom) => (
              <Card
                key={classroom.id}
                className="group transition-all hover:shadow-lg hover:border-primary/50 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full transition-opacity opacity-0 group-hover:opacity-100" />
                <CardHeader>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {classroom.name}
                  </CardTitle>
                  {classroom.term && (
                    <CardDescription>{classroom.term}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button
                    asChild
                    className="w-full sm:w-auto shadow-sm transition-all group-hover:shadow-md"
                  >
                    <Link
                      href={`/${orgId}/student/classrooms/${classroom.id}/programs`}
                    >
                      Enter Classroom
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
