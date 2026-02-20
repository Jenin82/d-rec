"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    Menu,
    X,
    LogOut,
    BookOpen,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase/client";

export type SidebarNavItem = {
    label: string;
    href: string;
    icon: React.ReactNode;
};

type DashboardLayoutProps = {
    title: string;
    role: "teacher" | "student";
    navItems: SidebarNavItem[];
    children: React.ReactNode;
};

export function DashboardLayout({
    title,
    role,
    navItems,
    children,
}: DashboardLayoutProps) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
    };

    const SidebarContent = () => (
        <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-16 items-center gap-2 px-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                    <BookOpen className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                    <p className="text-sm font-semibold">Digital Record</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{role} Portal</p>
                </div>
            </div>

            <Separator />

            {/* Nav Items */}
            <ScrollArea className="flex-1 px-3 py-4">
                <nav className="flex flex-col gap-1">
                    {navItems.map((item) => {
                        const isActive =
                            pathname === item.href ||
                            (item.href !== `/${role}` && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                    isActive
                                        ? "bg-primary/10 text-primary font-medium"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                {item.icon}
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </ScrollArea>

            <Separator />

            {/* Sign out */}
            <div className="p-3">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-3 text-muted-foreground"
                    onClick={handleSignOut}
                >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </Button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-background">
            {/* Desktop sidebar */}
            <aside className="hidden w-64 flex-shrink-0 border-r bg-card lg:block">
                <SidebarContent />
            </aside>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setMobileOpen(false)}
                    />
                    <aside className="absolute left-0 top-0 h-full w-64 border-r bg-card shadow-xl">
                        <SidebarContent />
                    </aside>
                </div>
            )}

            {/* Main content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Top bar */}
                <header className="flex h-16 items-center gap-4 border-b bg-card px-6">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="lg:hidden"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        {mobileOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </Button>
                    <h1 className="text-lg font-semibold">{title}</h1>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-6xl p-6">{children}</div>
                </main>
            </div>
        </div>
    );
}
