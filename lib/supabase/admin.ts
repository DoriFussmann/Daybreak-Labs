import { createClient } from "@supabase/supabase-js";
// SERVER ONLY. Uses the service-role key, which bypasses row-level security.
// Never import this from a client component.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
