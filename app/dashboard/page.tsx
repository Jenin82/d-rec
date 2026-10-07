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
import { apiRequest, getAccessibleOrganizations, type OrganizationAccess } from "@/lib/api-client";
import { captureCacheContext } from "@/lib/client-cache-context";
import { sessionClient as auth } from "@/lib/auth-client";
import { useOrgStore } from "@/stores/org-store";
import { useAuthStore } from "@/stores/auth-store";

type Organization = OrganizationAccess;

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Org state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDesc, setNewOrgDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (user) {
      loadOrganizations();
    } else {
      setOrganizations([]);
      setIsLoading(false);
    }
  }, [user]);

  async function processInvites() {
    // Claim invitations for the verified session email on the server.
    const { error } = await apiRequest("/api/invites/accept", {});
    if (error) {
      console.warn("processInvites:", error.message);
    }
  }

  async function loadOrganizations() {
    const isCurrent = captureCacheContext();
    setIsLoading(true);
    setError(null);

    const userEmail = user?.email;

    // First auto-accept any pending invites for this user's email
    if (userEmail) {
      await processInvites();
    }

    if (!isCurrent()) return;
    const { data, error } = await getAccessibleOrganizations();
    if (!isCurrent()) return;
    if (error) setError(error.message);
    else setOrganizations(data || []);

    setIsLoading(false);
  }

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim() || !user) return;

    setIsCreating(true);

    const { error } = await apiRequest("/api/organizations", {
      name: newOrgName.trim(), description: newOrgDesc.trim() || null,
    });
    if (!error) {
      await loadOrganizations();
      setIsCreateOpen(false);
      setNewOrgName("");
      setNewOrgDesc("");
    } else {
      setError(error.message);
    }

    setIsCreating(false);
  };

  const handleSelectOrg = (org: Organization) => {
    // Set a cookie or local storage to remember the selected org
    useOrgStore.getState().setCurrentOrg({ id: org.id, name: org.name, description: org.description, code: org.code });

    // Effective owner and global superuser access share the admin workspace.
    const targetRole = org.role === "owner" || org.role === "superuser" ? "admin" : org.role;
    router.push(`/${org.id}/${targetRole}`);
  };

  const handleSignOut = async () => {
    await auth.signOut();
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

        {error && <p role="alert" className="text-destructive mb-4">{error}</p>}
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
