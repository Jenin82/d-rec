"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Users, ArrowLeft, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuestionStore } from "@/stores/question-store";
import { Badge } from "@/components/ui/badge";

type Classroom = {
  id: string;
  name: string;
  term: string | null;
  organization_id: string | null;
};

type StudentRow = {
  id: string;
  full_name: string | null;
  email?: string;
  isPending?: boolean;
};

export default function AdminClassroomDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const classroomId = params.classroomId as string;

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [teachers, setTeachers] = useState<StudentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Invite students state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const {
    programs,
    fetchPrograms,
    isLoading: isProgramsLoading,
  } = useQuestionStore();

  const navItems = [
    { label: "Overview", href: `/${orgId}/admin` },
    { label: "Users", href: `/${orgId}/admin/users` },
    { label: "Classrooms", href: `/${orgId}/admin/classrooms` },
    { label: "Settings", href: `/${orgId}/admin/settings` },
  ];

  useEffect(() => {
    if (orgId && classroomId) {
      loadClassroom();
      loadMembers();
      fetchPrograms(classroomId);
    }
  }, [orgId, classroomId, fetchPrograms]);

  async function loadClassroom() {
    const { data } = await supabase
      .from("classrooms")
      .select("*")
      .eq("id", classroomId)
      .eq("organization_id", orgId)
      .single();

    if (data) {
      setClassroom(data);
    } else {
      router.push(`/${orgId}/admin/classrooms`);
    }
  }

  async function loadMembers() {
    setIsLoading(true);

    const { data: memberData } = await supabase
      .from("classroom_members")
      .select("user_id, role")
      .eq("classroom_id", classroomId);

    let activeStudents: StudentRow[] = [];
    let activeTeachers: StudentRow[] = [];

    if (memberData && memberData.length > 0) {
      const userIds = memberData
        .map((m: any) => m.user_id)
        .filter((id) => id !== null);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profileData) {
        memberData.forEach((m: any) => {
          const profile = profileData.find((p: any) => p.id === m.user_id);
          const row: StudentRow = {
            id: m.user_id,
            full_name: profile?.full_name || "Unknown",
            email: "Active Member",
          };
          if (m.role === "teacher") {
            activeTeachers.push(row);
          } else {
            activeStudents.push(row);
          }
        });
      }
    }

    // Fetch pending invites
    const { data: inviteData } = await supabase
      .from("classroom_invites")
      .select("id, email")
      .eq("classroom_id", classroomId);

    let pendingStudents: StudentRow[] = [];
    if (inviteData) {
      pendingStudents = inviteData.map((inv: any) => ({
        id: inv.id,
        full_name: "Pending Invite",
        email: inv.email,
        isPending: true,
      }));
    }

    setStudents([...activeStudents, ...pendingStudents]);
    setTeachers(activeTeachers);
    setIsLoading(false);
  }

  const handleInviteStudents = async () => {
    if (!inviteEmails.trim() || !classroom) return;

    setIsInviting(true);
    const emails = inviteEmails
      .split(/[\n,]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    const { data: userData } = await supabase.auth.getUser();

    const invites = emails.map((email) => ({
      classroom_id: classroom.id,
      email,
      invited_by: userData.user?.id,
    }));

    const { error } = await supabase.from("classroom_invites").insert(invites);

    if (!error) {
      toast.success("Students added to classroom.");
      setInviteEmails("");
      setIsInviteOpen(false);
      loadMembers();
    } else {
      toast.error("Failed to add students.");
    }
    setIsInviting(false);
  };

  const handleRemoveMember = async (
    userId: string,
    role: "student" | "teacher" | "admin" | "superadmin",
    isPending?: boolean,
  ) => {
    let error;
    if (isPending) {
      const { error: inviteError } = await supabase
        .from("classroom_invites")
        .delete()
        .eq("id", userId);
      error = inviteError;
    } else {
      const { error: memberError } = await supabase
        .from("classroom_members")
        .delete()
        .eq("classroom_id", classroomId)
        .eq("user_id", userId)
        .eq("role", role);
      error = memberError;
    }

    if (!error) {
      toast.success(isPending ? "Invite canceled" : "User removed");
      loadMembers();
    } else {
      toast.error("Failed to remove user");
    }
  };

  if (!classroom) return null;

  return (
    <AppShell
      title={classroom.name}
      subtitle={
        classroom.term ? `Term: ${classroom.term}` : "Classroom Details"
      }
      navItems={navItems}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/${orgId}/admin/classrooms`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Classrooms
          </Button>
        </div>
      }
    >
      <Tabs defaultValue="students" className="space-y-6">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="questions">Questions / Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Students</CardTitle>
                <CardDescription>
                  Manage the students enrolled in this classroom.
                </CardDescription>
              </div>
              <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Users className="h-4 w-4" />
                    Add Students
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Students</DialogTitle>
                    <DialogDescription>
                      Enter student email addresses separated by commas or new
                      lines.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Textarea
                      placeholder="student1@university.edu..."
                      value={inviteEmails}
                      onChange={(e) => setInviteEmails(e.target.value)}
                      className="min-h-[150px]"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsInviteOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleInviteStudents}
                      disabled={isInviting || !inviteEmails.trim()}
                    >
                      {isInviting ? "Adding..." : "Add Students"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-24 flex items-center justify-center">
                  Loading...
                </div>
              ) : students.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No students enrolled yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email/Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          {s.full_name}
                          {s.isPending && (
                            <span className="ml-2 inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-500">
                              Pending Invite
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {s.email}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() =>
                              handleRemoveMember(s.id, "student", s.isPending)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teachers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Teachers</CardTitle>
              <CardDescription>
                Teachers assigned to this classroom.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-24 flex items-center justify-center">
                  Loading...
                </div>
              ) : teachers.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No teachers assigned.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachers.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.full_name}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() =>
                              handleRemoveMember(t.id, "teacher", false)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Questions</CardTitle>
                <CardDescription>
                  Questions and assignments for this classroom.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {isProgramsLoading ? (
                <div className="h-24 flex items-center justify-center">
                  Loading...
                </div>
              ) : programs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No questions assigned to this classroom yet.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {programs.map((p) => (
                    <Card key={p.id}>
                      <CardHeader>
                        <CardTitle className="text-base">{p.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {p.description || "No description"}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
