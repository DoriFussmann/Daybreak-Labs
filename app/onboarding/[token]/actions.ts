"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { notifyOnboarding } from "@/lib/notify";
import {
  CLIENT_EDITABLE_OVERRIDE,
  ONBOARDING_FIELDS,
  type FieldSource,
} from "@/lib/onboarding";

type Result = { ok: true } | { ok: false; message: string };

async function resolve(token: string) {
  const db = createAdminClient();
  const { data: tok } = await db
    .from("onboarding_tokens")
    .select("token, kind, client_id, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!tok || tok.kind !== "onboarding" || !tok.client_id) return null;
  if (tok.expires_at && new Date(tok.expires_at) < new Date()) return null;
  return { db, clientId: tok.client_id as string };
}

function isLocked(source: Record<string, FieldSource>, key: string) {
  return source[key] === "jay" && !CLIENT_EDITABLE_OVERRIDE.has(key);
}

export async function saveOnboarding(token: string, formData: FormData): Promise<Result> {
  const ctx = await resolve(token);
  if (!ctx) return { ok: false, message: "This link is no longer valid." };
  const { db, clientId } = ctx;

  const { data: current } = await db
    .from("clients")
    .select("field_source, assets_submitted_at, content_links")
    .eq("id", clientId)
    .maybeSingle();
  const source = (current?.field_source ?? {}) as Record<string, FieldSource>;

  const update: Record<string, unknown> = {};
  const nextSource = { ...source };

  for (const field of ONBOARDING_FIELDS) {
    if (isLocked(source, field.key)) continue; // never overwrite a Jay-locked value
    if (!formData.has(field.key)) continue;
    const raw = String(formData.get(field.key) ?? "").trim();
    update[field.key] = raw || null;
    if (raw && source[field.key] !== "jay") nextSource[field.key] = "client";
  }

  // level: client may confirm or change it
  if (formData.has("level")) {
    const level = String(formData.get("level") ?? "").trim();
    if (level) {
      update.level = level;
      nextSource.level = "client";
    }
  }

  update.field_source = nextSource;

  const gainedAssets =
    typeof update.content_links === "string" &&
    update.content_links.length > 0 &&
    !current?.content_links;
  if (gainedAssets && !current?.assets_submitted_at) {
    update.assets_submitted_at = new Date().toISOString();
  }

  const { error } = await db.from("clients").update(update).eq("id", clientId);
  if (error) {
    return {
      ok: false,
      message: /column|schema cache|PGRST204/i.test(error.message)
        ? "Run 007_onboarding.sql in the Supabase SQL editor first."
        : error.message,
    };
  }

  if (gainedAssets) {
    const { data: c } = await db.from("clients").select("id, name").eq("id", clientId).maybeSingle();
    if (c) await notifyOnboarding("assets_submitted", c);
  }

  return { ok: true };
}

export async function signOrder(token: string, formData: FormData): Promise<Result> {
  const ctx = await resolve(token);
  if (!ctx) return { ok: false, message: "This link is no longer valid." };
  const { db, clientId } = ctx;

  const agreed = formData.get("terms") === "on" || formData.get("terms") === "true";
  const signature = String(formData.get("signature_name") ?? "").trim();
  const level = String(formData.get("level") ?? "").trim();
  if (!agreed) return { ok: false, message: "Please tick the box to agree to the terms." };
  if (!signature) return { ok: false, message: "Please type your full legal name to sign." };

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    terms_agreed_at: now,
    signature_name: signature,
    signed_at: now,
  };
  if (level) update.level = level;

  const { data: signed, error } = await db
    .from("clients")
    .update(update)
    .eq("id", clientId)
    .select("id, name")
    .single();
  if (error || !signed) return { ok: false, message: error?.message ?? "Could not record signature." };

  await notifyOnboarding("signed", signed);
  return { ok: true };
}
