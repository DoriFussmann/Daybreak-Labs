"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function saveClientDetails(
  clientId: string,
  fields: {
    name: string;
    companyName: string;
    keyContact: string;
    keyContactEmail: string;
    phone: string;
    website: string;
    sitePixel: string;
    paid: boolean;
    postingMode: "opt_in" | "opt_out";
  },
) {
  const name = fields.name.trim();
  if (!name) return;
  const db = createAdminClient();
  const { error } = await db
    .from("clients")
    .update({
      name,
      company_name: emptyToNull(fields.companyName),
      key_contact: emptyToNull(fields.keyContact),
      key_contact_email: emptyToNull(fields.keyContactEmail),
      phone: emptyToNull(fields.phone),
      website: emptyToNull(fields.website),
      site_pixel: emptyToNull(fields.sitePixel),
      paid: fields.paid,
      posting_mode: fields.postingMode,
    })
    .eq("id", clientId);
  if (error) {
    throw new Error(
      error.code === "PGRST204" || /company_name|schema cache/i.test(error.message)
        ? "Run 002_client_details.sql in the Supabase SQL editor to add client profile columns."
        : error.message,
    );
  }
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

export async function saveLinked(
  clientId: string,
  values: { heyreachId: string; post4meId: string; linkedinUrl: string },
) {
  const db = createAdminClient();
  const pairs: { list_type: ListType; value: string }[] = [
    { list_type: "FS", value: values.heyreachId.trim() },
    { list_type: "CC", value: values.post4meId.trim() },
    { list_type: "HI", value: values.linkedinUrl.trim() },
  ];

  for (const { list_type, value } of pairs) {
    if (value) {
      await db.from("client_campaigns").upsert(
        {
          client_id: clientId,
          channel: "linkedin",
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
        .eq("channel", "linkedin")
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

export async function deleteClient(clientId: string, formData: FormData) {
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (!confirm) return;
  const db = createAdminClient();
  const { data } = await db.from("clients").select("id, name").eq("id", clientId).single();
  if (!data || data.name.trim() !== confirm) return;
  const { error } = await db.from("clients").delete().eq("id", clientId);
  if (error) throw new Error(error.message);
  revalidatePath("/console/clients");
  redirect("/console/clients");
}
