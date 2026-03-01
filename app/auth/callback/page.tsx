"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const finalize = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // If a new Google user logs in, they might not have a profile yet or might not have a role set.
        // We ensure a basic profile exists and determine their role.
        let { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.session.user.id)
          .single();

        // If no profile exists (e.g., first time OAuth login and no trigger is set up), create one.
        if (!profile) {
          const { data: newProfile } = await supabase
            .from("profiles")
            .insert({
              id: data.session.user.id,
              role: "student", // default role
              full_name: data.session.user.user_metadata?.full_name || "",
            })
            .select("role")
            .single();

          profile = newProfile;
        }

        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    };

    finalize();
  }, [router]);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,oklch(0.95_0.04_200),oklch(0.98_0.01_200))] dark:bg-[radial-gradient(ellipse_at_top,oklch(0.2_0.04_200),oklch(0.1_0.01_200))]">
      <div className="mx-auto flex min-h-screen w-full flex-col items-center justify-center px-6 py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Authenticating...
            </h1>
            <p className="text-sm text-muted-foreground">
              Please wait while we set up your session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
