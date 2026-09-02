import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientRecord } from "./actions";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function onCreate(formData: FormData) {
  "use server";
  await createClientRecord(String(formData.get("name") ?? ""));
}

export default async function ClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = createAdminClient();
  const { data: clients } = await db
    .from("clients")
    .select("id, name, is_live")
    .order("name");

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
        <a href="/console" style={{ fontSize: 20, fontWeight: 300, color: "var(--ink)", letterSpacing: "-0.02em" }}>
          Blueprint
        </a>
        <form action={signOut}>
          <button type="submit" className="btn btn-ghost">
            Sign out
          </button>
        </form>
      </header>

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div>
            <h2>Clients</h2>
            <p style={{ color: "var(--ash)", marginTop: 8, maxWidth: 680 }}>
              Zones, campaigns, and live status for each operator.
            </p>
          </div>
          <details>
            <summary
              className="btn btn-ghost"
              style={{ listStyle: "none", display: "inline-flex", alignItems: "center" }}
            >
              Add client
            </summary>
            <form action={onCreate} style={{ display: "flex", gap: 8, marginTop: 16, minWidth: 280 }}>
              <input className="input" name="name" placeholder="Client name" />
              <button className="btn" type="submit">
                Save
              </button>
            </form>
          </details>
        </div>

        <div className="card" style={{ marginTop: 40, padding: "8px 0" }}>
          {(clients ?? []).length === 0 ? (
            <div style={{ padding: "24px 32px", color: "var(--ash)" }}>No clients yet.</div>
          ) : (
            (clients ?? []).map((c, i) => (
              <a
                key={c.id}
                href={`/console/clients/${c.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "16px 24px",
                  borderTop: i === 0 ? "none" : "1px solid var(--smoke)",
                  color: "var(--ink)",
                  fontWeight: 400,
                }}
              >
                <span>{c.name}</span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: c.is_live ? "var(--sage)" : "var(--ash)",
                    border: `1px solid ${c.is_live ? "var(--sage)" : "var(--smoke)"}`,
                    borderRadius: 6,
                    padding: "2px 8px",
                  }}
                >
                  {c.is_live ? "Live" : "Paused"}
                </span>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
