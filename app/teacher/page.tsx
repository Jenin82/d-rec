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

const navItems = [
  { label: "My Classrooms", href: "/teacher" },
  { label: "Programs", href: "/teacher" },
  { label: "Approvals", href: "/teacher" },
  { label: "Evaluations", href: "/teacher" },
];

export default function TeacherPage() {
  return (
    <AppShell
      title="Teacher Workspace"
      subtitle="Review algorithms, publish programs, and evaluate submissions."
      navItems={navItems}
      actions={
        <Button asChild size="sm">
          <Link href="/teacher">Create Program</Link>
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Algorithms Awaiting Approval</CardTitle>
            <CardDescription>
              Provide feedback before students move to code.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            14 algorithm drafts need review.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Evaluations</CardTitle>
            <CardDescription>
              Check recent submissions that need grading.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            9 final submissions due this week.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Classroom Activity</CardTitle>
            <CardDescription>
              Monitor engagement across sections.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            3 classrooms active, 42 students online today.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
