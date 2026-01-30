"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const finalize = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/student");
      } else {
        router.replace("/login");
      }
    };

    finalize();
  }, [router]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,oklch(0.98_0.03_160),transparent_60%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6 py-12">
        <div className="rounded-lg border border-dashed bg-background px-4 py-6 text-sm text-muted-foreground">
          Completing authentication...
        </div>
      </div>
    </div>
  );
}
