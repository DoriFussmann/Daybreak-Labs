const BASE = "https://api.instantly.ai/api/v2";
export type LeadPush = { email: string; first_name?: string; last_name?: string; company_name?: string };
export async function addLeadToCampaign(campaignId: string, lead: LeadPush) {
  const res = await fetch(`${BASE}/leads`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.INSTANTLY_API_KEY!}`, "Content-Type": "application/json" },
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
