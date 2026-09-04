import { notFound, redirect } from "next/navigation";
import { canAccessClient, homePath, requireSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addTerritory, removeTerritory, saveCampaigns, saveClientDetails, saveLinked } from "../actions";
import { BackLink } from "../../back-link";
import { LiveToggle } from "../../live-toggle";
import { DangerZone } from "../danger-zone";
import { Dropdown } from "@/app/ui/dropdown";
import { ClientTypeField } from "./client-type-field";
import {
  Cols,
  Field,
  ReadValue,
  Section,
  StatusBadge,
  StatusCell,
  connectionStatus,
  hrefFor,
  instantlyStatus,
} from "../client-fields";
import { getCampaignInfo } from "@/lib/instantly";
import { getHeyReachCampaignName } from "@/lib/heyreach";
import { getPost4MeAccountName } from "@/lib/post4me";

function SaveButton() {
  return (
    <button className="btn" type="submit" style={{ height: 36, padding: "0 16px" }}>
      Save
    </button>
  );
}

export default async function ClientZone({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  if (!canAccessClient(session, id)) redirect(homePath(session));
  const isAdmin = session.isAdmin;

  const db = createAdminClient();
  const { data: clientRow } = await db
    .from("clients")
    .select("id, name, is_live, paid, posting_mode, created_at, client_type")
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
    client_type: clientRow.client_type ?? null,
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
      clientType:
        String(formData.get("client_type_custom") ?? "").trim() ||
        String(formData.get("client_type") ?? "").replace(/^__custom__$/, ""),
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
      {isAdmin || session.clientIds.length > 1 ? (
          <BackLink href="/console/clients" label={isAdmin ? "Back to clients" : "Your clients"} />
        ) : null}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginTop: isAdmin || session.clientIds.length > 1 ? 16 : 0,
          }}
        >
          <h2 style={{ margin: 0 }}>{client.name}</h2>
          {isAdmin ? (
            <LiveToggle clientId={client.id} isLive={client.is_live} />
          ) : (
            <StatusBadge label={client.is_live ? "Live" : "Paused"} tone={client.is_live ? "ok" : "off"} />
          )}
        </div>

        <form action={isAdmin ? onSaveDetails : undefined}>
          <Section
            title="General"
            meta={<span style={{ color: "var(--ash)", fontSize: 13 }}>Created {createdLabel}</span>}
            action={isAdmin ? <SaveButton /> : undefined}
          >
            <Cols>
              <Field label="Client name">
                {isAdmin ? (
                  <input className="input" name="name" defaultValue={client.name} required />
                ) : (
                  <ReadValue>{client.name}</ReadValue>
                )}
              </Field>
              <Field label="Company name">
                {isAdmin ? (
                  <input className="input" name="company_name" defaultValue={client.company_name ?? ""} />
                ) : (
                  <ReadValue empty={!client.company_name}>{client.company_name ?? "—"}</ReadValue>
                )}
              </Field>
              <Field label="Client type">
                {isAdmin ? (
                  <ClientTypeField value={client.client_type} />
                ) : (
                  <ReadValue empty={!client.client_type}>{client.client_type ?? "—"}</ReadValue>
                )}
              </Field>
              <Field label="Website">
                {isAdmin ? (
                  <input className="input" name="website" defaultValue={client.website ?? ""} placeholder="https://" />
                ) : client.website ? (
                  <ReadValue>
                    <a href={hrefFor(client.website)} target="_blank" rel="noreferrer">
                      {client.website}
                    </a>
                  </ReadValue>
                ) : (
                  <ReadValue empty>—</ReadValue>
                )}
              </Field>
              <Field label="Key contact">
                {isAdmin ? (
                  <input className="input" name="key_contact" defaultValue={client.key_contact ?? ""} />
                ) : (
                  <ReadValue empty={!client.key_contact}>{client.key_contact ?? "—"}</ReadValue>
                )}
              </Field>
              <Field label="Key contact email">
                {isAdmin ? (
                  <input
                    className="input"
                    type="email"
                    name="key_contact_email"
                    defaultValue={client.key_contact_email ?? ""}
                  />
                ) : (
                  <ReadValue empty={!client.key_contact_email}>{client.key_contact_email ?? "—"}</ReadValue>
                )}
              </Field>
              <Field label="Phone">
                {isAdmin ? (
                  <input className="input" type="tel" name="phone" defaultValue={client.phone ?? ""} />
                ) : (
                  <ReadValue empty={!client.phone}>{client.phone ?? "—"}</ReadValue>
                )}
              </Field>
              {isAdmin ? (
                <>
                  <Field label="Site pixel">
                    <input className="input mono" name="site_pixel" defaultValue={client.site_pixel ?? ""} />
                  </Field>
                  <Field label="Paid">
                    <Dropdown
                      name="paid"
                      defaultValue={client.paid ? "true" : "false"}
                      options={[
                        { value: "false", label: "Unpaid" },
                        { value: "true", label: "Paid" },
                      ]}
                    />
                  </Field>
                  <Field label="Posting mode">
                    <Dropdown
                      name="posting_mode"
                      defaultValue={client.posting_mode}
                      options={[
                        { value: "opt_out", label: "Opt-out" },
                        { value: "opt_in", label: "Opt-in" },
                      ]}
                    />
                  </Field>
                </>
              ) : null}
            </Cols>
            {isAdmin ? (
              <p style={{ color: "var(--ash)", fontSize: 13, marginTop: 16 }}>
                The key contact email can sign in as this client.
              </p>
            ) : null}

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

        {isAdmin ? (
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
        ) : (
          <Section title="Instantly">
            <Cols>
              {campaignFields.map((field, i) => {
                const name = campaignNames[i];
                const empty = !field.id || !name;
                return (
                  <Field key={field.key} label={`${field.list} campaign`}>
                    <ReadValue empty={empty}>
                      {!field.id ? "—" : name ?? "Not found in Instantly"}
                    </ReadValue>
                  </Field>
                );
              })}
            </Cols>
          </Section>
        )}

        {isAdmin ? (
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
        ) : (
          <Section title="LinkedIn">
            <Cols>
              <Field label="HeyReach">
                <ReadValue empty={!heyreachId || !heyreachName}>
                  {!heyreachId ? "—" : heyreachName ?? "—"}
                </ReadValue>
              </Field>
              <Field label="Post4Me">
                <ReadValue empty={!post4meId || !post4meName}>
                  {!post4meId ? "—" : post4meName ?? "—"}
                </ReadValue>
              </Field>
              <Field label="Profile">
                {linkedinUrl ? (
                  <ReadValue>
                    <a href={hrefFor(linkedinUrl)} target="_blank" rel="noreferrer">
                      {linkedinUrl}
                    </a>
                  </ReadValue>
                ) : (
                  <ReadValue empty>—</ReadValue>
                )}
              </Field>
            </Cols>
          </Section>
        )}

        <Section title="Territories">
          {(territories ?? []).length === 0 ? (
            <p style={{ color: "var(--ash)", marginBottom: isAdmin ? 24 : 0 }}>No territories yet.</p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 16,
                marginBottom: isAdmin ? 24 : 0,
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
                  {isAdmin ? (
                    <form action={removeTerritory.bind(null, t.id)}>
                      <button
                        type="submit"
                        className="btn btn-ghost"
                        style={{ color: "var(--cinnabar)", height: 32, padding: "0 10px", flexShrink: 0 }}
                      >
                        Remove
                      </button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {isAdmin ? (
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
          ) : null}
        </Section>

      {isAdmin ? <DangerZone clientId={client.id} clientName={client.name} /> : null}
    </div>
  );
}
