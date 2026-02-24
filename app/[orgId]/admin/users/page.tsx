"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, UsersRound } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type OrgUser = {
  id: string;
  full_name: string | null;
  email?: string;
  role: string;
  isPending?: boolean;
};

export default function AdminUsersPage() {
  const paramsBase = useParams();
  const orgId = paramsBase.orgId as string;

  const [users, setUsers] = useState<OrgUser[]>([]);
  const [bulkEmails, setBulkEmails] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("student");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const navItems = [
    { label: "Overview", href: `/${orgId}/admin` },
    { label: "Users", href: `/${orgId}/admin/users` },
    { label: "Classrooms", href: `/${orgId}/admin/classrooms` },
    { label: "Settings", href: `/${orgId}/admin/settings` },
  ];

  useEffect(() => {
    if (orgId) {
      loadUsers(orgId);
    }
  }, [orgId]);

  async function loadUsers(orgId: string) {
    setIsLoading(true);

    // Fetch active members
    const { data: memberData } = await supabase
      .from("organization_members")
      .select("user_id, role")
      .eq("organization_id", orgId);

    let activeUsers: OrgUser[] = [];
    if (memberData && memberData.length > 0) {
      const userIds = memberData
        .map((m: any) => m.user_id)
        .filter((id: any): id is string => id !== null);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profileData) {
        activeUsers = profileData.map((p: any) => {
          const role = memberData.find((m: any) => m.user_id === p.id)?.role;
          return {
            id: p.id,
            full_name: p.full_name,
            role: role || "student",
            email: "Active Member",
          };
        });
      }
    }

    // Fetch pending invites
    const { data: inviteData } = await supabase
      .from("org_invites")
      .select("id, email, role")
      .eq("organization_id", orgId);

    let pendingUsers: OrgUser[] = [];
    if (inviteData) {
      pendingUsers = inviteData.map((inv: any) => ({
        id: inv.id,
        full_name: "Pending Invite",
        email: inv.email,
        role: inv.role,
        isPending: true,
      }));
    }

    setUsers([...activeUsers, ...pendingUsers]);
    setIsLoading(false);
  }

  const handleAddUsers = async () => {
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
      role: selectedRole as any,
      invited_by: userData.user?.id,
    }));

    const { error } = await supabase.from("org_invites").insert(invites);

    if (!error) {
      toast.success(`${emails.length} user invite(s) sent successfully.`);
      setBulkEmails("");
      setIsDialogOpen(false);
      loadUsers(orgId);
    } else {
      console.error("Failed to invite users:", error);
      toast.error("Failed to send invites. They may already be invited.");
    }
    setIsInviting(false);
  };

  const handleRemoveUser = async (userId: string, isPending?: boolean) => {
    if (!orgId) return;

    let error;

    if (isPending) {
      // Remove from invites
      const { error: inviteError } = await supabase
        .from("org_invites")
        .delete()
        .eq("id", userId);
      error = inviteError;
    } else {
      // Prevent owner from removing another owner easily if needed, or removing themselves.
      // Simple guard (for robust guard, backend RLS should handle it).
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user?.id === userId) {
        toast.error("You cannot remove yourself.");
        return;
      }

      const { error: memberError } = await supabase
        .from("organization_members")
        .delete()
        .eq("organization_id", orgId)
        .eq("user_id", userId);
      error = memberError;
    }

    if (!error) {
      setUsers(users.filter((t) => t.id !== userId));
      toast.success(isPending ? "Invite canceled." : "User removed.");
    } else {
      toast.error("Failed to remove.");
    }
  };

  const roleColors: Record<string, string> = {
    owner:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    teacher:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    student: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <AppShell
      title="User Management"
      subtitle="Manage all organization members: owners, admins, teachers, and students."
      navItems={navItems}
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Users
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Users</DialogTitle>
              <DialogDescription>
                Enter email addresses separated by commas or new lines, and
                select their role. They will automatically get access when they
                sign up.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Exclude owner to prevent accidental granting of full org control unless intended. But we can keep admin/teacher/student. */}
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Email Addresses</Label>
                <Textarea
                  placeholder="user1@example.com, user2@example.com"
                  value={bulkEmails}
                  onChange={(e) => setBulkEmails(e.target.value)}
                  className="min-h-[150px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleAddUsers}
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
            <CardTitle>Organization Users</CardTitle>
            <CardDescription>
              A list of all users currently assigned or invited to this
              organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center p-8 flex flex-col items-center gap-2 text-muted-foreground">
                <UsersRound className="h-8 w-8 opacity-40" />
                No users found in this organization.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email / Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || "Unknown"}
                        {user.isPending && (
                          <span className="ml-2 inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-500">
                            Pending Invite
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`capitalize border-0 ${roleColors[user.role] || roleColors.student}`}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.role !== "owner" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() =>
                              handleRemoveUser(user.id, user.isPending)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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
