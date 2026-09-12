import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "../clients/client-fields";
import { onboardingStage } from "@/lib/onboarding";
import { NewIntake } from "./new-intake";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await requireAdmin();
  const db = createAdminClient();

  const { data: clients } = await db
    .from("clients")
    .select(
      "id, name, intake_submitted_at, ready_at, sent_at, onboarding_opened_at, signed_at, paid, created_at",
    )
    .order("created_at", { ascending: false });

  // Only clients that have entered onboarding (skip ones created directly, pre-module).
  const inFlight = (clients ?? []).filter((c) => c.intake_submitted_at || c.sent_at || c.ready_at);

  return (
    <div>
      <div>
        <h2 style={{ margin: 0 }}>Onboarding</h2>
        <p style={{ color: "var(--ash)", marginTop: 8, maxWidth: 680 }}>
          Create an intake link for Jay, then track each client from intake to Day 0.
        </p>
      </div>

      <section className="card" style={{ padding: "28px 32px", marginTop: 32 }}>
        <h3 style={{ margin: "0 0 16px" }}>New Client Intake</h3>
        <NewIntake />
      </section>

      <section className="card" style={{ marginTop: 24, padding: "8px 0" }}>
        {inFlight.length === 0 ? (
          <div style={{ padding: "24px 32px", color: "var(--ash)" }}>No clients in onboarding yet.</div>
        ) : (
          inFlight.map((c, i) => {
            const stage = onboardingStage(c);
            return (
              <a
                key={c.id}
                href={`/console/clients/${c.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: "18px 32px",
                  borderTop: i === 0 ? "none" : "1px solid var(--smoke)",
                  color: "var(--ink)",
                }}
              >
                <span style={{ fontSize: 15 }}>{c.name}</span>
                <StatusBadge label={stage.label} tone={stage.tone} />
              </a>
            );
          })
        )}
      </section>
    </div>
  );
}
