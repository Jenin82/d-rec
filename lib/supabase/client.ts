import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/db.types";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "placeholder-key";

export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseKey);
