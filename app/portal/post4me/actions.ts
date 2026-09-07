"use server";

import { revalidatePath } from "next/cache";
import { canAccessClient, getSessionAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function submitApprovedPosts(
  clientId: string,
  cycleId: string,
  candidateIds: string[],
): Promise<ActionResult> {
  const session = await getSessionAccess();
  if (!session) return { ok: false, error: "Sign in required." };
  if (!canAccessClient(session, clientId)) return { ok: false, error: "This client is not available." };
  if (candidateIds.length !== 2) return { ok: false, error: "Pick exactly two posts." };

  const db = createAdminClient();
  let cycleQuery = await db
    .from("post_cycles")
    .select("id, client_id, status, sent_at")
    .eq("id", cycleId)
    .maybeSingle();
  if (cycleQuery.error && /sent_at|PGRST204/i.test(cycleQuery.error.message)) {
    return { ok: false, error: "This proposal has not been sent yet." };
  }
  if (cycleQuery.error) return { ok: false, error: cycleQuery.error.message };
  const cycle = cycleQuery.data;
  if (!cycle || cycle.client_id !== clientId) {
    return { ok: false, error: "Those posts are not part of this proposal." };
  }
  if (!cycle.sent_at) return { ok: false, error: "This proposal has not been sent yet." };
  if (cycle.status === "approved") return { ok: false, error: "These posts are already approved." };

  const { data: cands, error: candErr } = await db
    .from("post_candidates")
    .select("id")
    .eq("cycle_id", cycleId);
  if (candErr) return { ok: false, error: candErr.message };
  const allowed = new Set((cands ?? []).map((c) => c.id));
  if (candidateIds.some((id) => !allowed.has(id))) {
    return { ok: false, error: "Those posts are not part of this proposal." };
  }

  const now = new Date().toISOString();
  const { error: clearErr } = await db
    .from("post_candidates")
    .update({ chosen: false })
    .eq("cycle_id", cycleId);
  if (clearErr) return { ok: false, error: clearErr.message };

  const { error: pickErr } = await db
    .from("post_candidates")
    .update({ chosen: true })
    .eq("cycle_id", cycleId)
    .in("id", candidateIds);
  if (pickErr) return { ok: false, error: pickErr.message };

  const { error: statusErr } = await db
    .from("post_cycles")
    .update({ status: "approved", approved_at: now })
    .eq("id", cycleId);
  if (statusErr) return { ok: false, error: statusErr.message };

  revalidatePath("/portal/post4me");
  revalidatePath("/console/post4me");
  revalidatePath("/console/post4me/approved");
  revalidatePath(`/console/post4me/approved/${clientId}`);
  revalidatePath(`/console/clients/${clientId}`);
  return { ok: true };
}
