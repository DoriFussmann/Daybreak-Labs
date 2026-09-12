// Onboarding module: shared types, field metadata, stage derivation, helpers.
// Pure/data only — safe to import from both server and client components.

export type FieldSource = "jay" | "client" | "admin";

// ---------- levels (labels only; the money is whatever the Stripe link says) ----------
export const LEVELS = [
  { value: "start", label: "Start — $2,500 / mo" },
  { value: "foundation_channels", label: "Foundation + Channels — $5,000 / mo (recommended)" },
  { value: "scale", label: "Scale — $10,000 / mo" },
] as const;

export type LevelValue = (typeof LEVELS)[number]["value"];

export function levelLabel(value: string | null | undefined) {
  return LEVELS.find((l) => l.value === value)?.label ?? "Not selected";
}

// ---------- client-facing onboarding fields ----------
// `confirmable` = a field Jay may have pre-filled at intake. If he did
// (field_source[key] === "jay"), the client sees it locked, except for the
// keys in CLIENT_EDITABLE_OVERRIDE, which the client can always change.
export type OnboardingField = {
  key: string;
  label: string;
  section: string;
  type: "text" | "email" | "textarea";
  confirmable?: boolean;
  placeholder?: string;
};

export const CLIENT_EDITABLE_OVERRIDE = new Set<string>(["website"]);

export const ONBOARDING_FIELDS: OnboardingField[] = [
  { key: "company_name", label: "Company / legal name", section: "Contact", type: "text", confirmable: true },
  { key: "key_contact", label: "Primary contact", section: "Contact", type: "text", confirmable: true },
  { key: "key_contact_email", label: "Primary email", section: "Contact", type: "email", confirmable: true },
  { key: "second_contact", label: "Brand / marketing contact", section: "Contact", type: "text", confirmable: true },
  { key: "website", label: "Website", section: "Contact", type: "text", confirmable: true },

  { key: "billing_address", label: "Billing address", section: "Billing", type: "text", placeholder: "Street, City, State, ZIP" },
  { key: "billing_email", label: "Billing email", section: "Billing", type: "email" },
  { key: "phone", label: "Billing phone", section: "Billing", type: "text" },
  { key: "billing_contact", label: "Billing contact (if not the primary contact)", section: "Billing", type: "text" },

  { key: "sending_address", label: "Preferred sending address", section: "Account setup", type: "text", placeholder: "e.g. richard@yourbrand.com" },
  { key: "sender_display_name", label: "Sender display name", section: "Account setup", type: "text" },
  { key: "linkedin_url", label: "LinkedIn profile URL", section: "Account setup", type: "text" },
  { key: "booking_url", label: "Calendar / booking link", section: "Account setup", type: "text", placeholder: "https://calendly.com/..." },

  { key: "sales_when_responds", label: "When a lead responds, what happens?", section: "Your sales process", type: "textarea" },
  { key: "sales_follow_up", label: "How quickly do you follow up?", section: "Your sales process", type: "text", placeholder: "e.g. same day, within an hour" },
  { key: "sales_first_contact", label: "Who handles first contact?", section: "Your sales process", type: "text", placeholder: "Name / role" },
  { key: "sales_notes", label: "Anything else we should know?", section: "Your sales process", type: "textarea" },

  { key: "content_links", label: "Brand assets & featured content — paste links, one per line", section: "Content", type: "textarea", placeholder: "Brand book, logo files, approved photography, video, prior marketing..." },
];

export const ONBOARDING_SECTIONS = [
  "Contact",
  "Billing",
  "Account setup",
  "Your sales process",
  "Content",
] as const;

// ---------- intake fields (what Jay fills) ----------
// key -> the clients column it writes to. All optional; Jay fills what he knows.
export const INTAKE_FIELDS = [
  { key: "company_name", label: "Company / legal name", type: "text" },
  { key: "key_contact", label: "Primary contact", type: "text" },
  { key: "key_contact_email", label: "Primary email", type: "email" },
  { key: "second_contact", label: "Brand / marketing contact", type: "text" },
  { key: "second_contact_email", label: "Brand / marketing email", type: "email" },
  { key: "program", label: "Program", type: "text", placeholder: "e.g. Franchisee Candidate Development" },
  { key: "territory_note", label: "Territory", type: "text", placeholder: "e.g. National, or specific states/metros" },
  { key: "website", label: "Website", type: "text" },
  { key: "target_live_date", label: "Target in-market date", type: "date" },
  { key: "intake_notes", label: "Deal / kickoff notes (internal — the client never sees these)", type: "textarea" },
] as const;

// ---------- stage derivation (single source of truth) ----------
export type StageTone = "off" | "warn" | "ok" | "bad";
export type ClientStageInput = {
  intake_submitted_at?: string | null;
  ready_at?: string | null;
  sent_at?: string | null;
  onboarding_opened_at?: string | null;
  signed_at?: string | null;
  paid?: boolean | null;
};

export function onboardingStage(c: ClientStageInput): { key: string; label: string; tone: StageTone } {
  const signed = Boolean(c.signed_at);
  const paid = Boolean(c.paid);
  if (signed && paid) return { key: "day0", label: "Day 0 complete", tone: "ok" };
  if (signed && !paid) return { key: "awaiting_payment", label: "Awaiting payment", tone: "warn" };
  if (paid && !signed) return { key: "awaiting_signature", label: "Awaiting signature", tone: "warn" };
  if (c.onboarding_opened_at) return { key: "in_progress", label: "Client in progress", tone: "warn" };
  if (c.sent_at) return { key: "sent", label: "Sent to client", tone: "warn" };
  if (c.ready_at) return { key: "ready", label: "Ready to send", tone: "warn" };
  if (c.intake_submitted_at) return { key: "intake_done", label: "Intake done", tone: "warn" };
  return { key: "new", label: "New", tone: "off" };
}

// ---------- token generation (no extra deps) ----------
export function newToken(): string {
  const a = globalThis.crypto.randomUUID().replace(/-/g, "");
  const b = globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return a + b; // 40 hex chars, unguessable
}

// ---------- Jay's copy-paste email ----------
export function buildJayEmail(opts: {
  contactName?: string | null;
  secondContactName?: string | null;
  companyName?: string | null;
  onboardingUrl: string;
  senderName?: string;
}): string {
  const greetNames = [opts.contactName, opts.secondContactName].filter(Boolean).join(" and ");
  const greeting = greetNames ? `Hi ${greetNames},` : "Hi,";
  const company = opts.companyName ? ` for ${opts.companyName}` : "";
  const sender = opts.senderName || "Jay";
  return [
    greeting,
    "",
    `Thank you for the time — looking forward to launching your program${company}.`,
    "",
    "Everything for onboarding is in one place here:",
    opts.onboardingUrl,
    "",
    "That page has your onboarding details, the service order to review and sign, and the payment link. Once the order is signed and payment clears, we begin the build: securing your campaign domains and inboxes, warming the mailboxes, building and verifying the audience, and standing up your dashboards.",
    "",
    "If you have brand materials to share — logo files, approved photography, video, or prior marketing — you can add them right on that page.",
    "",
    "Thanks,",
    sender,
  ].join("\n");
}
