import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Cockpit } from "./cockpit";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function Console() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div>
      <header
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          borderBottom: "1px solid var(--smoke)",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 300, color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Blueprint
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/console/clients">Manage clients</a>
          <form action={signOut}>
            <button type="submit" className="btn btn-ghost">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <Cockpit />
    </div>
  );
}
