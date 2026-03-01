"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CodeReviewPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const navItems = [
    { label: "Overview", href: `/${orgId}/teacher` },
    { label: "Classrooms", href: `/${orgId}/teacher/classrooms` },
    { label: "Questions", href: `/${orgId}/teacher/questions` },
    { label: "Review Queue", href: `/${orgId}/teacher/reviews` },
  ];

  useEffect(() => {
    router.replace(`/${orgId}/teacher/reviews`);
  }, [orgId, router]);

  return (
    <AppShell
      title="Review Queue"
      subtitle="Unified review queue"
      navItems={navItems}
    >
      <Card>
        <CardHeader>
          <CardTitle>Redirecting...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Code review moved to the unified review queue.
          </p>
          <Button asChild size="sm">
            <Link href={`/${orgId}/teacher/reviews`}>Go to Review Queue</Link>
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
