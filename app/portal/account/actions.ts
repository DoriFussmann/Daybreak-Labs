"use server";

import { revalidatePath } from "next/cache";
import { canAccessClient, getSessionAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_CLIENT_NOTES, lineInsert } from "@/lib/post4me-lines";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function saveClientNotes(clientId: string, lines: string[]): Promise<ActionResult> {
  const session = await getSessionAccess();
  if (!session) return { ok: false, error: "Sign in required." };
  if (!canAccessClient(session, clientId)) return { ok: false, error: "This client is not available." };

  const bodies = lines.map((l) => l.trim()).filter(Boolean);
  if (bodies.length > MAX_CLIENT_NOTES) {
    return { ok: false, error: `At most ${MAX_CLIENT_NOTES} notes.` };
  }

  const db = createAdminClient();
  const { error: delErr } = await db.from("client_post_notes").delete().eq("client_id", clientId);
  if (delErr) return { ok: false, error: delErr.message };
  if (bodies.length > 0) {
    const { error } = await db
      .from("client_post_notes")
      .insert(bodies.map((body) => lineInsert(clientId, body)));
    if (error && /body|PGRST204/i.test(error.message)) {
      const retry = await db
        .from("client_post_notes")
        .insert(bodies.map((text) => ({ client_id: clientId, text })));
      if (retry.error) return { ok: false, error: retry.error.message };
    } else if (error) {
      return { ok: false, error: error.message };
    }
  }

  revalidatePath("/portal/account");
  revalidatePath(`/console/clients/${clientId}`);
  revalidatePath("/console/post4me");
  return { ok: true };
}
