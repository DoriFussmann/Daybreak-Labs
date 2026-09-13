import { createAdminClient } from "@/lib/supabase/admin";
import { IntakeForm } from "./intake-form";

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--parchment)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ fontSize: 20, fontWeight: 300, color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: 40 }}>
          InMarketLabs
        </div>
        {children}
      </div>
    </div>
  );
}

export default async function IntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = createAdminClient();
  const { data: tok } = await db
    .from("onboarding_tokens")
    .select("token, kind, expires_at")
    .eq("token", token)
    .maybeSingle();

  // Permanent, reusable link: valid as long as it exists, is an intake link, and hasn't expired.
  const invalid =
    !tok ||
    tok.kind !== "intake" ||
    (tok.expires_at ? new Date(tok.expires_at) < new Date() : false);

  if (invalid) {
    return (
      <Shell>
        <h1 style={{ margin: 0 }}>Link unavailable</h1>
        <p style={{ color: "var(--ash)", marginTop: 12 }}>This link is not valid or has expired.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 style={{ margin: 0 }}>New Client Intake</h1>
      <p style={{ color: "var(--ash)", marginTop: 12, lineHeight: 1.7 }}>
        Fill in whatever you already know. Leave the rest blank — the client completes it later. Nothing here is shown to
        the client except where noted. You can submit as many clients as you like from this same link.
      </p>
      <IntakeForm token={token} />
    </Shell>
  );
}
