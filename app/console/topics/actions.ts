"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function createTopic(formData: FormData) {
  await assertAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const db = createAdminClient();
  const { data, error } = await db
    .from("post_topics")
    .insert({
      title,
      guidance: emptyToNull(String(formData.get("guidance") ?? "")),
      client_type: emptyToNull(String(formData.get("client_type") ?? "")),
      is_active: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/console/topics");
  if (data?.id) redirect(`/console/topics/${data.id}`);
}

export async function updateTopic(topicId: string, formData: FormData) {
  await assertAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const db = createAdminClient();
  const { error } = await db
    .from("post_topics")
    .update({
      title,
      guidance: emptyToNull(String(formData.get("guidance") ?? "")),
      client_type: emptyToNull(String(formData.get("client_type") ?? "")),
    })
    .eq("id", topicId);
  if (error) throw new Error(error.message);
  revalidatePath("/console/topics");
  revalidatePath(`/console/topics/${topicId}`);
}

export async function setTopicActive(topicId: string, isActive: boolean) {
  await assertAdmin();
  const db = createAdminClient();
  const { error } = await db.from("post_topics").update({ is_active: isActive }).eq("id", topicId);
  if (error) throw new Error(error.message);
  revalidatePath("/console/topics");
  revalidatePath(`/console/topics/${topicId}`);
}
