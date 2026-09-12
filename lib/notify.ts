import { createAdminClient } from "@/lib/supabase/admin";

// Central place to raise an operator notification. Writes an in-portal alert
// (admin scope) always. Email is an optional add: set RESEND_API_KEY and
// ADMIN_ALERT_EMAIL and fill in the marked block — nothing else changes.

export type OnboardingEvent =
  | "intake_submitted"
  | "client_opened"
  | "assets_submitted"
  | "signed"
  | "paid";

const MESSAGES: Record<OnboardingEvent, (name: string) => string> = {
  intake_submitted: (n) => `Intake submitted — ${n}. Review, add the invoice link, then send.`,
  client_opened: (n) => `${n} opened their onboarding page.`,
  assets_submitted: (n) => `${n} uploaded brand assets / content links.`,
  signed: (n) => `${n} signed the service order.`,
  paid: (n) => `${n} — payment marked received.`,
};

export async function notifyOnboarding(
  event: OnboardingEvent,
  client: { id?: string | null; name?: string | null },
) {
  const name = client.name?.trim() || "New client";
  const message = MESSAGES[event](name);
  const db = createAdminClient();

  await db.from("alerts").insert({
    scope: "admin",
    client_id: client.id ?? null,
    type: `onboarding_${event}`,
    severity: event === "signed" || event === "paid" ? "info" : "warning",
    message,
  });

  // --- optional email seam (off by default) ---------------------------------
  // const key = process.env.RESEND_API_KEY;
  // const to = process.env.ADMIN_ALERT_EMAIL;
  // if (key && to) {
  //   await fetch("https://api.resend.com/emails", {
  //     method: "POST",
  //     headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       from: "InMarketLabs <onboarding@yourdomain.com>",
  //       to, subject: `Onboarding — ${name}`, text: message,
  //     }),
  //   }).catch(() => {});
  // }
  // --------------------------------------------------------------------------
}
