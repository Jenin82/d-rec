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
  { label: "Overview", href: "/admin" },
  { label: "Teachers", href: "/admin" },
  { label: "Classrooms", href: "/admin" },
  { label: "Students", href: "/admin" },
];

export default function AdminPage() {
  return (
    <AppShell
      title="Organization Admin"
      subtitle="Monitor classrooms, manage staff, and support student progress."
      navItems={navItems}
      actions={<Button size="sm">Invite Teacher</Button>}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Active Classrooms</CardTitle>
            <CardDescription>
              Track attendance and upcoming submissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            18 classrooms running, 5 new program drafts awaiting review.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Teacher Coverage</CardTitle>
            <CardDescription>
              Assign instructors and verify availability.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            27 teachers onboarded, 2 pending approvals.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Student Enrollment</CardTitle>
            <CardDescription>
              See active enrollments across departments.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            1,240 students enrolled, 94 percent active this week.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Needs Attention</CardTitle>
            <CardDescription>
              Flags from classroom feedback and reviews.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            7 submissions waiting for teacher feedback.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
