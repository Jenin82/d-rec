import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const navItems = [
  { label: "My Classrooms", href: "/student/classrooms" },
  { label: "Active Program", href: "/student/classrooms/1/programs/1" },
  { label: "Progress", href: "/student/progress" },
];

export default function StudentProgramPage() {
  return (
    <AppShell
      title="Program Workspace"
      subtitle="Draft the algorithm, write code, and review outputs before submission."
      navItems={navItems}
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href="/student/progress">View Progress</Link>
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Algorithm Editor</CardTitle>
              <CardDescription>
                Draft and revise the algorithm for approval.
              </CardDescription>
            </div>
            <Badge variant="secondary">Approved</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              className="min-h-[220px]"
              placeholder="Write your algorithm steps here..."
              defaultValue={`1. Read input values\n2. Initialize traversal pointers\n3. Visit each node in-order\n4. Print result set`}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Save Draft</Button>
              <Button size="sm" variant="outline">
                Request Re-Approval
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>AI Review Panel</CardTitle>
            <CardDescription>
              Suggested improvements and learning prompts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>✅ Consider edge cases for empty trees.</div>
            <div>✅ Add time complexity justification.</div>
            <div>⚠️ Clarify variable naming for clarity.</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Code Editor</CardTitle>
            <CardDescription>
              Monaco editor placeholder with run controls.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-xs text-muted-foreground">
              Monaco editor will appear here. Add language selection, line
              numbers, and auto-complete later.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Run Code</Button>
              <Button size="sm" variant="outline">
                Save Code
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Output Console</CardTitle>
            <CardDescription>
              Execution output from Judge0 will show here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-xs text-muted-foreground">
              Output: Awaiting execution run.
            </div>
            <Button size="sm" variant="outline">
              Clear Console
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Final Submission</CardTitle>
          <CardDescription>
            Submit once algorithm and code are ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Submission status: Draft ready, waiting for final compile.
          </div>
          <Button>Submit Record</Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
