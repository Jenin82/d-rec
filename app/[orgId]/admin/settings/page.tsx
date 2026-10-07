"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, getOrganizationAccess } from "@/lib/api-client";
import { sessionClient as auth } from "@/lib/auth-client";
import { captureCacheContext } from "@/lib/client-cache-context";

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
import { Input } from "@/components/ui/input";

type AdminUser = {
  id: string;
  role: string;
  full_name: string | null;
  email?: string;
};

export default function AdminSettingsPage() {
  const paramsBase = useParams();
  const orgId = paramsBase.orgId as string;

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const navItems = [
    { label: "Overview", href: `/${orgId}/admin` },
    { label: "Users", href: `/${orgId}/admin/users` },
    { label: "Settings", href: `/${orgId}/admin/settings` },
  ];

  useEffect(() => {
    if (orgId) {
      loadAdmins(orgId);
      checkUserRole(orgId);
    }
  }, [orgId]);

  async function checkUserRole(orgId: string) {
    const isCurrent = captureCacheContext();
    setCurrentUserRole(null);
    const { data } = await getOrganizationAccess(orgId);
    if (isCurrent()) setCurrentUserRole(data?.role || null);
  }

  async function loadAdmins(orgId: string) {
    setIsLoading(true);

    const { data: memberData } = await api
      .from("organization_members")
      .select("user_id, role")
      .eq("organization_id", orgId)
      .in("role", ["admin", "owner"]);

    if (!memberData || memberData.length === 0) {
      setAdmins([]);
      setIsLoading(false);
      return;
    }

    const adminIds = memberData
      .map((m: any) => m.user_id)
      .filter((id: any): id is string => id !== null);

    const { data: profileData } = await api
      .from("profiles")
      .select("id, full_name")
      .in("id", adminIds);

    if (profileData) {
      // Map to keep track of their actual roles if needed for display
      setAdmins(
        profileData.map((p: any) => {
          const role = memberData.find((m: any) => m.user_id === p.id)?.role;
          return {
            id: p.id,
            role: role || "admin",
            full_name: `${p.full_name} (${role})`,
            email: "No email access",
          };
        }),
      );
    }

    setIsLoading(false);
  }

  const handleAddAdmin = async () => {
    if (!orgId || !newAdminEmail.trim()) return;

    setIsInviting(true);

    const { data: userData } = await auth.getUser();

    const { error } = await api.from("org_invites").insert({
      organization_id: orgId,
      email: newAdminEmail.trim(),
      role: "admin",
      invited_by: userData.user?.id,
    });

    if (!error) {
      setNewAdminEmail("");
      setIsDialogOpen(false);
    } else {
      console.error("Failed to invite admin:", error);
    }
    setIsInviting(false);
  };

  const handleRemoveAdmin = async (adminId: string) => {
    if (!orgId || (currentUserRole !== "owner" && currentUserRole !== "superuser")) return;

    // Prevent removing oneself (if Owner removes themselves, they lose org access)
    const { data: userData } = await auth.getUser();
    if (userData.user?.id === adminId) {
      alert("You cannot remove yourself.");
      return;
    }

    const { error } = await api
      .from("organization_members")
      .delete()
      .eq("organization_id", orgId)
      .eq("user_id", adminId);

    if (!error) {
      setAdmins(admins.filter((a) => a.id !== adminId));
    } else {
      toast.error(error.message);
    }
  };

  return (
    <AppShell
      title="Organization Settings"
      subtitle="Manage your organization's administrators and settings."
      navItems={navItems}
      actions={
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Administrator</DialogTitle>
              <DialogDescription>
                Invite a new administrator to help manage this organization.
                This creates an invitation. They can join after verifying their email and opening the dashboard.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Input
                  type="email"
                  placeholder="admin@university.edu"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleAddAdmin}
                disabled={isInviting || !newAdminEmail.trim()}
              >
                {isInviting ? "Sending..." : "Send Invite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Administrators</CardTitle>
            <CardDescription>
              A list of owners and admins managing this organization. Owners and
              global superusers can remove administrators. Owners are protected.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
              </div>
            ) : admins.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                No administrators found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name (Role)</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">
                        {admin.full_name || "Unknown"}
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell className="text-right">
                        {admin.role !== "owner" && (currentUserRole === "owner" || currentUserRole === "superuser") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveAdmin(admin.id)}
                            title="Remove Admin"
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
