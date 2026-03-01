"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building, Plus, LogOut, Loader2, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";

type Organization = {
  id: string;
  name: string;
  description: string | null;
  role: "owner" | "admin" | "teacher" | "student";
};

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Org state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDesc, setNewOrgDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (user) {
      loadOrganizations();
    }
  }, [user]);

  async function processInvites() {
    // Calls a SECURITY DEFINER function that reads org_invites by email
    // and inserts into organization_members — bypassing RLS safely.
    const { error } = await supabase.rpc("accept_my_invites");
    if (error) {
      console.warn("processInvites:", error.message);
    }
  }

  async function loadOrganizations() {
    setIsLoading(true);

    const userEmail = user?.email;
    const userId = user!.id;

    // First auto-accept any pending invites for this user's email
    if (userEmail) {
      await processInvites();
    }

    // Get user's organization memberships with their role
    const { data: memberData, error: memberError } = await supabase
      .from("organization_members")
      .select(
        `
        role,
        organization_id,
        organizations (
          id,
          name,
          description
        )
      `,
      )
      .eq("user_id", userId);

    if (memberError) {
      console.error("Error loading organizations:", memberError);
      setIsLoading(false);
      return;
    }

    if (memberData) {
      const formattedOrgs = memberData
        .filter((m) => m.organizations !== null)
        .map((m) => ({
          id: (m.organizations as any).id,
          name: (m.organizations as any).name,
          description: (m.organizations as any).description,
          role: m.role as any,
        }));
      setOrganizations(formattedOrgs);
    }

    setIsLoading(false);
  }

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim() || !user) return;

    setIsCreating(true);

    // 1. Create the organization
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: newOrgName,
        description: newOrgDesc || null,
      })
      .select()
      .single();

    if (orgError || !orgData) {
      console.error("Error creating org:", orgError);
      setIsCreating(false);
      return;
    }

    // 2. Add the user as the owner
    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: orgData.id,
        user_id: user.id,
        role: "owner",
      });

    if (!memberError) {
      // Refresh the list
      await loadOrganizations();
      setIsCreateOpen(false);
      setNewOrgName("");
      setNewOrgDesc("");
    }

    setIsCreating(false);
  };

  const handleSelectOrg = (org: Organization) => {
    // Set a cookie or local storage to remember the selected org
    localStorage.setItem("selected_org_id", org.id);

    // Map owner to admin for routing purposes
    const targetRole = org.role === "owner" ? "admin" : org.role;
    router.push(`/${org.id}/${targetRole}`);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex-1 bg-[radial-gradient(ellipse_at_top,oklch(0.95_0.04_200),oklch(0.98_0.01_200))] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.2_0.04_200),oklch(0.1_0.01_200))]">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Your Organizations
            </h1>
            <p className="text-muted-foreground mt-1">
              Select an organization to continue to your workspace.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Organization
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Organization</DialogTitle>
                  <DialogDescription>
                    Create a new organization to manage teachers, classrooms,
                    and students. You will be assigned as the Owner.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">Organization Name</Label>
                    <Input
                      id="orgName"
                      placeholder="e.g. Computer Science Department"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgDesc">Description (Optional)</Label>
                    <Textarea
                      id="orgDesc"
                      placeholder="Brief description of your organization"
                      value={newOrgDesc}
                      onChange={(e) => setNewOrgDesc(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateOrganization}
                    disabled={isCreating || !newOrgName.trim()}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Organization"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-32">
                  <div className="h-6 w-2/3 rounded bg-muted mb-2" />
                  <div className="h-4 w-full rounded bg-muted" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : organizations.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <Building className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                No Organizations Found
              </h3>
              <p className="text-muted-foreground max-w-md mb-6">
                You are not part of any organizations yet. You can create a new
                one to get started, or wait for an administrator to invite you.
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Organization
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <Card
                key={org.id}
                className="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/50 cursor-pointer flex flex-col"
                onClick={() => handleSelectOrg(org)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                      {org.role}
                    </span>
                  </div>
                  <CardTitle className="line-clamp-1">{org.name}</CardTitle>
                  {org.description && (
                    <CardDescription className="line-clamp-2 mt-1.5">
                      {org.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <div className="flex-1" />
                <CardFooter className="pt-4 border-t bg-muted/20">
                  <div className="flex w-full items-center justify-between text-sm font-medium text-primary">
                    Enter Workspace
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
