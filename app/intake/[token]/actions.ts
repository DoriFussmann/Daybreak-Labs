"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { notifyOnboarding } from "@/lib/notify";
import { INTAKE_FIELDS, type FieldSource } from "@/lib/onboarding";

type Result = { ok: true } | { ok: false; message: string };

const CLIENT_COLUMNS = new Set<string>(INTAKE_FIELDS.map((f) => f.key));

export async function submitIntake(token: string, formData: FormData): Promise<Result> {
  const db = createAdminClient();

  const { data: tok } = await db
    .from("onboarding_tokens")
    .select("token, kind, used_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!tok || tok.kind !== "intake") return { ok: false, message: "This link is not valid." };
  if (tok.used_at) return { ok: false, message: "This intake link has already been used." };
  if (tok.expires_at && new Date(tok.expires_at) < new Date())
    return { ok: false, message: "This link has expired. Ask for a fresh one." };

  // Collect only the fields Jay actually filled.
  const values: Record<string, string> = {};
  const source: Record<string, FieldSource> = {};
  for (const field of INTAKE_FIELDS) {
    const raw = String(formData.get(field.key) ?? "").trim();
    if (!raw) continue;
    values[field.key] = raw;
    source[field.key] = "jay";
  }

  const name = values.company_name || values.key_contact || "New client";

  const insert: Record<string, unknown> = { name, field_source: source, intake_submitted_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(values)) {
    if (CLIENT_COLUMNS.has(k)) insert[k] = k === "target_live_date" ? v : v;
  }

  const { data: created, error } = await db.from("clients").insert(insert).select("id, name").single();
  if (error || !created) {
    return {
      ok: false,
      message: /column|schema cache|PGRST204/i.test(error?.message ?? "")
        ? "Run 007_onboarding.sql in the Supabase SQL editor first."
        : error?.message ?? "Could not save intake.",
    };
  }

  await db
    .from("onboarding_tokens")
    .update({ used_at: new Date().toISOString(), client_id: created.id })
    .eq("token", token);

  await notifyOnboarding("intake_submitted", created);

  return { ok: true };
}
