"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth";
import { pullEmailAnalytics } from "@/lib/analytics";

export async function pullAnalyticsNow(): Promise<{
  campaignsPulled: number;
  rowsWritten: number;
  errors: string[];
}> {
  await assertAdmin();
  const r = await pullEmailAnalytics({ days: 90 });
  revalidatePath("/console");
  return r;
}
