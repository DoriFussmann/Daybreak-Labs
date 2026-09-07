import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Section, StatusBadge } from "@/app/console/clients/client-fields";
import { DraftPicker } from "./draft-picker";

export default async function PortalPost4Me() {
  const session = await requireSession();
  const clientId = session.clientIds[0];
  if (!clientId) redirect("/login");

  const db = await createClient();
  const cycleQuery = await db
    .from("post_cycles")
    .select("id, cycle_date, status, sent_at, approved_at")
    .eq("client_id", clientId)
    .not("sent_at", "is", null)
    .order("cycle_date", { ascending: false })
    .limit(8);
  const cycles =
    cycleQuery.error && /sent_at|PGRST204/i.test(cycleQuery.error.message)
      ? []
      : (cycleQuery.data ?? []);
  const pending = cycles.find((c) => c.status !== "approved") ?? null;
  const latestApproved = cycles.find((c) => c.status === "approved") ?? null;
  const cycle = pending ?? latestApproved;

  const { data: drafts } = cycle
    ? await db
        .from("post_candidates")
        .select("id, variant, body, chosen")
        .eq("cycle_id", cycle.id)
        .order("variant")
    : { data: [] };

  const canPick = Boolean(pending && pending.status !== "approved");
  const chosen = (drafts ?? []).filter((d) => d.chosen);

  return (
    <div>
      <h2 style={{ margin: 0 }}>Post4Me</h2>
      <p style={{ color: "var(--ash)", marginTop: 8, maxWidth: 680 }}>
        When a proposal is sent, pick two posts to approve.
      </p>

      <Section
        title="Posts"
        meta={
          cycle ? (
            <StatusBadge
              label={canPick ? "Awaiting approval" : "Approved"}
              tone={canPick ? "warn" : "ok"}
            />
          ) : undefined
        }
      >
        {!cycle ? (
          <p style={{ color: "var(--ash)", margin: 0 }}>No posts waiting on you.</p>
        ) : canPick ? (
          <DraftPicker
            clientId={clientId}
            cycleId={cycle.id}
            drafts={(drafts ?? []).map((d) => ({
              id: d.id,
              variant: Number(d.variant),
              body: d.body,
            }))}
          />
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {(chosen.length ? chosen : drafts ?? []).map((draft) => (
              <div
                key={draft.id}
                style={{
                  padding: 24,
                  border: "1px solid var(--smoke)",
                  borderRadius: 10,
                  boxShadow: draft.chosen ? "inset 3px 0 0 var(--brass)" : undefined,
                }}
              >
                <div className="label" style={{ marginBottom: 8 }}>
                  Post {draft.variant}
                </div>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{draft.body}</div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
