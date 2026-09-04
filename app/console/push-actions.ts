"use server";
import { assertAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addLeadToCampaign } from "@/lib/instantly";

export async function pushToInstantly() {
  await assertAdmin();
  const db = createAdminClient();

  const { data: campaigns } = await db.from("client_campaigns")
    .select("client_id, list_type, external_campaign_id").eq("channel", "email");
  const campMap = new Map<string, string>();
  for (const c of campaigns ?? []) {
    if (c.external_campaign_id) campMap.set(`${c.client_id}:${c.list_type}`, c.external_campaign_id);
  }

  const { data: leads } = await db.from("leads")
    .select("id, owning_client_id, email, first_name, last_name, company_name, source_lists")
    .is("pushed_at", null)
    .not("email", "is", null);

  let pushed = 0, skipped = 0;
  const errors: string[] = [];

  for (const lead of leads ?? []) {
    let didPush = false;
    for (const list of (lead.source_lists ?? [])) {
      const campaignId = campMap.get(`${lead.owning_client_id}:${list}`);
      if (!campaignId) { skipped++; continue; }
      try {
        await addLeadToCampaign(campaignId, {
          email: lead.email,
          first_name: lead.first_name ?? undefined,
          last_name: lead.last_name ?? undefined,
          company_name: lead.company_name ?? undefined,
        });
        pushed++; didPush = true;
      } catch (e: any) { errors.push(e.message); }
    }
    if (didPush) await db.from("leads").update({ pushed_at: new Date().toISOString() }).eq("id", lead.id);
  }

  return { ok: true as const, pushed, skipped, errorCount: errors.length, sampleErrors: errors.slice(0, 3) };
}
