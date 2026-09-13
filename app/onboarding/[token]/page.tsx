import { createAdminClient } from "@/lib/supabase/admin";
import { notifyOnboarding } from "@/lib/notify";
import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      <div style={{ height: 64, borderBottom: "1px solid var(--smoke)", background: "#FFFFFF" }}>
        <div
          style={{
            maxWidth: 1160,
            height: "100%",
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 300, color: "var(--ink)", letterSpacing: "-0.02em" }}>
            InMarketLabs
          </span>
          <span style={{ fontSize: 13, color: "var(--ash)" }}>Franchisee Candidate Development · National</span>
        </div>
      </div>
      <div style={{ maxWidth: wide ? 1160 : 640, margin: "0 auto", padding: "0 24px" }}>{children}</div>
    </div>
  );
}

export default async function OnboardingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = createAdminClient();

  const { data: tok } = await db
    .from("onboarding_tokens")
    .select("token, kind, client_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  const invalid =
    !tok ||
    tok.kind !== "onboarding" ||
    !tok.client_id ||
    (tok.expires_at ? new Date(tok.expires_at) < new Date() : false);

  if (invalid) {
    return (
      <Shell>
        <div style={{ padding: "64px 0" }}>
          <h1 style={{ margin: 0 }}>Link unavailable</h1>
          <p style={{ color: "var(--ash)", marginTop: 12 }}>This onboarding link is not valid or has expired.</p>
        </div>
      </Shell>
    );
  }

  const { data: client } = await db.from("clients").select("*").eq("id", tok!.client_id).single();
  if (!client) {
    return (
      <Shell>
        <div style={{ padding: "64px 0" }}>
          <h1 style={{ margin: 0 }}>Link unavailable</h1>
          <p style={{ color: "var(--ash)", marginTop: 12 }}>We couldn&rsquo;t find this record.</p>
        </div>
      </Shell>
    );
  }

  if (!client.onboarding_opened_at) {
    await db.from("clients").update({ onboarding_opened_at: new Date().toISOString() }).eq("id", client.id);
    await notifyOnboarding("client_opened", client);
  }

  return (
    <Shell wide>
      <OnboardingForm token={token} client={client} alreadySigned={Boolean(client.signed_at)} />
    </Shell>
  );
}
