import { createAdminClient } from "@/lib/supabase/admin";

export function normalizeEmail(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed.toLowerCase() : "";
}

export async function linkMembershipsForEmail(userId: string, email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return;
  const db = createAdminClient();
  const { data: clients } = await db.from("clients").select("id, key_contact_email");
  const matches = (clients ?? []).filter(
    (c) => normalizeEmail(c.key_contact_email) === normalized,
  );
  if (matches.length === 0) return;
  await ensureProfile(userId);
  await db.from("client_members").upsert(
    matches.map((c) => ({ user_id: userId, client_id: c.id })),
    { onConflict: "user_id,client_id" },
  );
}

export async function syncKeyContactMembership(
  clientId: string,
  previousEmail: string | null,
  nextEmail: string | null,
) {
  const prev = normalizeEmail(previousEmail);
  const next = normalizeEmail(nextEmail);
  if (prev && prev !== next) await unlinkEmailFromClient(clientId, prev);
  if (next) await ensureClientMember(clientId, next);
}

async function ensureProfile(userId: string) {
  const db = createAdminClient();
  const { error } = await db.from("profiles").upsert(
    { id: userId, role: "client", is_admin: false },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error && /role|PGRST204|schema cache/i.test(error.message)) {
    await db.from("profiles").upsert(
      { id: userId, is_admin: false },
      { onConflict: "id", ignoreDuplicates: true },
    );
  }
}

async function unlinkEmailFromClient(clientId: string, email: string) {
  const userId = await findUserIdByEmail(email);
  if (!userId) return;
  const db = createAdminClient();
  await db.from("client_members").delete().eq("user_id", userId).eq("client_id", clientId);
}

async function ensureClientMember(clientId: string, email: string) {
  const userId = await findOrInviteUser(email);
  await ensureProfile(userId);
  const db = createAdminClient();
  await db.from("client_members").upsert(
    { user_id: userId, client_id: clientId },
    { onConflict: "user_id,client_id" },
  );
}

async function findOrInviteUser(email: string) {
  const existing = await findUserIdByEmail(email);
  if (existing) return existing;

  const db = createAdminClient();
  const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
    data: { role: "client" },
  });
  if (!error && data.user?.id) return data.user.id;

  const already = /already|registered|exists/i.test(error?.message ?? "");
  if (already) {
    const found = await findUserIdByEmail(email);
    if (found) return found;
  }

  throw new Error(
    error?.message
      ? `Client saved. Could not invite ${email}: ${error.message}`
      : `Client saved. Could not invite ${email}.`,
  );
}

async function findUserIdByEmail(email: string) {
  const db = createAdminClient();
  const target = normalizeEmail(email);
  const perPage = 200;
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const found = data.users.find((u) => normalizeEmail(u.email) === target);
    if (found) return found.id;
    if (data.users.length < perPage) return null;
  }
  return null;
}
