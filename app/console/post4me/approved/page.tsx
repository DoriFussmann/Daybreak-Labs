import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ApprovedPostsPage() {
  await requireAdmin();
  const db = createAdminClient();
  const { data: cycles } = await db
    .from("post_cycles")
    .select("id, client_id, cycle_date, approved_at")
    .eq("status", "approved")
    .order("approved_at", { ascending: false });

  const latestByClient = new Map<
    string,
    { client_id: string; cycle_date: string; approved_at: string | null }
  >();
  for (const cycle of cycles ?? []) {
    if (!latestByClient.has(cycle.client_id)) {
      latestByClient.set(cycle.client_id, cycle);
    }
  }
  const rows = [...latestByClient.values()];
  const clientIds = rows.map((r) => r.client_id);
  const { data: clients } = clientIds.length
    ? await db.from("clients").select("id, name").in("id", clientIds)
    : { data: [] };
  const nameById = Object.fromEntries((clients ?? []).map((c) => [c.id, c.name]));

  return (
    <div>
      <h2 style={{ margin: 0 }}>Approved Posts</h2>
      <p style={{ color: "var(--ash)", marginTop: 8, maxWidth: 680 }}>
        Clients who have approved a proposal. Open a row to read the two posts.
      </p>

      <div className="card" style={{ marginTop: 40, padding: "8px 0" }}>
        {rows.length === 0 ? (
          <div style={{ padding: "24px 32px", color: "var(--ash)" }}>No approved posts yet.</div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 160px 160px",
                gap: 16,
                padding: "12px 24px",
              }}
            >
              <span className="label">Client</span>
              <span className="label">Cycle date</span>
              <span className="label">Approved</span>
            </div>
            {rows.map((row, i) => (
              <Link
                key={row.client_id}
                href={`/console/post4me/approved/${row.client_id}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 160px 160px",
                  gap: 16,
                  padding: "16px 24px",
                  borderTop: "1px solid var(--smoke)",
                  color: "var(--ink)",
                  fontWeight: 400,
                }}
                data-first={i === 0 ? "true" : undefined}
              >
                <span>{nameById[row.client_id] ?? "Unknown"}</span>
                <span className="mono" style={{ color: "var(--ash)" }}>
                  {row.cycle_date}
                </span>
                <span style={{ color: "var(--ash)" }}>{formatDate(row.approved_at)}</span>
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
