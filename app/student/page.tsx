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
  { label: "My Classrooms", href: "/student/classrooms" },
  { label: "Active Program", href: "/student/classrooms/1/programs/1" },
  { label: "Progress", href: "/student/progress" },
];

export default function StudentPage() {
  return (
    <AppShell
      title="Student Workspace"
      subtitle="Draft algorithms, code solutions, and submit final records."
      navItems={navItems}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href="/student/classrooms">View Classrooms</Link>
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Assignment</CardTitle>
            <CardDescription>
              Binary Search Tree traversal - Week 4 lab.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <span>Status: Algorithm approved.</span>
            <Button asChild size="sm" className="w-fit">
              <Link href="/student/classrooms/1/programs/1">
                Open Workspace
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Feedback Highlights</CardTitle>
            <CardDescription>
              Latest notes from your teacher and AI review.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Your algorithm is ready. Focus on input validation and edge cases.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
