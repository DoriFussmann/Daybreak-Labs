const BASE = "https://api.instantly.ai/api/v2";
export type LeadPush = { email: string; first_name?: string; last_name?: string; company_name?: string };

function instantlyHeaders() {
  return { "Authorization": `Bearer ${process.env.INSTANTLY_API_KEY!}`, "Content-Type": "application/json" };
}

export async function addLeadToCampaign(campaignId: string, lead: LeadPush) {
  const res = await fetch(`${BASE}/leads`, {
    method: "POST",
    headers: instantlyHeaders(),
    body: JSON.stringify({
      campaign: campaignId,
      email: lead.email,
      first_name: lead.first_name,
      last_name: lead.last_name,
      company_name: lead.company_name,
      skip_if_in_workspace: true,
    }),
  });
  if (!res.ok) throw new Error(`Instantly ${res.status}: ${await res.text()}`);
  return res.json();
}

export type CampaignInfo = { name: string; status: string | null };

const INSTANTLY_STATUS: Record<number, string> = {
  [-99]: "suspended",
  [-2]: "unhealthy",
  [-1]: "unhealthy",
  0: "draft",
  1: "active",
  2: "paused",
  3: "completed",
  4: "active",
};

function campaignStatus(raw: unknown): string | null {
  if (typeof raw === "string" && raw.trim()) return raw.trim().toLowerCase();
  if (typeof raw === "number" && INSTANTLY_STATUS[raw]) return INSTANTLY_STATUS[raw];
  return null;
}

export async function getCampaignInfo(campaignId: string): Promise<CampaignInfo | null> {
  const id = campaignId.trim();
  const key = process.env.INSTANTLY_API_KEY;
  if (!id || !key) return null;
  try {
    const res = await fetch(`${BASE}/campaigns/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const name = typeof data?.name === "string" && data.name.trim() ? data.name.trim() : null;
    if (!name) return null;
    return { name, status: campaignStatus(data?.status) };
  } catch {
    return null;
  }
}

export async function getCampaignName(campaignId: string): Promise<string | null> {
  const info = await getCampaignInfo(campaignId);
  return info?.name ?? null;
}

