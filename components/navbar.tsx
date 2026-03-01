"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ArrowLeft,
  Home,
  BookOpen,
  LogOut,
  User as UserIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { useAuthStore } from "@/stores/auth-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase/client";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  const displayName = user?.user_metadata?.full_name || user?.email || "U";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          {pathname === "/" ? (
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <BookOpen className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold hidden sm:inline-block">
                Digital Record
              </span>
            </Link>
          ) : (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                title="Go Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" asChild title="Dashboard">
                <Link href="/dashboard">
                  <Home className="h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {pathname === "/" && !user && (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Get Started</Link>
              </Button>
            </>
          )}
          {pathname === "/" && user && (
            <Button asChild size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          )}
          <ModeToggle />
          {user && pathname !== "/" && pathname !== "/profile" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer border bg-muted transition-opacity hover:opacity-80">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-54">
                <div className="flex items-center gap-2 p-2 mb-1">
                  <Avatar className="h-8 w-8 border bg-muted">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate text-sm font-medium">
                      {displayName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                </div>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/profile" className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-red-600 focus:bg-red-100 dark:focus:bg-red-950/50 dark:text-red-500"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
}
