"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Users, GraduationCap, UsersRound, ArrowRight } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const SECTIONS = [
  {
    icon: Users,
    title: "User Management",
    description:
      "Manage all organization members: owners, admins, teachers, and students.",
    path: "users",
    label: "Manage Users",
  },
];

export default function AdminPage() {
  const params = useParams();
  const orgId = params.orgId as string;

  const navItems = [
    { label: "Overview", href: `/${orgId}/admin` },
    { label: "Users", href: `/${orgId}/admin/users` },
    { label: "Classrooms", href: `/${orgId}/admin/classrooms` },
    { label: "Settings", href: `/${orgId}/admin/settings` },
  ];

  return (
    <AppShell
      title="Organization Admin"
      subtitle="Monitor classrooms, manage staff, and support student progress."
      navItems={navItems}
    >
      <div className="grid gap-6 md:grid-cols-3">
        {SECTIONS.map(({ icon: Icon, title, description, path, label }) => (
          <Card key={path} className="flex flex-col">
            <CardHeader>
              <div className="mb-2 rounded-lg bg-primary/10 w-fit p-2.5">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <div className="flex-1" />
            <CardFooter className="pt-4 border-t">
              <Button
                asChild
                variant="ghost"
                className="w-full justify-between"
              >
                <Link href={`/${orgId}/admin/${path}`}>
                  {label}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
