"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Users2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Classroom = {
  id: string;
  name: string;
  term: string | null;
  created_at: string;
};

export default function AdminClassroomsPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTerm, setNewTerm] = useState("");

  const navItems = [
    { label: "Overview", href: `/${orgId}/admin` },
    { label: "Teachers", href: `/${orgId}/admin/teachers` },
    { label: "Classrooms", href: `/${orgId}/admin/classrooms` },
    { label: "Students", href: `/${orgId}/admin/students` },
    { label: "Settings", href: `/${orgId}/admin/settings` },
  ];

  useEffect(() => {
    loadClassrooms();
  }, [orgId]);

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
    const { error } = await supabase.from("classrooms").insert({
      organization_id: orgId,
      name: newName.trim(),
      term: newTerm.trim() || null,
    });
    if (!error) {
      toast.success("Classroom created.");
      setNewName("");
      setNewTerm("");
      setIsDialogOpen(false);
      loadClassrooms();
    } else {
      toast.error("Failed to create classroom.");
    }
    setIsCreating(false);
  }

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
