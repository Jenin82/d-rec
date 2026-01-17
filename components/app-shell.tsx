import type React from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const statusLabel = "Prototype";

type NavItem = {
  label: string;
  href: string;
};

type AppShellProps = {
  title: string;
  subtitle: string;
  navItems: NavItem[];
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({
  title,
  subtitle,
  navItems,
  actions,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,oklch(0.98_0.03_160),transparent_60%)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Digital Record Book
              </p>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {title}
              </h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{statusLabel}</Badge>
              {actions}
              <Button asChild size="sm" variant="outline">
                <Link href="/">Back to overview</Link>
              </Button>
            </div>
          </div>
          <Card className="flex flex-wrap items-center gap-3 border-dashed px-4 py-3 text-xs text-muted-foreground">
            {navItems.map((item) => (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                size="sm"
                className="justify-start"
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </Card>
        </header>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="hidden flex-col gap-2 lg:flex">
            {navItems.map((item) => (
              <Button
                key={item.href}
                asChild
                variant="outline"
                className="justify-start"
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </aside>
          <main className="flex flex-col gap-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
