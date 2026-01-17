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

const classrooms = [
  {
    id: "1",
    title: "Data Structures Lab",
    teacher: "Dr. S. Priya",
    programs: 6,
  },
  {
    id: "2",
    title: "Algorithms Studio",
    teacher: "Prof. K. Arun",
    programs: 4,
  },
  {
    id: "3",
    title: "C Programming Fundamentals",
    teacher: "Ms. Latha",
    programs: 8,
  },
];

export default function StudentClassroomsPage() {
  return (
    <AppShell
      title="My Classrooms"
      subtitle="Jump back into programs, algorithms, and coding workspaces."
      navItems={navItems}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {classrooms.map((classroom) => (
          <Card key={classroom.id}>
            <CardHeader>
              <CardTitle>{classroom.title}</CardTitle>
              <CardDescription>{classroom.teacher}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
              <span>{classroom.programs} active programs this semester.</span>
              <Button asChild size="sm" className="w-fit">
                <Link href={`/student/classrooms/${classroom.id}/programs/1`}>
                  Open Workspace
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
