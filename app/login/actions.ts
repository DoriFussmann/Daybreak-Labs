"use server";

import { redirect } from "next/navigation";
import { getSessionAccess, homePath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false as const, message: error.message };

  const session = await getSessionAccess();
  if (!session || (!session.isAdmin && session.clientIds.length === 0)) {
    await supabase.auth.signOut();
    return { ok: false as const, message: "This account is not linked to a client." };
  }
  return { ok: true as const, href: homePath(session) };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
