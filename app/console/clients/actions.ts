"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

const LIST_TYPES = ["FS", "CC", "HI"] as const;
type ListType = (typeof LIST_TYPES)[number];

export async function createClientRecord(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const db = createAdminClient();
  await db.from("clients").insert({ name: trimmed });
  revalidatePath("/console/clients");
}

export async function setLive(clientId: string, isLive: boolean) {
  const db = createAdminClient();
  await db.from("clients").update({ is_live: isLive }).eq("id", clientId);
  revalidatePath("/console/clients");
  revalidatePath(`/console/clients/${clientId}`);
}

export async function saveCampaigns(
  clientId: string,
  ids: { fs: string; cc: string; hi: string },
) {
  const db = createAdminClient();
  const pairs: { list_type: ListType; value: string }[] = [
    { list_type: "FS", value: ids.fs.trim() },
    { list_type: "CC", value: ids.cc.trim() },
    { list_type: "HI", value: ids.hi.trim() },
  ];

  for (const { list_type, value } of pairs) {
    if (value) {
      await db.from("client_campaigns").upsert(
        {
          client_id: clientId,
          channel: "email",
          list_type,
          external_campaign_id: value,
        },
        { onConflict: "client_id,channel,list_type" },
      );
    } else {
      await db
        .from("client_campaigns")
        .delete()
        .eq("client_id", clientId)
        .eq("channel", "email")
        .eq("list_type", list_type);
    }
  }

  revalidatePath(`/console/clients/${clientId}`);
}

export async function addTerritory(clientId: string, state: string, city: string) {
  const st = state.trim().toUpperCase();
  const ci = city.trim().toUpperCase();
  if (st.length !== 2) return;
  const db = createAdminClient();
  await db.from("client_territories").insert({
    client_id: clientId,
    state: st,
    city: ci || null,
  });
  revalidatePath(`/console/clients/${clientId}`);
}

export async function removeTerritory(rowId: string) {
  const db = createAdminClient();
  const { data } = await db.from("client_territories").select("client_id").eq("id", rowId).single();
  await db.from("client_territories").delete().eq("id", rowId);
  if (data?.client_id) revalidatePath(`/console/clients/${data.client_id}`);
}
