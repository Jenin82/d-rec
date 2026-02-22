"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { UserRound } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";

type Student = {
  id: string;
  full_name: string | null;
  email?: string;
  joined_at: string;
};

export default function AdminStudentsPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const navItems = [
    { label: "Overview", href: `/${orgId}/admin` },
    { label: "Teachers", href: `/${orgId}/admin/teachers` },
    { label: "Classrooms", href: `/${orgId}/admin/classrooms` },
    { label: "Students", href: `/${orgId}/admin/students` },
    { label: "Settings", href: `/${orgId}/admin/settings` },
  ];

  useEffect(() => {
    async function loadStudents() {
      setIsLoading(true);

      const { data: memberData } = await supabase
        .from("organization_members")
        .select("user_id, created_at")
        .eq("organization_id", orgId)
        .eq("role", "student");

      if (!memberData || memberData.length === 0) {
        setStudents([]);
        setIsLoading(false);
        return;
      }

      const userIds = memberData
        .map((m: any) => m.user_id)
        .filter((id: any): id is string => id !== null);

      const joinedAtMap: Record<string, string> = {};
      memberData.forEach((m: any) => {
        if (m.user_id) joinedAtMap[m.user_id] = m.created_at;
      });

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      setStudents(
        (profileData ?? []).map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          joined_at: joinedAtMap[p.id] ?? "",
        })),
      );

      setIsLoading(false);
    }

    loadStudents();
  }, [orgId]);

  return (
    <AppShell
      title="Student Management"
      subtitle="View all students enrolled in this organization."
      navItems={navItems}
    >
      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
          <CardDescription>
            Students who have joined this organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <UserRound className="h-8 w-8 opacity-40" />
              <p>No students found in this organization yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.full_name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Student</Badge>
                    </TableCell>
                    <TableCell>
                      {s.joined_at
                        ? new Date(s.joined_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
