"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { assertAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { newToken } from "@/lib/onboarding";

async function baseUrl() {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env) return env.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}

// Create a fresh intake link for Jay (not yet tied to a client).
export async function createIntakeToken(label?: string): Promise<{ url: string }> {
  await assertAdmin();
  const db = createAdminClient();
  const token = newToken();
  await db.from("onboarding_tokens").insert({
    token,
    kind: "intake",
    label: label?.trim() || null,
  });
  revalidatePath("/console/onboarding");
  return { url: `${await baseUrl()}/intake/${token}` };
}

// Create (or reuse) the client's onboarding link.
export async function getOrCreateOnboardingToken(clientId: string): Promise<{ url: string }> {
  await assertAdmin();
  const db = createAdminClient();
  const { data: existing } = await db
    .from("onboarding_tokens")
    .select("token")
    .eq("kind", "onboarding")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let token = existing?.token as string | undefined;
  if (!token) {
    token = newToken();
    await db.from("onboarding_tokens").insert({ token, kind: "onboarding", client_id: clientId });
  }
  revalidatePath(`/console/clients/${clientId}`);
  return { url: `${await baseUrl()}/onboarding/${token}` };
}

export async function saveInvoiceUrl(clientId: string, url: string) {
  await assertAdmin();
  const db = createAdminClient();
  await db.from("clients").update({ invoice_url: url.trim() || null }).eq("id", clientId);
  revalidatePath(`/console/clients/${clientId}`);
}

export async function markReady(clientId: string) {
  await assertAdmin();
  const db = createAdminClient();
  const { data: c } = await db.from("clients").select("invoice_url").eq("id", clientId).maybeSingle();
  if (!c?.invoice_url) throw new Error("Add the Stripe invoice link before marking ready.");
  await db.from("clients").update({ ready_at: new Date().toISOString() }).eq("id", clientId);
  revalidatePath(`/console/clients/${clientId}`);
}

export async function markSent(clientId: string) {
  await assertAdmin();
  const db = createAdminClient();
  await db.from("clients").update({ sent_at: new Date().toISOString() }).eq("id", clientId);
  revalidatePath(`/console/clients/${clientId}`);
}

export async function setPaid(clientId: string, paid: boolean) {
  await assertAdmin();
  const db = createAdminClient();
  await db.from("clients").update({ paid }).eq("id", clientId); // paid_at handled by trigger
  revalidatePath(`/console/clients/${clientId}`);
  revalidatePath("/console/onboarding");
}
