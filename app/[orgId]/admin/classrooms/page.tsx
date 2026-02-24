"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Users2, Users, ChevronRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { supabase } from "@/lib/supabase/client";
import { Textarea } from "@/components/ui/textarea";

type Classroom = {
  id: string;
  name: string;
  term: string | null;
  created_at: string;
};

type Teacher = {
  user_id: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
};

export default function AdminClassroomsPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTerm, setNewTerm] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("none");

  // Invite students state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(
    null,
  );
  const [inviteEmails, setInviteEmails] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const navItems = [
    { label: "Overview", href: `/${orgId}/admin` },
    { label: "Users", href: `/${orgId}/admin/users` },
    { label: "Classrooms", href: `/${orgId}/admin/classrooms` },
    { label: "Settings", href: `/${orgId}/admin/settings` },
  ];

  useEffect(() => {
    if (orgId) {
      loadClassrooms();
      loadTeachers();
    }
  }, [orgId]);

  async function loadTeachers() {
    const { data, error } = await supabase
      .from("organization_members")
      .select("user_id, profiles(full_name)")
      .eq("organization_id", orgId)
      .in("role", ["teacher", "admin", "owner"]);

    if (!error && data) {
      // Supabase's generated generic types might nest profiles differently.
      // Assuming array or single object.
      const formattedTeachers = data.map((d: any) => ({
        user_id: d.user_id,
        profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles,
      }));
      setTeachers(formattedTeachers);
    }
  }

  async function loadClassrooms() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("classrooms")
      .select("id, name, term, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (!error && data) setClassrooms(data);
    setIsLoading(false);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setIsCreating(true);
    const { data: classData, error } = await supabase
      .from("classrooms")
      .insert({
        organization_id: orgId,
        name: newName.trim(),
        term: newTerm.trim() || null,
      })
      .select()
      .single();

    if (!error && classData) {
      // Assign teacher if selected
      if (selectedTeacher && selectedTeacher !== "none") {
        await supabase.from("classroom_members").insert({
          classroom_id: classData.id,
          user_id: selectedTeacher,
          role: "teacher",
        });
      }

      toast.success("Classroom created.");
      setNewName("");
      setNewTerm("");
      setSelectedTeacher("none");
      setIsDialogOpen(false);
      loadClassrooms();
    } else {
      toast.error("Failed to create classroom.");
    }
    setIsCreating(false);
  }

  const handleInviteStudents = async () => {
    if (!selectedClassroom || !inviteEmails.trim()) return;

    setIsInviting(true);
    const emails = inviteEmails
      .split(/[\n,]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    const { data: userData } = await supabase.auth.getUser();

    const invites = emails.map((email) => ({
      classroom_id: selectedClassroom.id,
      email,
      invited_by: userData.user?.id,
    }));

    const { error } = await supabase.from("classroom_invites").insert(invites);

    if (!error) {
      toast.success("Students added to classroom.");
      setInviteEmails("");
      setIsInviteOpen(false);
    } else {
      toast.error("Failed to add students.");
    }
    setIsInviting(false);
  };

  return (
    <AppShell
      title="Classroom Management"
      subtitle="View and create classrooms across the organization."
      navItems={navItems}
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Classroom
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Classroom</DialogTitle>
              <DialogDescription>
                Add a new classroom to this organization.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Classroom Name</Label>
                <Input
                  placeholder="e.g. Data Structures Lab"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Term / Semester (optional)</Label>
                <Input
                  placeholder="e.g. Sem 3 2025"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Assign Teacher</Label>
                <Select
                  value={selectedTeacher}
                  onValueChange={setSelectedTeacher}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a teacher (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      No Teacher (Unassigned)
                    </SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.user_id} value={t.user_id}>
                        {t.profiles?.full_name ||
                          t.profiles?.email ||
                          t.user_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={isCreating || !newName.trim()}
              >
                {isCreating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>All Classrooms</CardTitle>
          <CardDescription>
            All classrooms created within this organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : classrooms.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <Users2 className="h-8 w-8 opacity-40" />
              <p>No classrooms found. Create one above.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classrooms.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.term ?? "—"}</TableCell>
                    <TableCell>
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        asChild
                      >
                        <Link href={`/${orgId}/admin/classrooms/${c.id}`}>
                          View Details
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
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
