import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const navItems = [
  { label: "Organizations", href: "/superadmin" },
  { label: "Admins", href: "/superadmin" },
  { label: "Platform Analytics", href: "/superadmin" },
  { label: "System Settings", href: "/superadmin" },
];

export default function SuperAdminPage() {
  return (
    <AppShell
      title="Super Admin Control"
      subtitle="Manage organizations, platform access, and system-wide settings."
      navItems={navItems}
      actions={<Button size="sm">Create Organization</Button>}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
            <CardDescription>
              Track activity and provisioning across campuses.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            12 active organizations, 3 pending approvals.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Admin Accounts</CardTitle>
            <CardDescription>
              Approve new admins and review access requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            4 open requests waiting for verification.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>
              Status snapshot for integrations and services.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Auth, storage, and compile services ready.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
