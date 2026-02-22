"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";

type Teacher = {
  id: string;
  full_name: string | null;
  email?: string;
};

export default function AdminTeachersPage() {
  const paramsBase = useParams();
  const orgId = paramsBase.orgId as string;

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [bulkEmails, setBulkEmails] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const navItems = [
    { label: "Overview", href: `/${orgId}/admin` },
    { label: "Teachers", href: `/${orgId}/admin/teachers` },
    { label: "Settings", href: `/${orgId}/admin/settings` },
  ];

  useEffect(() => {
    if (orgId) {
      loadTeachers(orgId);
    }
  }, [orgId]);

  async function loadTeachers(orgId: string) {
    setIsLoading(true);

    const { data: memberData } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", orgId)
      .eq("role", "teacher");

    if (!memberData || memberData.length === 0) {
      setTeachers([]);
      setIsLoading(false);
      return;
    }

    const userIds = memberData
      .map((m: any) => m.user_id)
      .filter((id: any): id is string => id !== null);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (profileData) {
      setTeachers(
        profileData.map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          email: "No email access",
        })),
      );
    }

    setIsLoading(false);
  }

  const handleAddTeachers = async () => {
    if (!orgId || !bulkEmails.trim()) return;

    setIsInviting(true);
    const emails = bulkEmails
      .split(/[\n,]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    const { data: userData } = await supabase.auth.getUser();

    const invites = emails.map((email) => ({
      organization_id: orgId,
      email,
      role: "teacher" as const,
      invited_by: userData.user?.id,
    }));

    const { error } = await supabase.from("org_invites").insert(invites);

    if (!error) {
      toast.success(`${emails.length} teacher invite(s) sent successfully.`);
      setBulkEmails("");
      setIsDialogOpen(false);
    } else {
      console.error("Failed to invite teachers:", error);
      toast.error("Failed to send invites. They may already be invited.");
    }
    setIsInviting(false);
  };

  const handleRemoveTeacher = async (teacherId: string) => {
    if (!orgId) return;

    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("organization_id", orgId)
      .eq("user_id", teacherId);

    if (!error) {
      setTeachers(teachers.filter((t) => t.id !== teacherId));
      toast.success("Teacher removed.");
    } else {
      toast.error("Failed to remove teacher.");
    }
  };

  return (
    <AppShell
      title="Manage Teachers"
      subtitle="Add or remove instructors for your organization."
      navItems={navItems}
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Teachers
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Teachers</DialogTitle>
              <DialogDescription>
                Enter teacher email addresses separated by commas or new lines.
                They will automatically get access when they sign up.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Textarea
                  placeholder="teacher1@university.edu, teacher2@university.edu"
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  className="min-h-[150px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleAddTeachers}
                disabled={isInviting || !bulkEmails.trim()}
              >
                {isInviting ? "Sending..." : "Send Invites"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization Teachers</CardTitle>
            <CardDescription>
              A list of all teachers currently assigned to this organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
              </div>
            ) : teachers.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                No teachers found in this organization.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">
                        {teacher.full_name || "Unknown"}
                      </TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveTeacher(teacher.id)}
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
      </div>
    </AppShell>
  );
}
