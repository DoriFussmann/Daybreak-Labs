import { createAdminClient } from "@/lib/supabase/admin";
import { notifyOnboarding } from "@/lib/notify";
import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ fontSize: 20, fontWeight: 300, color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: 40 }}>
          InMarketLabs
        </div>
        {children}
      </div>
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
        <h1 style={{ margin: 0 }}>Link unavailable</h1>
        <p style={{ color: "var(--ash)", marginTop: 12 }}>This onboarding link is not valid or has expired.</p>
      </Shell>
    );
  }

  const { data: client } = await db.from("clients").select("*").eq("id", tok!.client_id).single();
  if (!client) {
    return (
      <Shell>
        <h1 style={{ margin: 0 }}>Link unavailable</h1>
        <p style={{ color: "var(--ash)", marginTop: 12 }}>We couldn&rsquo;t find this record.</p>
      </Shell>
    );
  }

  // Record first open (once) and notify the operator.
  if (!client.onboarding_opened_at) {
    await db.from("clients").update({ onboarding_opened_at: new Date().toISOString() }).eq("id", client.id);
    await notifyOnboarding("client_opened", client);
  }

  const alreadySigned = Boolean(client.signed_at);

  return (
    <Shell>
      <h1 style={{ margin: 0 }}>Welcome{client.key_contact ? `, ${client.key_contact}` : ""}</h1>
      <p style={{ color: "var(--ash)", marginTop: 12, lineHeight: 1.7 }}>
        A couple of steps to get your program built: confirm your details, review and sign the service order, and complete
        payment. Anything already filled in was set up for you — leave it as is unless it needs changing.
      </p>
      <OnboardingForm token={token} client={client} alreadySigned={alreadySigned} />
    </Shell>
  );
}
