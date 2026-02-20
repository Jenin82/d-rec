"use client";

import {
    LayoutDashboard,
    FileQuestion,
    BookCheck,
    Code2,
} from "lucide-react";

import { DashboardLayout } from "@/components/dashboard-layout";
import { AIAssistant } from "@/components/ai-assistant";

const teacherNavItems = [
    {
        label: "Dashboard",
        href: "/teacher",
        icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
        label: "Questions",
        href: "/teacher/questions",
        icon: <FileQuestion className="h-4 w-4" />,
    },
    {
        label: "Algorithm Review",
        href: "/teacher/algorithms",
        icon: <BookCheck className="h-4 w-4" />,
    },
    {
        label: "Code Review",
        href: "/teacher/code-review",
        icon: <Code2 className="h-4 w-4" />,
    },
];

export default function TeacherLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardLayout
            title="Teacher Dashboard"
            role="teacher"
            navItems={teacherNavItems}
        >
            {children}
            <AIAssistant />
        </DashboardLayout>
    );
}
