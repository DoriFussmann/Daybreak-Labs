import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCampaignInfo } from "@/lib/instantly";
import { getHeyReachCampaignName } from "@/lib/heyreach";
import { getPost4MeAccountName } from "@/lib/post4me";
import {
  Cols,
  Field,
  ReadValue,
  Section,
  StatusCell,
  connectionStatus,
  hrefFor,
  instantlyStatus,
} from "@/app/console/clients/client-fields";

export default async function PortalAccount() {
  const session = await requireSession();
  const id = session.clientIds[0];
  if (!id) redirect("/login");

  const db = createAdminClient();
  const { data: clientRow } = await db
    .from("clients")
    .select("id, name, is_live, paid, posting_mode, created_at, client_type")
    .eq("id", id)
    .single();
  if (!clientRow) redirect("/login");
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

  return (
    <>
      <Section
        title="General"
        meta={<span style={{ color: "var(--ash)", fontSize: 13 }}>Created {createdLabel}</span>}
      >
        <Cols>
          <Field label="Client name">
            <ReadValue>{client.name}</ReadValue>
          </Field>
          <Field label="Company name">
            <ReadValue empty={!client.company_name}>{client.company_name ?? "—"}</ReadValue>
          </Field>
          <Field label="Client type">
            <ReadValue empty={!client.client_type}>{client.client_type ?? "—"}</ReadValue>
          </Field>
          <Field label="Website">
            {client.website ? (
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
            <ReadValue empty={!client.key_contact}>{client.key_contact ?? "—"}</ReadValue>
          </Field>
          <Field label="Key contact email">
            <ReadValue empty={!client.key_contact_email}>{client.key_contact_email ?? "—"}</ReadValue>
          </Field>
          <Field label="Phone">
            <ReadValue empty={!client.phone}>{client.phone ?? "—"}</ReadValue>
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
    </>
  );
}
