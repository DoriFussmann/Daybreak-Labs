import { createAdminClient } from "@/lib/supabase/admin";
import { getCampaignDailyAnalytics } from "@/lib/instantly";

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function pullEmailAnalytics(opts?: { days?: number }): Promise<{
  campaignsPulled: number;
  rowsWritten: number;
  errors: string[];
}> {
  const days = opts?.days ?? 90;
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  const startDate = utcYmd(start);
  const endDate = utcYmd(end);

  const db = createAdminClient();
  const { data: mappings } = await db
    .from("client_campaigns")
    .select("client_id, list_type, external_campaign_id")
    .eq("channel", "email");

  const records: {
    client_id: string;
    channel: "email";
    list_type: string;
    snapshot_date: string;
    sent: number;
    opens: number;
    clicks: number;
    replies: number;
    delivered: number;
    bounces: number;
  }[] = [];
  const errors: string[] = [];
  let campaignsPulled = 0;

  for (const mapping of mappings ?? []) {
    const campaignId = mapping.external_campaign_id?.trim();
    if (!campaignId) continue;
    campaignsPulled += 1;
    const daily = await getCampaignDailyAnalytics(campaignId, startDate, endDate);
    for (const row of daily) {
      records.push({
        client_id: mapping.client_id,
        channel: "email",
        list_type: mapping.list_type,
        snapshot_date: row.date,
        sent: row.sent,
        opens: row.opens,
        clicks: row.clicks,
        replies: row.replies,
        delivered: 0,
        bounces: 0,
      });
    }
  }

  if (records.length > 0) {
    const { error } = await db.from("metric_snapshots").upsert(records, {
      onConflict: "client_id,channel,list_type,snapshot_date",
    });
    if (error) errors.push(error.message);
  }

  return { campaignsPulled, rowsWritten: records.length, errors };
}
