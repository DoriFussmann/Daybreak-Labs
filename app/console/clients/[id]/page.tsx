import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addTerritory, removeTerritory, saveCampaigns, setLive } from "../actions";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card" style={{ padding: "36px 32px", marginTop: 24 }}>
      <h3 style={{ marginBottom: 24 }}>{title}</h3>
      {children}
    </section>
  );
}

export default async function ClientZone({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = createAdminClient();
  const { data: client } = await db
    .from("clients")
    .select("id, name, is_live")
    .eq("id", id)
    .single();
  if (!client) notFound();

  const { data: campaigns } = await db
    .from("client_campaigns")
    .select("list_type, external_campaign_id")
    .eq("client_id", id)
    .eq("channel", "email");
  const { data: territories } = await db
    .from("client_territories")
    .select("id, state, city")
    .eq("client_id", id)
    .order("state");

  const campaignByType = Object.fromEntries(
    (campaigns ?? []).map((c) => [c.list_type, c.external_campaign_id]),
  );

  async function onSaveCampaigns(formData: FormData) {
    "use server";
    await saveCampaigns(id, {
      fs: String(formData.get("fs") ?? ""),
      cc: String(formData.get("cc") ?? ""),
      hi: String(formData.get("hi") ?? ""),
    });
  }

  async function onAddTerritory(formData: FormData) {
    "use server";
    await addTerritory(id, String(formData.get("state") ?? ""), String(formData.get("city") ?? ""));
  }

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
          DaybreakLabs
        </a>
        <form action={signOut}>
          <button type="submit" className="btn btn-ghost">
            Sign out
          </button>
        </form>
      </header>

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 24px" }}>
        <a href="/console/clients" style={{ fontSize: 14 }}>
          Clients
        </a>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginTop: 16,
          }}
        >
          <h2 style={{ margin: 0 }}>{client.name}</h2>
          <form action={setLive.bind(null, client.id, !client.is_live)}>
            <button type="submit" className="btn btn-ghost">
              {client.is_live ? "Pause" : "Set live"}
            </button>
          </form>
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: 12,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: client.is_live ? "var(--sage)" : "var(--ash)",
            border: `1px solid ${client.is_live ? "var(--sage)" : "var(--smoke)"}`,
            borderRadius: 6,
            padding: "2px 8px",
          }}
        >
          {client.is_live ? "Live" : "Paused"}
        </div>

        <Section title="Instantly">
          <form action={onSaveCampaigns}>
            <div style={{ marginBottom: 20 }}>
              <div className="label" style={{ marginBottom: 8 }}>FS campaign ID</div>
              <input
                className="input mono"
                name="fs"
                defaultValue={campaignByType.FS ?? ""}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div className="label" style={{ marginBottom: 8 }}>CC campaign ID</div>
              <input
                className="input mono"
                name="cc"
                defaultValue={campaignByType.CC ?? ""}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <div className="label" style={{ marginBottom: 8 }}>HI campaign ID</div>
              <input
                className="input mono"
                name="hi"
                defaultValue={campaignByType.HI ?? ""}
              />
            </div>
            <button className="btn" type="submit">
              Save
            </button>
          </form>
        </Section>

        <Section title="Territories">
          {(territories ?? []).length === 0 ? (
            <p style={{ color: "var(--ash)", marginBottom: 24 }}>No territories yet.</p>
          ) : (
            <div style={{ marginBottom: 24 }}>
              {(territories ?? []).map((t, i) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "12px 0",
                    borderTop: i === 0 ? "none" : "1px solid var(--smoke)",
                  }}
                >
                  <span>
                    <span className="mono">{t.state}</span>
                    <span style={{ color: "var(--ash)", marginLeft: 12 }}>
                      {t.city ? t.city : "whole state"}
                    </span>
                  </span>
                  <form action={removeTerritory.bind(null, t.id)}>
                    <button
                      type="submit"
                      className="btn btn-ghost"
                      style={{ color: "var(--cinnabar)", height: 36, padding: "0 14px" }}
                    >
                      Remove
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}

          <form action={onAddTerritory} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>State</div>
              <input className="input mono" name="state" maxLength={2} placeholder="CA" style={{ width: 80 }} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div className="label" style={{ marginBottom: 8 }}>City</div>
              <input className="input" name="city" placeholder="Whole state if empty" />
            </div>
            <button className="btn" type="submit">
              Add
            </button>
          </form>
        </Section>
      </div>
    </div>
  );
}
