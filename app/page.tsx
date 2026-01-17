import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,oklch(0.98_0.03_160),transparent_55%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12">
        <header className="flex flex-col gap-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Digital Record Book
          </p>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              A modern workflow for algorithm review, coding, and lab
              submissions.
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Replace paper-based lab records with a collaborative digital
              platform. Students draft algorithms, teachers approve with
              feedback, and final code submissions are organized in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/student">Open Student Workspace</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/teacher">Open Teacher Dashboard</Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Highlights</CardTitle>
              <CardDescription>
                Everything needed to move from algorithm to evaluated
                submission.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <div>Algorithm drafting with approvals and inline feedback.</div>
              <div>
                Integrated code editor with compilation and output console.
              </div>
              <div>AI review panel for suggestions and learning support.</div>
              <div>PDF-ready record book and secure submission archive.</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Role Dashboards</CardTitle>
              <CardDescription>
                Jump into the UI shells for each role.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button asChild variant="outline" className="justify-start">
                <Link href="/superadmin">Super Admin Overview</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/admin">Organization Admin</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/teacher">Teacher Workspace</Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <Link href="/student">Student Workspace</Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Review Algorithms",
              description:
                "Teachers approve algorithms with comments before coding starts.",
            },
            {
              title: "Code + Run",
              description:
                "Students write and test programs in a guided editor.",
            },
            {
              title: "Submit & Archive",
              description:
                "Final outputs stored by classroom and exportable to PDF.",
            },
          ].map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
