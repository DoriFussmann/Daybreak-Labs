import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addTerritory, removeTerritory, saveCampaigns, saveClientDetails, saveLinked } from "../actions";
import { BackLink } from "../../back-link";
import { LiveToggle } from "../../live-toggle";
import { DangerZone } from "../danger-zone";
import { getCampaignInfo } from "@/lib/instantly";
import { getHeyReachCampaignName } from "@/lib/heyreach";
import { getPost4MeAccountName } from "@/lib/post4me";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function ReadValue({ children, empty }: { children: React.ReactNode; empty?: boolean }) {
  return (
    <div
      style={{
        minHeight: 44,
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        border: "1px solid var(--smoke)",
        borderRadius: 6,
        background: "var(--parchment)",
        color: empty ? "var(--ash)" : "var(--ink)",
        fontSize: 14,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

function hrefFor(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function Section({
  title,
  action,
  meta,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card" style={{ padding: "36px 32px", marginTop: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, minWidth: 0 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {meta}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SaveButton() {
  return (
    <button className="btn" type="submit" style={{ height: 36, padding: "0 16px" }}>
      Save
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="label" style={{ marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function Cols({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 16,
        width: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

type Tone = "ok" | "warn" | "off" | "bad";

function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  const color =
    tone === "ok" ? "var(--sage)" :
    tone === "warn" ? "var(--amber)" :
    tone === "bad" ? "var(--cinnabar)" :
    "var(--ash)";
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${tone === "off" ? "var(--smoke)" : color}`,
        borderRadius: 6,
        padding: "2px 8px",
      }}
    >
      {label}
    </span>
  );
}

function StatusCell({ title, label, tone }: { title: string; label: string; tone: Tone }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 8 }}>{title}</div>
      <div
        style={{
          minHeight: 44,
          display: "flex",
          alignItems: "center",
        }}
      >
        <StatusBadge label={label} tone={tone} />
      </div>
    </div>
  );
}

function connectionStatus(id: string, resolved: boolean, hasKey: boolean): { label: string; tone: Tone } {
  if (!id) return { label: "Not connected", tone: "off" };
  if (!hasKey) return { label: "ID saved", tone: "warn" };
  if (resolved) return { label: "Connected", tone: "ok" };
  return { label: "Not found", tone: "bad" };
}

function instantlyStatus(
  id: string,
  info: { name: string; status: string | null } | null,
  hasKey: boolean,
): { label: string; tone: Tone } {
  if (!id) return { label: "Not set", tone: "off" };
  if (!hasKey) return { label: "ID saved", tone: "warn" };
  if (!info) return { label: "Not found", tone: "bad" };
  const s = info.status;
  if (s === "paused") return { label: "Paused", tone: "warn" };
  if (s === "draft") return { label: "Draft", tone: "warn" };
  if (s === "completed") return { label: "Completed", tone: "off" };
  if (s === "suspended") return { label: "Suspended", tone: "bad" };
  if (s === "unhealthy") return { label: "Unhealthy", tone: "bad" };
  if (s === "active") return { label: "Active", tone: "ok" };
  return { label: "Ready", tone: "ok" };
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
  const { data: clientRow } = await db
    .from("clients")
    .select("id, name, is_live, paid, posting_mode, created_at")
    .eq("id", id)
    .single();
  if (!clientRow) notFound();
  const { data: extras } = await db
    .from("clients")
    .select("company_name, key_contact, key_contact_email, phone, website, site_pixel")
    .eq("id", id)
    .maybeSingle();
  const client = {
    ...clientRow,
    company_name: extras?.company_name ?? null,
    key_contact: extras?.key_contact ?? null,
    key_contact_email: extras?.key_contact_email ?? null,
    phone: extras?.phone ?? null,
    website: extras?.website ?? null,
    site_pixel: extras?.site_pixel ?? null,
  };

  const { data: campaigns } = await db
    .from("client_campaigns")
    .select("channel, list_type, external_campaign_id")
    .eq("client_id", id);
  const { data: territories } = await db
    .from("client_territories")
    .select("id, state, city")
    .eq("client_id", id)
    .order("state");

  const emailCampaigns = (campaigns ?? []).filter((c) => c.channel === "email");
  const linkedCampaigns = (campaigns ?? []).filter((c) => c.channel === "linkedin");

  const campaignByType = Object.fromEntries(
    emailCampaigns.map((c) => [c.list_type, c.external_campaign_id]),
  ) as Record<string, string | undefined>;
  const linkedByType = Object.fromEntries(
    linkedCampaigns.map((c) => [c.list_type, c.external_campaign_id]),
  ) as Record<string, string | undefined>;

  const campaignFields = [
    { key: "fs" as const, list: "FS", id: campaignByType.FS ?? "" },
    { key: "cc" as const, list: "CC", id: campaignByType.CC ?? "" },
    { key: "hi" as const, list: "HI", id: campaignByType.HI ?? "" },
  ];
  const campaignInfos = await Promise.all(
    campaignFields.map(async (field) => (field.id ? getCampaignInfo(field.id) : null)),
  );
  const campaignNames = campaignInfos.map((info) => info?.name ?? null);

  const heyreachId = linkedByType.FS ?? "";
  const post4meId = linkedByType.CC ?? "";
  const linkedinUrl = linkedByType.HI ?? "";
  const [heyreachName, post4meName] = await Promise.all([
    heyreachId ? getHeyReachCampaignName(heyreachId) : null,
    post4meId ? getPost4MeAccountName(post4meId) : null,
  ]);

  const heyreachConn = connectionStatus(heyreachId, Boolean(heyreachName), Boolean(process.env.HEYREACH_API_KEY));
  const post4meConn = connectionStatus(post4meId, Boolean(post4meName), Boolean(process.env.POST_FOR_ME_API_KEY));
  const hasInstantlyKey = Boolean(process.env.INSTANTLY_API_KEY);
  const instantlyStatuses = campaignFields.map((field, i) =>
    instantlyStatus(field.id, campaignInfos[i], hasInstantlyKey),
  );
  const createdLabel = new Date(client.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  async function onSaveDetails(formData: FormData) {
    "use server";
    const posting = String(formData.get("posting_mode") ?? "");
    await saveClientDetails(id, {
      name: String(formData.get("name") ?? ""),
      companyName: String(formData.get("company_name") ?? ""),
      keyContact: String(formData.get("key_contact") ?? ""),
      keyContactEmail: String(formData.get("key_contact_email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      website: String(formData.get("website") ?? ""),
      sitePixel: String(formData.get("site_pixel") ?? ""),
      paid: String(formData.get("paid") ?? "") === "true",
      postingMode: posting === "opt_in" ? "opt_in" : "opt_out",
    });
  }

  async function onSaveCampaigns(formData: FormData) {
    "use server";
    await saveCampaigns(id, {
      fs: String(formData.get("fs") ?? ""),
      cc: String(formData.get("cc") ?? ""),
      hi: String(formData.get("hi") ?? ""),
    });
  }

  async function onSaveLinked(formData: FormData) {
    "use server";
    await saveLinked(id, {
      heyreachId: String(formData.get("heyreach") ?? ""),
      post4meId: String(formData.get("post4me") ?? ""),
      linkedinUrl: String(formData.get("linkedin") ?? ""),
    });
  }

  async function onAddTerritory(formData: FormData) {
    "use server";
    await addTerritory(id, String(formData.get("state") ?? ""), String(formData.get("city") ?? ""));
  }

  return (
    <div>
      <header style={{ height: 64, borderBottom: "1px solid var(--smoke)" }}>
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
          <a href="/console" style={{ fontSize: 20, fontWeight: 300, color: "var(--ink)", letterSpacing: "-0.02em" }}>
            DaybreakLabs
          </a>
          <form action={signOut}>
            <button type="submit" className="btn btn-ghost">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 24px" }}>
        <BackLink href="/console/clients" label="Back to clients" />

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
          <LiveToggle clientId={client.id} isLive={client.is_live} />
        </div>

        <form action={onSaveDetails}>
          <Section
            title="General"
            meta={<span style={{ color: "var(--ash)", fontSize: 13 }}>Created {createdLabel}</span>}
            action={<SaveButton />}
          >
            <Cols>
              <Field label="Client name">
                <input className="input" name="name" defaultValue={client.name} required />
              </Field>
              <Field label="Company name">
                <input className="input" name="company_name" defaultValue={client.company_name ?? ""} />
              </Field>
              <Field label="Website">
                <input className="input" name="website" defaultValue={client.website ?? ""} placeholder="https://" />
              </Field>
              <Field label="Key contact">
                <input className="input" name="key_contact" defaultValue={client.key_contact ?? ""} />
              </Field>
              <Field label="Key contact email">
                <input
                  className="input"
                  type="email"
                  name="key_contact_email"
                  defaultValue={client.key_contact_email ?? ""}
                />
              </Field>
              <Field label="Phone">
                <input className="input" type="tel" name="phone" defaultValue={client.phone ?? ""} />
              </Field>
              <Field label="Site pixel">
                <input className="input mono" name="site_pixel" defaultValue={client.site_pixel ?? ""} />
              </Field>
              <Field label="Paid">
                <select className="input" name="paid" defaultValue={client.paid ? "true" : "false"}>
                  <option value="false">Unpaid</option>
                  <option value="true">Paid</option>
                </select>
              </Field>
              <Field label="Posting mode">
                <select className="input" name="posting_mode" defaultValue={client.posting_mode}>
                  <option value="opt_out">Opt-out</option>
                  <option value="opt_in">Opt-in</option>
                </select>
              </Field>
            </Cols>

            <div style={{ height: 1, background: "var(--smoke)", margin: "32px 0 24px" }} />

            <h4 style={{ marginBottom: 16 }}>LinkedIn connection</h4>
            <Cols style={{ marginBottom: 32 }}>
              <StatusCell title="HeyReach" label={heyreachConn.label} tone={heyreachConn.tone} />
              <StatusCell title="Post4Me" label={post4meConn.label} tone={post4meConn.tone} />
              <StatusCell
                title="Client profile"
                label={linkedinUrl ? "URL saved" : "Not set"}
                tone={linkedinUrl ? "ok" : "off"}
              />
            </Cols>

            <h4 style={{ marginBottom: 16 }}>Instantly campaigns</h4>
            <Cols>
              {campaignFields.map((field, i) => (
                <StatusCell
                  key={field.key}
                  title={field.list}
                  label={instantlyStatuses[i].label}
                  tone={instantlyStatuses[i].tone}
                />
              ))}
            </Cols>
          </Section>
        </form>

        <form action={onSaveCampaigns}>
          <Section title="Instantly" action={<SaveButton />}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              {campaignFields.map((field) => (
                <div key={field.key}>
                  <div className="label" style={{ marginBottom: 8 }}>{field.list} campaign ID</div>
                  <input
                    className="input mono"
                    name={field.key}
                    defaultValue={field.id}
                  />
                </div>
              ))}
              {campaignFields.map((field, i) => {
                const name = campaignNames[i];
                const empty = !field.id || !name;
                return (
                  <div key={`${field.key}-name`}>
                    <div className="label" style={{ marginBottom: 8 }}>Campaign name</div>
                    <ReadValue empty={empty}>
                      {!field.id ? "—" : name ?? "Not found in Instantly"}
                    </ReadValue>
                  </div>
                );
              })}
            </div>
          </Section>
        </form>

        <form action={onSaveLinked}>
          <Section title="LinkedIn" action={<SaveButton />}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 16,
              }}
            >
              <div>
                <div className="label" style={{ marginBottom: 8 }}>HeyReach ID</div>
                <input className="input mono" name="heyreach" defaultValue={heyreachId} />
              </div>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>Post4Me ID</div>
                <input className="input mono" name="post4me" defaultValue={post4meId} />
              </div>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>Client LinkedIn URL</div>
                <input
                  className="input"
                  name="linkedin"
                  defaultValue={linkedinUrl}
                  placeholder="https://www.linkedin.com/in/"
                />
              </div>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>Campaign name</div>
                <ReadValue empty={!heyreachId || !heyreachName}>
                  {!heyreachId ? "—" : heyreachName ?? (process.env.HEYREACH_API_KEY ? "Not found in HeyReach" : "—")}
                </ReadValue>
              </div>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>Account name</div>
                <ReadValue empty={!post4meId || !post4meName}>
                  {!post4meId ? "—" : post4meName ?? (process.env.POST_FOR_ME_API_KEY ? "Not found in Post4Me" : "—")}
                </ReadValue>
              </div>
              <div>
                <div className="label" style={{ marginBottom: 8 }}>Profile</div>
                {linkedinUrl ? (
                  <ReadValue>
                    <a href={hrefFor(linkedinUrl)} target="_blank" rel="noreferrer">
                      {linkedinUrl}
                    </a>
                  </ReadValue>
                ) : (
                  <ReadValue empty>—</ReadValue>
                )}
              </div>
            </div>
          </Section>
        </form>

        <Section title="Territories">
          {(territories ?? []).length === 0 ? (
            <p style={{ color: "var(--ash)", marginBottom: 24 }}>No territories yet.</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 16,
                marginBottom: 24,
              }}
            >
              {(territories ?? []).map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "12px 14px",
                    border: "1px solid var(--smoke)",
                    borderRadius: 6,
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span className="mono">{t.state}</span>
                    <span style={{ color: "var(--ash)", marginLeft: 8 }}>
                      {t.city ? t.city : "whole state"}
                    </span>
                  </span>
                  <form action={removeTerritory.bind(null, t.id)}>
                    <button
                      type="submit"
                      className="btn btn-ghost"
                      style={{ color: "var(--cinnabar)", height: 32, padding: "0 10px", flexShrink: 0 }}
                    >
                      Remove
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}

          <form action={onAddTerritory} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>State</div>
              <input className="input mono" name="state" maxLength={2} placeholder="CA" style={{ width: 80 }} />
            </div>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>City</div>
              <input className="input" name="city" placeholder="Whole state if empty" style={{ width: 220 }} />
            </div>
            <button className="btn" type="submit" style={{ width: "auto" }}>
              Add
            </button>
          </form>
        </Section>

        <DangerZone clientId={client.id} clientName={client.name} />
      </div>
    </div>
  );
}
