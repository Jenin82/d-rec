import Link from "next/link";
import {
  BookOpen,
  Code2,
  Bot,
  Printer,
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: "Algorithm Submission",
    description:
      "Write structured algorithms with a rich editor. Submit for teacher review with inline feedback.",
  },
  {
    icon: <Code2 className="h-6 w-6" />,
    title: "Code Compilation",
    description:
      "Write, compile, and run code in multiple languages with real-time output display.",
  },
  {
    icon: <Bot className="h-6 w-6" />,
    title: "AI Assistant",
    description:
      "Get intelligent suggestions, error explanations, and optimized solutions powered by AI.",
  },
  {
    icon: <Printer className="h-6 w-6" />,
    title: "Digital Record Printing",
    description:
      "Export approved submissions as clean, structured PDF documents ready for lab records.",
  },
];

const workflow = [
  "Draft your algorithm and submit for review",
  "Teacher reviews and provides feedback",
  "Write code once algorithm is approved",
  "Compile, run, and submit your final solution",
  "Teacher gives final approval",
  "Print your digital record",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">Digital Record</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.95_0.04_200),transparent_70%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 py-24 text-center md:py-32">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs text-muted-foreground shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            Academic Platform for Structured Learning
          </div>
          <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-primary via-blue-600 to-primary bg-clip-text text-transparent">
              Build.
            </span>{" "}
            Code.{" "}
            <span className="bg-gradient-to-r from-primary via-blue-600 to-primary bg-clip-text text-transparent">
              Compile.
            </span>{" "}
            Record.
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            Replace paper-based lab records with a collaborative digital
            platform. Students draft algorithms, teachers approve with feedback,
            and final submissions are compiled, tested, and archived.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="gap-2 px-8">
              <Link href="/signup">
                <GraduationCap className="h-5 w-5" />
                Student Sign Up
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2 px-8">
              <Link href="/signup">
                <Users className="h-5 w-5" />
                Teacher Sign Up
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything You Need
            </h2>
            <p className="mt-3 text-muted-foreground">
              A complete workflow from algorithm design to final record
              submission.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="group transition-shadow hover:shadow-md"
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                How It Works
              </h2>
              <p className="mt-3 text-muted-foreground">
                A streamlined six-step process that guides students from idea to
                approved lab record.
              </p>
              <div className="mt-8 flex flex-col gap-4">
                {workflow.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {i + 1}
                    </div>
                    <p className="pt-0.5 text-sm">{step}</p>
                  </div>
                ))}
              </div>
            </div>
            <Card className="p-8">
              <div className="flex flex-col gap-4">
                {[
                  { label: "Algorithm Drafted", done: true },
                  { label: "Teacher Approved", done: true },
                  { label: "Code Written & Compiled", done: true },
                  { label: "Final Submission", done: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-lg border bg-card p-4"
                  >
                    <CheckCircle2
                      className={`h-5 w-5 ${item.done
                          ? "text-primary"
                          : "text-muted-foreground/30"
                        }`}
                    />
                    <span
                      className={
                        item.done
                          ? "text-sm font-medium"
                          : "text-sm text-muted-foreground"
                      }
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            About Digital Record
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Digital Record is an academic platform designed to modernize how
            students submit lab work and how teachers evaluate it. With
            structured workflows, AI-powered assistance, and digital record
            keeping, it bridges the gap between traditional lab manuals and
            modern software development practices.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" className="gap-2">
              <Link href="/signup">
                Start Your Digital Record
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <BookOpen className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold">Digital Record</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <Link href="/login" className="hover:text-foreground transition-colors">
                Login
              </Link>
              <Link href="/signup" className="hover:text-foreground transition-colors">
                Register
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Digital Record. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
// Digital Record platform
