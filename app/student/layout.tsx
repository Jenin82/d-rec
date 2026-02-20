"use client";

import {
    LayoutDashboard,
    BookOpen,
    FileText,
} from "lucide-react";

import { DashboardLayout } from "@/components/dashboard-layout";
import { AIAssistant } from "@/components/ai-assistant";

const studentNavItems = [
    {
        label: "Dashboard",
        href: "/student",
        icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
        label: "Questions",
        href: "/student/questions",
        icon: <BookOpen className="h-4 w-4" />,
    },
    {
        label: "My Records",
        href: "/student/records",
        icon: <FileText className="h-4 w-4" />,
    },
];

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardLayout
            title="Student Dashboard"
            role="student"
            navItems={studentNavItems}
        >
            {children}
            <AIAssistant />
        </DashboardLayout>
    );
}
