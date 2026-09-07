"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateDrafts } from "@/lib/generate";
import { asLine, lineInsert } from "@/lib/post4me-lines";
import { ymdInTz } from "@/lib/post4me-cycle";
import { selectTopics, type Topic } from "@/lib/post4me-select";

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidatePost4Me(clientId?: string) {
  revalidatePath("/console/post4me");
  revalidatePath("/console/post4me/approved");
  revalidatePath("/portal/post4me");
  revalidatePath("/portal/account");
  if (clientId) {
    revalidatePath(`/console/clients/${clientId}`);
    revalidatePath(`/console/post4me/approved/${clientId}`);
  }
}

async function loadLines(table: "client_post_directions" | "client_post_notes", clientId: string) {
  const db = createAdminClient();
  const { data, error } = await db.from(table).select("*").eq("client_id", clientId);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => asLine(row as Record<string, unknown>))
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
}

async function replaceLines(
  table: "client_post_directions" | "client_post_notes",
  clientId: string,
  bodies: string[],
) {
  const db = createAdminClient();
  const { error: delErr } = await db.from(table).delete().eq("client_id", clientId);
  if (delErr) throw new Error(delErr.message);
  const rows = bodies.map((body) => lineInsert(clientId, body));
  if (rows.length === 0) return;
  const { error } = await db.from(table).insert(rows);
  if (error && /body|PGRST204/i.test(error.message)) {
    const retry = await db
      .from(table)
      .insert(bodies.map((text) => ({ client_id: clientId, text })));
    if (retry.error) throw new Error(retry.error.message);
    return;
  }
  if (error) throw new Error(error.message);
}

async function lastShownForClient(clientId: string) {
  const db = createAdminClient();
  const { data: cycles, error: cycleErr } = await db
    .from("post_cycles")
    .select("id, cycle_date")
    .eq("client_id", clientId);
  if (cycleErr) throw new Error(cycleErr.message);
  const map = new Map<string, string>();
  const ids = (cycles ?? []).map((c) => c.id);
  if (ids.length === 0) return map;
  const dateByCycle = Object.fromEntries((cycles ?? []).map((c) => [c.id, c.cycle_date as string]));
  const { data: cands, error: candErr } = await db
    .from("post_candidates")
    .select("topic_id, cycle_id")
    .in("cycle_id", ids);
  if (candErr) throw new Error(candErr.message);
  for (const row of cands ?? []) {
    if (!row.topic_id) continue;
    const date = dateByCycle[row.cycle_id];
    if (!date) continue;
    const prev = map.get(row.topic_id);
    if (!prev || date > prev) map.set(row.topic_id, date);
  }
  return map;
}

export async function selectTopicForClient(clientId: string): Promise<
  { ok: true; topicId: string } | { ok: false; error: string }
> {
  await assertAdmin();
  const db = createAdminClient();
  const { data: client, error: clientErr } = await db
    .from("clients")
    .select("id, client_type")
    .eq("id", clientId)
    .maybeSingle();
  if (clientErr) return { ok: false, error: clientErr.message };
  if (!client) return { ok: false, error: "Client not found." };

  const { data: topicRows, error: topicErr } = await db
    .from("post_topics")
    .select("id, client_type")
    .eq("is_active", true);
  if (topicErr) return { ok: false, error: topicErr.message };

  const topics: Topic[] = (topicRows ?? []).map((t) => ({
    id: t.id,
    clientType: t.client_type,
  }));
  const lastShown = await lastShownForClient(clientId);
  const picked = selectTopics({
    topics,
    clientType: client.client_type ?? null,
    lastShown,
    count: 1,
    cooldownCount: 0,
  });
  if (!picked[0]) {
    return { ok: false, error: "No matching active topic for this client type." };
  }
  return { ok: true, topicId: picked[0].id };
}

export async function generatePostsProposal(
  clientId: string,
  topicId: string,
): Promise<ActionResult> {
  await assertAdmin();
  const db = createAdminClient();
  const today = ymdInTz(new Date());

  const { data: client, error: clientErr } = await db
    .from("clients")
    .select("id, client_type, posting_mode")
    .eq("id", clientId)
    .maybeSingle();
  if (clientErr) return { ok: false, error: clientErr.message };
  if (!client) return { ok: false, error: "Client not found." };

  const { data: topic, error: topicErr } = await db
    .from("post_topics")
    .select("id, title, guidance, is_active")
    .eq("id", topicId)
    .maybeSingle();
  if (topicErr) return { ok: false, error: topicErr.message };
  if (!topic || !topic.is_active) return { ok: false, error: "That topic is no longer active." };

  const [directions, notes] = await Promise.all([
    loadLines("client_post_directions", clientId),
    loadLines("client_post_notes", clientId),
  ]);

  let existingQuery = await db
    .from("post_cycles")
    .select("id, sent_at, status")
    .eq("client_id", clientId)
    .eq("cycle_date", today)
    .maybeSingle();
  if (existingQuery.error && /sent_at|PGRST204/i.test(existingQuery.error.message)) {
    existingQuery = await db
      .from("post_cycles")
      .select("id, status")
      .eq("client_id", clientId)
      .eq("cycle_date", today)
      .maybeSingle();
  }
  if (existingQuery.error) return { ok: false, error: existingQuery.error.message };
  const existing = existingQuery.data as { id: string; sent_at?: string | null; status: string } | null;
  if (existing?.sent_at) {
    return { ok: false, error: "This client already has a proposal sent today." };
  }

  let drafts;
  try {
    drafts = await generateDrafts({
      topic: { id: topic.id, title: topic.title, guidance: topic.guidance },
      directions: directions.map((d) => d.body),
      notes: notes.map((n) => n.body),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Generation failed." };
  }

  let cycleId = existing?.id;
  if (cycleId) {
    const { error: delErr } = await db.from("post_candidates").delete().eq("cycle_id", cycleId);
    if (delErr) return { ok: false, error: delErr.message };
    const { error: resetErr } = await db
      .from("post_cycles")
      .update({ status: "generated", selected_at: null, approved_at: null })
      .eq("id", cycleId);
    if (resetErr) return { ok: false, error: resetErr.message };
  } else {
    const inserted = await db
      .from("post_cycles")
      .insert({
        client_id: clientId,
        cycle_date: today,
        status: "generated",
        posting_mode: client.posting_mode === "opt_in" ? "opt_in" : "opt_out",
      })
      .select("id")
      .single();
    if (inserted.error) return { ok: false, error: inserted.error.message };
    cycleId = inserted.data.id;
  }

  const { error: candErr } = await db.from("post_candidates").insert(
    drafts.map((draft, i) => ({
      cycle_id: cycleId,
      topic_id: topic.id,
      variant: i + 1,
      body: draft.body,
      chosen: false,
    })),
  );
  if (candErr) return { ok: false, error: candErr.message };

  revalidatePost4Me(clientId);
  return { ok: true };
}

export async function saveCandidateBody(candidateId: string, formData: FormData): Promise<void> {
  await assertAdmin();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  const db = createAdminClient();
  const { data: cand, error: findErr } = await db
    .from("post_candidates")
    .select("id, cycle_id")
    .eq("id", candidateId)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);
  if (!cand) throw new Error("Draft not found.");
  const { data: cycle } = await db
    .from("post_cycles")
    .select("client_id")
    .eq("id", cand.cycle_id)
    .maybeSingle();
  const { error } = await db.from("post_candidates").update({ body }).eq("id", candidateId);
  if (error) throw new Error(error.message);
  revalidatePost4Me(cycle?.client_id);
}

export async function sendToClientApproval(cycleId: string): Promise<ActionResult> {
  await assertAdmin();
  const db = createAdminClient();
  const { data: cycle, error: findErr } = await db
    .from("post_cycles")
    .select("id, client_id, status")
    .eq("id", cycleId)
    .maybeSingle();
  if (findErr) return { ok: false, error: findErr.message };
  if (!cycle) return { ok: false, error: "Cycle not found." };

  const now = new Date().toISOString();
  const { error } = await db.from("post_cycles").update({ sent_at: now }).eq("id", cycleId);
  if (error) {
    if (/sent_at|PGRST204/i.test(error.message)) {
      return {
        ok: false,
        error: "post_cycles.sent_at is missing. Run 006_post4me_notes.sql in the Supabase SQL editor.",
      };
    }
    return { ok: false, error: error.message };
  }
  revalidatePost4Me(cycle.client_id);
  return { ok: true };
}

export async function saveClientDirections(clientId: string, lines: string[]): Promise<ActionResult> {
  await assertAdmin();
  try {
    await replaceLines(
      "client_post_directions",
      clientId,
      lines.map((l) => l.trim()).filter(Boolean),
    );
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not save directions." };
  }
  revalidatePost4Me(clientId);
  return { ok: true };
}
