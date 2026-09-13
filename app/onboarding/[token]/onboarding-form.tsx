"use client";

import { useMemo, useState, useTransition } from "react";
import { Dropdown } from "@/app/ui/dropdown";
import {
  CLIENT_EDITABLE_OVERRIDE,
  LEVELS,
  ONBOARDING_FIELDS,
  ONBOARDING_SECTIONS,
  levelLabel,
  type FieldSource,
} from "@/lib/onboarding";
import { saveOnboarding, signOrder } from "./actions";

type Client = Record<string, unknown> & {
  id: string;
  name?: string | null;
  field_source?: Record<string, FieldSource> | null;
  program?: string | null;
  territory_note?: string | null;
  key_contact?: string | null;
  company_name?: string | null;
  level?: string | null;
  invoice_url?: string | null;
  content_links?: string | null;
  signed_at?: string | null;
  paid?: boolean | null;
};

const FILL = "#F4F5F6";

function val(client: Client, key: string) {
  const v = client[key];
  return typeof v === "string" ? v : "";
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Pill({ tone, children }: { tone: "need" | "done" | "wait"; children: React.ReactNode }) {
  const color = tone === "done" ? "var(--sage)" : tone === "need" ? "var(--amber)" : "var(--ash)";
  const border = tone === "wait" ? "var(--smoke)" : color;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "3px 9px",
        borderRadius: 20,
        border: `1px solid ${border}`,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 8 }}>{label}</div>
      <div
        style={{
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          border: "1px solid var(--smoke)",
          borderRadius: 6,
          background: FILL,
          color: value ? "var(--ink)" : "var(--ash)",
          fontSize: 14,
        }}
      >
        {value || "—"}
      </div>
      <p style={{ color: "var(--ash)", fontSize: 12, marginTop: 6 }}>Set up by your account manager</p>
    </div>
  );
}

const CARD: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid var(--smoke)",
  borderRadius: 10,
};
const SECTION: React.CSSProperties = { padding: "56px 0", borderTop: "1px solid var(--smoke)" };

const PHASES = [
  { n: "01", h: "Foundation", p: "We secure your two campaign domains and set up your inboxes, kept separate from your main brand site." },
  { n: "02", h: "Audience & infrastructure", p: "Mailboxes warm up, your prospect audience is built and verified, and tracking goes in place." },
  { n: "03", h: "Campaign build", p: "Your email cadence and LinkedIn outreach are written in your voice and your dashboard is stood up." },
  { n: "04", h: "Launch — Day 1", p: "Outreach begins across email and LinkedIn. Day 1 of your operating period. You watch it live." },
];

export function OnboardingForm({
  token,
  client,
  alreadySigned,
}: {
  token: string;
  client: Client;
  alreadySigned: boolean;
}) {
  const source = useMemo(() => (client.field_source ?? {}) as Record<string, FieldSource>, [client.field_source]);
  const [savePending, startSave] = useTransition();
  const [signPending, startSign] = useTransition();
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [signed, setSigned] = useState(alreadySigned);
  const [signErr, setSignErr] = useState<string | null>(null);

  const paid = Boolean(client.paid);

  function locked(key: string) {
    return source[key] === "jay" && !CLIENT_EDITABLE_OVERRIDE.has(key);
  }
  function onSave(formData: FormData) {
    setSaveErr(null);
    setSaved(false);
    startSave(async () => {
      const res = await saveOnboarding(token, formData);
      if (res.ok) setSaved(true);
      else setSaveErr(res.message);
    });
  }
  function onSign(formData: FormData) {
    setSignErr(null);
    startSign(async () => {
      const res = await signOrder(token, formData);
      if (res.ok) setSigned(true);
      else setSignErr(res.message);
    });
  }

  // journey nodes
  const nodes = [
    { k: "Onboarding", v: "You're here", state: signed ? "done" : "now" },
    { k: "Sign", v: "The order", state: signed ? "done" : "now" },
    { k: "Payment", v: paid ? "Received" : "One invoice", state: paid ? "done" : signed ? "now" : "upcoming" },
    { k: "We build", v: "~1 week", state: "upcoming" },
    { k: "Launch", v: "Day 1", state: "upcoming" },
  ] as const;

  return (
    <div>
      {/* HERO */}
      <div style={{ padding: "64px 0 8px" }}>
        <div style={{ color: "var(--brass)", fontWeight: 500, fontSize: 13, letterSpacing: "0.04em", marginBottom: 14 }}>
          Onboarding
        </div>
        <h1 style={{ margin: 0 }}>Welcome{client.key_contact ? `, ${client.key_contact}` : ""}.</h1>
        <p style={{ color: "var(--slate)", fontSize: 17, maxWidth: 680, marginTop: 16, lineHeight: 1.6 }}>
          Your program is being set up. Two things from you get the build moving — confirm your details and sign the
          service order — then payment starts the clock. Here&rsquo;s where things stand and what happens next.
        </p>
      </div>

      {/* JOURNEY STRIP */}
      <div style={{ display: "flex", ...CARD, overflow: "hidden", margin: "40px 0 8px" }}>
        {nodes.map((n, i) => (
          <div
            key={n.k}
            style={{
              flex: 1,
              padding: "18px 20px",
              borderRight: i < nodes.length - 1 ? "1px solid var(--smoke)" : "none",
              background: n.state === "now" ? FILL : "transparent",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: n.state === "done" ? "var(--sage)" : n.state === "now" ? "var(--brass)" : "var(--smoke)",
                }}
              />
              <span className="label" style={{ color: n.state === "now" ? "var(--brass)" : "var(--ash)" }}>{n.k}</span>
            </div>
            <div style={{ fontSize: 15, color: n.state === "upcoming" ? "var(--slate)" : "var(--ink)", fontWeight: n.state === "now" ? 500 : 400 }}>
              {n.v}
            </div>
          </div>
        ))}
      </div>

      {/* WHAT WE NEED FROM YOU */}
      <section style={{ ...SECTION, borderTop: "none", paddingTop: 56 }}>
        <h2 style={{ margin: 0 }}>What We Need From You</h2>
        <p style={{ color: "var(--ash)", marginTop: 8, maxWidth: 680 }}>
          The first two start the build; the last two we can fill in as we go.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16, marginTop: 28 }}>
          {[
            { id: "details", h: "Confirm your details", p: "Most is filled in from your call — check it and complete the blanks.", tone: "need" as const, label: "Needs you", btn: "Review details" },
            { id: "order", h: "Review & sign the service order", p: "Choose your level, read the terms, and sign. This authorizes the build.", tone: (signed ? "done" : "need") as "done" | "need", label: signed ? "Done" : "Needs you", btn: "Go to service order" },
            { id: "pay", h: "Complete payment", p: "One secure invoice — card, ACH or wire. Clearing starts the build clock.", tone: (paid ? "done" : signed ? "need" : "wait") as "done" | "need" | "wait", label: paid ? "Done" : signed ? "Needs you" : "After signing", btn: "View payment" },
            { id: "details", h: "Share brand materials", p: "Logos, photography, video, prior marketing — add what you have.", tone: (client.content_links ? "done" : "wait") as "done" | "wait", label: client.content_links ? "Added" : "Optional now", btn: "Add links" },
          ].map((c, idx) => (
            <div key={idx} style={{ ...CARD, padding: "24px 26px", display: "flex", flexDirection: "column", gap: 10, background: c.tone === "done" ? FILL : "#FFFFFF" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <h3 style={{ margin: 0 }}>{c.h}</h3>
                <Pill tone={c.tone}>{c.label}</Pill>
              </div>
              <p style={{ fontSize: 14, color: "var(--slate)", margin: 0 }}>{c.p}</p>
              <button type="button" className="btn btn-ghost" style={{ alignSelf: "flex-start", height: 38 }} onClick={() => scrollTo(c.id)}>
                {c.btn} ↓
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* WHAT HAPPENS NEXT */}
      <section style={SECTION}>
        <h2 style={{ margin: 0 }}>What Happens Next</h2>
        <p style={{ color: "var(--ash)", marginTop: 8, maxWidth: 680 }}>
          Once the order is signed and payment clears, we build in the background — nothing needed from you until launch.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16, marginTop: 28 }}>
          {PHASES.map((p) => (
            <div key={p.n} style={{ ...CARD, padding: "22px" }}>
              <div className="mono" style={{ fontSize: 12, color: "var(--brass)", marginBottom: 12 }}>{p.n}</div>
              <h4 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 500 }}>{p.h}</h4>
              <p style={{ fontSize: 13, color: "var(--slate)", margin: 0 }}>{p.p}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260, fontSize: 13, color: "var(--slate)", borderLeft: "2px solid var(--brass)", paddingLeft: 14 }}>
            <b style={{ color: "var(--ink)", fontWeight: 500 }}>No outreach during build.</b> Nothing sends until you&rsquo;ve seen it and launch is approved.
          </div>
          <div style={{ flex: 1, minWidth: 260, fontSize: 13, color: "var(--slate)", borderLeft: "2px solid var(--brass)", paddingLeft: 14 }}>
            <b style={{ color: "var(--ink)", fontWeight: 500 }}>Why two sending domains?</b> Your primary brand site stays clean — outreach runs through dedicated domains.
          </div>
        </div>
      </section>

      {/* YOUR DETAILS */}
      <section id="details" style={SECTION}>
        <h2 style={{ margin: 0 }}>Your Details</h2>
        <p style={{ color: "var(--ash)", marginTop: 8, maxWidth: 680 }}>
          Locked fields were set up from your call — leave them unless something&rsquo;s changed.
        </p>

        {(client.program || client.territory_note) && (
          <div style={{ ...CARD, padding: "20px 24px", marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 900 }}>
            {client.program ? <LockedField label="Program" value={String(client.program)} /> : null}
            {client.territory_note ? <LockedField label="Territory" value={String(client.territory_note)} /> : null}
          </div>
        )}

        <form action={onSave} style={{ marginTop: 24 }}>
          {ONBOARDING_SECTIONS.map((section) => {
            const fields = ONBOARDING_FIELDS.filter((f) => f.section === section);
            if (fields.length === 0) return null;
            return (
              <div key={section} style={{ ...CARD, padding: "28px", marginBottom: 16, maxWidth: 900 }}>
                <h3 style={{ margin: "0 0 20px" }}>{section}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "18px 20px" }}>
                  {fields.map((field) => {
                    const full = field.type === "textarea";
                    if (locked(field.key)) {
                      return (
                        <div key={field.key} style={full ? { gridColumn: "1 / -1" } : undefined}>
                          <LockedField label={field.label} value={val(client, field.key)} />
                        </div>
                      );
                    }
                    return (
                      <div key={field.key} style={full ? { gridColumn: "1 / -1" } : undefined}>
                        <div className="label" style={{ marginBottom: 8 }}>{field.label}</div>
                        {field.type === "textarea" ? (
                          <textarea
                            name={field.key}
                            className="input"
                            defaultValue={val(client, field.key)}
                            placeholder={field.placeholder}
                            style={{ height: 92, padding: "12px 14px", resize: "vertical" }}
                          />
                        ) : (
                          <input
                            name={field.key}
                            type={field.type === "email" ? "email" : "text"}
                            className="input"
                            defaultValue={val(client, field.key)}
                            placeholder={field.placeholder}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button className="btn btn-ghost" type="submit" disabled={savePending}>
              {savePending ? "Saving..." : "Save details"}
            </button>
            {saved ? <span style={{ color: "var(--sage)", fontSize: 14 }}>Saved</span> : null}
            {saveErr ? <span style={{ color: "var(--cinnabar)", fontSize: 14 }}>{saveErr}</span> : null}
          </div>
        </form>
      </section>

      {/* SERVICE ORDER */}
      <section id="order" style={SECTION}>
        <h2 style={{ margin: 0 }}>Service Order</h2>
        <p style={{ color: "var(--ash)", marginTop: 8, maxWidth: 680 }}>
          Choose your level, review the terms, and sign. The engagement begins with an initial sixty-day operating
          period, then continues month to month, prepaid, until either side ends it in writing.
        </p>

        {signed ? (
          <div style={{ ...CARD, padding: "20px 24px", marginTop: 24, borderColor: "var(--sage)", color: "var(--sage)", fontSize: 14, maxWidth: 900 }}>
            Signed — {levelLabel(client.level)}. Thank you.
          </div>
        ) : (
          <form action={onSign} style={{ marginTop: 24, maxWidth: 900 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16, marginBottom: 24 }}>
              {LEVELS.map((l) => {
                const sel = (client.level ?? "start") === l.value;
                return (
                  <label key={l.value} style={{ ...CARD, padding: 20, cursor: "pointer", borderColor: sel ? "var(--brass)" : "var(--smoke)", boxShadow: sel ? "inset 0 0 0 1px var(--brass)" : "none", display: "block" }}>
                    <input type="radio" name="level" value={l.value} defaultChecked={sel} style={{ marginRight: 8 }} />
                    <span style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>{l.label}</span>
                  </label>
                );
              })}
            </div>

            <div style={{ ...CARD, padding: "24px 26px", fontSize: 13, color: "var(--slate)" }}>
              <span className="label">Terms</span>
              <ol style={{ margin: "10px 0 0 18px" }}>
                <li style={{ marginBottom: 6 }}>Initial sixty-day operating period, then month to month, prepaid, until either party terminates in writing.</li>
                <li style={{ marginBottom: 6 }}>Working media is 100% pass-through at cost, activated only after your written approval of budget and mix.</li>
                <li style={{ marginBottom: 6 }}>You keep your contact data and every lead generated; we keep our platform and infrastructure.</li>
                <li style={{ marginBottom: 6 }}>Outreach is best-effort against available intent data; specific lead or deal counts aren&rsquo;t guaranteed.</li>
                <li>You control final approval of targeting, brand content, and any franchise or earnings-related claims.</li>
              </ol>
            </div>

            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.6, color: "var(--charcoal)", margin: "18px 0" }}>
              <input type="checkbox" name="terms" style={{ marginTop: 4 }} />
              <span>
                I have read and agree to the terms on behalf of my company, and I authorise InMarketLabs to invoice the
                amount due at signing and the monthly subscription at the selected level.
              </span>
            </label>

            <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div className="label" style={{ marginBottom: 8 }}>Typed signature (full legal name)</div>
                <input name="signature_name" className="input" placeholder="Type your full legal name" />
              </div>
              <button className="btn" type="submit" disabled={signPending}>
                {signPending ? "Signing..." : "Sign the order"}
              </button>
            </div>
            {signErr ? <p style={{ color: "var(--cinnabar)", fontSize: 14, marginTop: 12 }}>{signErr}</p> : null}
          </form>
        )}
      </section>

      {/* PAYMENT */}
      <section id="pay" style={SECTION}>
        <h2 style={{ margin: 0 }}>Payment</h2>
        <p style={{ color: "var(--ash)", marginTop: 8, maxWidth: 680 }}>One secure invoice. Payment clearing starts the build.</p>
        <div style={{ ...CARD, padding: 28, marginTop: 24, maxWidth: 520 }}>
          {paid ? (
            <p style={{ color: "var(--sage)", fontSize: 14, margin: 0 }}>Payment received. Thank you.</p>
          ) : client.invoice_url ? (
            <>
              <p style={{ color: "var(--slate)", fontSize: 14, lineHeight: 1.7, margin: "0 0 18px" }}>
                Complete payment to start the build. Payable by credit card, ACH or wire.
              </p>
              <a className="btn" href={String(client.invoice_url)} target="_blank" rel="noreferrer">Pay invoice</a>
            </>
          ) : (
            <p style={{ color: "var(--ash)", fontSize: 14, margin: 0 }}>
              Your invoice will appear here shortly. You can sign the order in the meantime.
            </p>
          )}
        </div>
      </section>

      <div style={{ padding: "40px 0 64px", color: "var(--ash)", fontSize: 13, textAlign: "center", borderTop: "1px solid var(--smoke)" }}>
        InMarketLabs, LLC
      </div>
    </div>
  );
}
