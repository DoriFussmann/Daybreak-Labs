import { headers } from "next/headers";
import { Check, Circle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { onboardingStage, levelLabel } from "@/lib/onboarding";
import { StatusBadge } from "../client-fields";
import { OnboardingControls } from "./onboarding-controls";

async function baseUrl() {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}

export async function OnboardingPanel({ clientId }: { clientId: string }) {
  const db = createAdminClient();
  const { data: c } = await db
    .from("clients")
    .select(
      "id, name, company_name, key_contact, second_contact, level, invoice_url, paid, intake_submitted_at, ready_at, sent_at, onboarding_opened_at, assets_submitted_at, signed_at, signature_name, terms_agreed_at",
    )
    .eq("id", clientId)
    .maybeSingle();

  if (!c) return null;

  const stage = onboardingStage(c);
  const { data: tok } = await db
    .from("onboarding_tokens")
    .select("token")
    .eq("kind", "onboarding")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const onboardingUrl = tok?.token ? `${await baseUrl()}/onboarding/${tok.token}` : null;

  const checklist: { label: string; done: boolean }[] = [
    { label: "Intake submitted", done: Boolean(c.intake_submitted_at) },
    { label: "Invoice link added", done: Boolean(c.invoice_url) },
    { label: "Marked ready", done: Boolean(c.ready_at) },
    { label: "Sent to client", done: Boolean(c.sent_at) },
    { label: "Client opened", done: Boolean(c.onboarding_opened_at) },
    { label: "Assets received", done: Boolean(c.assets_submitted_at) },
    { label: `Signed${c.signed_at ? ` (${c.signature_name ?? ""})` : ""}`, done: Boolean(c.signed_at) },
    { label: "Paid", done: Boolean(c.paid) },
  ];

  return (
    <section className="card" style={{ padding: "36px 32px", marginTop: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Onboarding</h3>
          <span style={{ color: "var(--ash)", fontSize: 13 }}>Selected level: {levelLabel(c.level)}</span>
        </div>
        <StatusBadge label={stage.label} tone={stage.tone} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 10,
          marginBottom: 28,
        }}
      >
        {checklist.map((item) => (
          <div
            key={item.label}
            style={{
              padding: "10px 12px",
              border: item.done ? "1px solid var(--sage)" : "1px solid var(--smoke)",
              borderRadius: 6,
              fontSize: 13,
              color: item.done ? "var(--ink)" : "var(--ash)",
              background: item.done ? "rgba(58,125,94,.08)" : "transparent",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {item.done ? (
              <Check size={16} strokeWidth={1.5} color="var(--sage)" aria-hidden style={{ flexShrink: 0 }} />
            ) : (
              <Circle size={16} strokeWidth={1.5} color="var(--smoke)" aria-hidden style={{ flexShrink: 0 }} />
            )}
            {item.label}
          </div>
        ))}
      </div>

      <OnboardingControls
        clientId={clientId}
        invoiceUrl={c.invoice_url ?? ""}
        paid={Boolean(c.paid)}
        readyAt={c.ready_at ?? null}
        sentAt={c.sent_at ?? null}
        onboardingUrl={onboardingUrl}
        contactName={c.key_contact ?? null}
        secondContactName={c.second_contact ?? null}
        companyName={c.company_name ?? c.name ?? null}
      />
    </section>
  );
}
