// Post4Me I/O: one weekly cycle, deadline application. Server-only.
// Callers must already have verified the user (assertAdmin / canAccessClient).

import { generateDrafts } from "@/lib/generate";
import { selectTopics, type Topic } from "@/lib/post4me-select";
import {
  cycleMonday,
  decideDeadline,
  selectionDeadlineIso,
  slotsForPicks,
  type CycleStatus,
  type PostingMode,
} from "@/lib/post4me-cycle";
import type { SupabaseClient } from "@supabase/supabase-js";

type Db = SupabaseClient;

export type ActionResult = { ok: true } | { ok: false; error: string };

async function markSelected(
  db: Db,
  cycleId: string,
  picks: { id: string; slot: "wed" | "fri" }[],
) {
  const now = new Date().toISOString();
  for (const pick of picks) {
    const { error } = await db
      .from("post_candidates")
      .update({ chosen: true, slot: pick.slot })
      .eq("id", pick.id)
      .eq("cycle_id", cycleId);
    if (error) throw new Error(error.message);
  }
  const { error } = await db
    .from("post_cycles")
    .update({ status: "selected", selected_at: now })
    .eq("id", cycleId);
  if (error) throw new Error(error.message);
}

export async function applyDeadlines(db: Db, clientIds?: string[]) {
  let q = db
    .from("post_cycles")
    .select("id, status, posting_mode, selection_deadline, client_id")
    .eq("status", "generated");
  if (clientIds) q = q.in("client_id", clientIds);
  const { data: cycles, error } = await q;
  if (error) throw new Error(error.message);

  for (const cycle of cycles ?? []) {
    const { data: candidates, error: candErr } = await db
      .from("post_candidates")
      .select("id, variant, chosen")
      .eq("cycle_id", cycle.id);
    if (candErr) throw new Error(candErr.message);

    const decision = decideDeadline({
      status: cycle.status as CycleStatus,
      postingMode: cycle.posting_mode as PostingMode,
      deadline: cycle.selection_deadline,
      candidates: (candidates ?? []).map((c) => ({
        id: c.id,
        variant: Number(c.variant),
        chosen: Boolean(c.chosen),
      })),
    });

    if (decision.action === "skip") {
      const { error: skipErr } = await db
        .from("post_cycles")
        .update({ status: "skipped" })
        .eq("id", cycle.id)
        .eq("status", "generated");
      if (skipErr) throw new Error(skipErr.message);
    } else if (decision.action === "auto_select") {
      await markSelected(db, cycle.id, decision.picks);
    }
  }
}

async function lastShownForClient(db: Db, clientId: string): Promise<Map<string, string>> {
  const { data: cycles, error } = await db
    .from("post_cycles")
    .select("id, cycle_date")
    .eq("client_id", clientId);
  if (error) throw new Error(error.message);
  const byCycle = new Map((cycles ?? []).map((c) => [c.id as string, c.cycle_date as string]));
  if (byCycle.size === 0) return new Map();

  const { data: rows, error: candErr } = await db
    .from("post_candidates")
    .select("topic_id, cycle_id")
    .in("cycle_id", [...byCycle.keys()])
    .not("topic_id", "is", null);
  if (candErr) throw new Error(candErr.message);

  const lastShown = new Map<string, string>();
  for (const row of rows ?? []) {
    const topicId = row.topic_id as string | null;
    if (!topicId) continue;
    const date = byCycle.get(row.cycle_id as string);
    if (!date) continue;
    const prev = lastShown.get(topicId);
    if (!prev || date > prev) lastShown.set(topicId, date);
  }
  return lastShown;
}

export async function generateWeekForClient(db: Db, clientId: string): Promise<ActionResult> {
  const monday = cycleMonday();
  const { data: client, error: clientErr } = await db
    .from("clients")
    .select("id, client_type, posting_mode, post4me_prompt, post4me_flavor")
    .eq("id", clientId)
    .maybeSingle();
  if (clientErr) return { ok: false, error: clientErr.message };
  if (!client) return { ok: false, error: "Client not found." };

  const { data: existing, error: existErr } = await db
    .from("post_cycles")
    .select("id, status")
    .eq("client_id", clientId)
    .eq("cycle_date", monday)
    .maybeSingle();
  if (existErr) return { ok: false, error: existErr.message };

  if (existing && existing.status !== "failed") {
    return { ok: false, error: "This week's drafts already exist." };
  }
  if (existing) {
    const { error: delErr } = await db.from("post_cycles").delete().eq("id", existing.id);
    if (delErr) return { ok: false, error: delErr.message };
  }

  const { data: topicRows, error: topicErr } = await db
    .from("post_topics")
    .select("id, title, guidance, client_type")
    .eq("is_active", true);
  if (topicErr) return { ok: false, error: topicErr.message };

  const topics: Topic[] = (topicRows ?? []).map((t) => ({
    id: t.id,
    clientType: t.client_type ?? null,
  }));
  const picked = selectTopics({
    topics,
    clientType: client.client_type ?? null,
    lastShown: await lastShownForClient(db, clientId),
  });
  if (picked.length < 2) {
    return { ok: false, error: "Need at least two active topics that match this client type." };
  }

  const chosenTopics = picked.map((p) => {
    const row = (topicRows ?? []).find((t) => t.id === p.id)!;
    return { id: row.id as string, title: row.title as string, guidance: row.guidance as string | null };
  });

  const { data: cycle, error: cycleErr } = await db
    .from("post_cycles")
    .insert({
      client_id: clientId,
      cycle_date: monday,
      status: "generated",
      selection_deadline: selectionDeadlineIso(monday),
      posting_mode: client.posting_mode,
    })
    .select("id")
    .single();
  if (cycleErr || !cycle) {
    return { ok: false, error: cycleErr?.message ?? "Could not create this week's cycle." };
  }

  try {
    const drafts = await generateDrafts({
      topic: chosenTopics[0],
      directions: client.post4me_prompt ? [client.post4me_prompt] : [],
      notes: client.post4me_flavor ? [client.post4me_flavor] : [],
    });
    const { error: insertErr } = await db.from("post_candidates").insert(
      drafts.map((d, i) => ({
        cycle_id: cycle.id,
        topic_id: d.topicId,
        variant: i + 1,
        body: d.body,
      })),
    );
    if (insertErr) throw new Error(insertErr.message);
    return { ok: true };
  } catch (e) {
    await db.from("post_cycles").update({ status: "failed" }).eq("id", cycle.id);
    return { ok: false, error: e instanceof Error ? e.message : "Generation failed." };
  }
}

export async function selectTwoDrafts(
  db: Db,
  cycleId: string,
  candidateIds: string[],
): Promise<ActionResult> {
  if (candidateIds.length !== 2 || new Set(candidateIds).size !== 2) {
    return { ok: false, error: "Pick exactly two drafts." };
  }

  const { data: cycle, error: cycleErr } = await db
    .from("post_cycles")
    .select("id, status")
    .eq("id", cycleId)
    .maybeSingle();
  if (cycleErr) return { ok: false, error: cycleErr.message };
  if (!cycle) return { ok: false, error: "Cycle not found." };
  if (cycle.status !== "generated") {
    return { ok: false, error: "This week's picks are already closed." };
  }

  const { data: candidates, error: candErr } = await db
    .from("post_candidates")
    .select("id, variant, cycle_id")
    .eq("cycle_id", cycleId)
    .in("id", candidateIds);
  if (candErr) return { ok: false, error: candErr.message };
  if ((candidates ?? []).length !== 2) {
    return { ok: false, error: "Those drafts are not part of this week's cycle." };
  }

  try {
    await markSelected(db, cycleId, slotsForPicks(candidates ?? []));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save picks." };
  }
}

export async function approveCycle(db: Db, cycleId: string): Promise<ActionResult> {
  const { data: cycle, error } = await db
    .from("post_cycles")
    .select("id, status")
    .eq("id", cycleId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!cycle) return { ok: false, error: "Cycle not found." };
  if (cycle.status !== "selected") {
    return { ok: false, error: "Only selected cycles can be approved." };
  }
  const { error: updErr } = await db
    .from("post_cycles")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", cycleId)
    .eq("status", "selected");
  if (updErr) return { ok: false, error: updErr.message };
  return { ok: true };
}
