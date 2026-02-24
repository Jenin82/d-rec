import { AppShell } from "@/components/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const progressRows = [
  {
    title: "Binary Search Tree Traversal",
    status: "Approved",
    due: "Feb 02",
  },
  {
    title: "Stack Applications",
    status: "Awaiting Review",
    due: "Feb 09",
  },
  {
    title: "Sorting Algorithms",
    status: "Draft",
    due: "Feb 16",
  },
];

export default function StudentProgressPage({
  params,
}: {
  params: { orgId: string };
}) {
  const { orgId } = params;
  const navItems = [
    { label: "My Classrooms", href: `/${orgId}/student` },
    { label: "Progress", href: `/${orgId}/student/progress` },
  ];

  return (
    <AppShell
      title="Progress Tracker"
      subtitle="Stay on top of algorithm approvals and submission deadlines."
      navItems={navItems}
    >
      <div className="grid gap-6">
        {progressRows.map((row) => (
          <Card key={row.title}>
            <CardHeader>
              <CardTitle>{row.title}</CardTitle>
              <CardDescription>Status: {row.status}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Next due date: {row.due}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
