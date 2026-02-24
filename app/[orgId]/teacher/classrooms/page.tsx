"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Users, Search, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Classroom = {
  id: string;
  name: string;
  term: string | null;
  created_at: string;
};

export default function ClassroomsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgName, setOrgName] = useState("Organization");

  // Create classroom state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassTerm, setNewClassTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Invite students state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(
    null,
  );
  const [inviteEmails, setInviteEmails] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  const navItems = [
    { label: "Overview", href: `/${orgId}/teacher` },
    { label: "Classrooms", href: `/${orgId}/teacher/classrooms` },
    { label: "Questions", href: `/${orgId}/teacher/questions` },
    { label: "Review Algorithms", href: `/${orgId}/teacher/algorithms` },
    { label: "Review Code", href: `/${orgId}/teacher/code-review` },
  ];

  useEffect(() => {
    if (orgId) {
      loadClassrooms();
    }
  }, [orgId]);

  async function loadClassrooms() {
    setIsLoading(true);

    const { data: orgData } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();
    if (orgData) setOrgName(orgData.name);

    const { data, error } = await supabase
      .from("classrooms")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setClassrooms(data);
    }
    setIsLoading(false);
  }

  const handleCreateClassroom = async () => {
    if (!orgId || !newClassName.trim()) return;

    setIsCreating(true);
    const { data: userData } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("classrooms")
      .insert({
        organization_id: orgId,
        name: newClassName,
        term: newClassTerm || null,
      })
      .select()
      .single();

    if (!error && data) {
      if (userData.user?.id) {
        await supabase.from("classroom_members").insert({
          classroom_id: data.id,
          user_id: userData.user.id,
          role: "teacher",
        });
      }
      setClassrooms([data, ...classrooms]);
      setNewClassName("");
      setNewClassTerm("");
      setIsCreateOpen(false);
    }
    setIsCreating(false);
  };

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
      setInviteEmails("");
      setIsInviteOpen(false);
    }
    setIsInviting(false);
  };

  const filtered = classrooms.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.term && c.term.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <AppShell
      title="Classrooms"
      subtitle={`Manage your classes and enrolled students in ${orgName}`}
      navItems={navItems}
      actions={
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              New Classroom
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Classroom</DialogTitle>
              <DialogDescription>
                Add a new classroom to {orgName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Classroom Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. CS101 Data Structures"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="term">Term (Optional)</Label>
                <Input
                  id="term"
                  placeholder="e.g. Fall 2025"
                  value={newClassTerm}
                  onChange={(e) => setNewClassTerm(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateClassroom}
                disabled={isCreating || !newClassName.trim()}
              >
                {isCreating ? "Creating..." : "Create Classroom"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search classrooms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24">
                  <div className="h-5 w-2/3 rounded bg-muted mb-2" />
                  <div className="h-4 w-1/3 rounded bg-muted" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : classrooms.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-primary/10 p-3 mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">No classrooms yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                Create your first classroom to start adding students and
                assigning programming problems.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                Create Classroom
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((classroom) => (
              <Card key={classroom.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-xl">{classroom.name}</CardTitle>
                  <CardDescription>
                    {classroom.term || "No term specified"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end">
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      asChild
                    >
                      <Link
                        href={`/${orgId}/teacher/classrooms/${classroom.id}`}
                      >
                        View Details
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
