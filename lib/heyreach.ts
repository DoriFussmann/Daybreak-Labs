const BASE = "https://api.heyreach.io/api/public";

export async function getHeyReachCampaignName(campaignId: string): Promise<string | null> {
  const id = campaignId.trim();
  const key = process.env.HEYREACH_API_KEY;
  if (!id || !key) return null;
  try {
    const res = await fetch(`${BASE}/campaign/GetById?campaignId=${encodeURIComponent(id)}`, {
      headers: { "X-API-KEY": key },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const name = data?.name ?? data?.campaign?.name;
    return typeof name === "string" && name.trim() ? name.trim() : null;
  } catch {
    return null;
  }
}
