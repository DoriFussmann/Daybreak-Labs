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
  field_source?: Record<string, FieldSource> | null;
  program?: string | null;
  territory_note?: string | null;
  level?: string | null;
  invoice_url?: string | null;
  signed_at?: string | null;
  paid?: boolean | null;
};

function val(client: Client, key: string) {
  const v = client[key];
  return typeof v === "string" ? v : "";
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
          background: "#F4F5F6",
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

  return (
    <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* details form */}
      <form action={onSave} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {(client.program || client.territory_note) && (
          <section className="card" style={{ padding: "24px 28px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {client.program ? <LockedField label="Program" value={String(client.program)} /> : null}
              {client.territory_note ? <LockedField label="Territory" value={String(client.territory_note)} /> : null}
            </div>
          </section>
        )}

        {ONBOARDING_SECTIONS.map((section) => {
          const fields = ONBOARDING_FIELDS.filter((f) => f.section === section);
          if (fields.length === 0) return null;
          return (
            <section key={section} className="card" style={{ padding: "28px 28px" }}>
              <h3 style={{ margin: "0 0 20px" }}>{section}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {fields.map((field) => {
                  if (locked(field.key)) {
                    return <LockedField key={field.key} label={field.label} value={val(client, field.key)} />;
                  }
                  return (
                    <div key={field.key}>
                      <div className="label" style={{ marginBottom: 8 }}>{field.label}</div>
                      {field.type === "textarea" ? (
                        <textarea
                          name={field.key}
                          className="input"
                          defaultValue={val(client, field.key)}
                          placeholder={field.placeholder}
                          style={{ height: 96, padding: "12px 14px", resize: "vertical" }}
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
            </section>
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

      {/* service order + signature */}
      <section className="card" style={{ padding: "28px 28px" }}>
        <h3 style={{ margin: "0 0 8px" }}>Service Order</h3>
        <p style={{ color: "var(--ash)", fontSize: 14, lineHeight: 1.7, margin: "0 0 20px" }}>
          The engagement begins with an initial sixty-day operating period, then continues month to month, prepaid, until
          either side ends it in writing. The build begins once this is signed and payment clears.
        </p>

        {signed ? (
          <div
            style={{
              padding: "16px 18px",
              border: "1px solid var(--sage)",
              borderRadius: 8,
              color: "var(--sage)",
              fontSize: 14,
            }}
          >
            Signed — {levelLabel(client.level)}. Thank you.
          </div>
        ) : (
          <form action={onSign} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Your level</div>
              <Dropdown name="level" options={[...LEVELS]} defaultValue={client.level ?? "start"} />
            </div>

            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.6, color: "var(--charcoal)" }}>
              <input type="checkbox" name="terms" style={{ marginTop: 4 }} />
              <span>
                I have read and agree to the terms on behalf of my company, and I authorise InMarketLabs to invoice the
                amount due at signing and the monthly subscription at the selected level.
              </span>
            </label>

            <div>
              <div className="label" style={{ marginBottom: 8 }}>Typed signature (full legal name)</div>
              <input name="signature_name" className="input" placeholder="Type your full legal name" />
              <p style={{ color: "var(--ash)", fontSize: 12, marginTop: 6 }}>
                A typed name here is your authorised signature on this order.
              </p>
            </div>

            {signErr ? <span style={{ color: "var(--cinnabar)", fontSize: 14 }}>{signErr}</span> : null}

            <div>
              <button className="btn" type="submit" disabled={signPending}>
                {signPending ? "Signing..." : "Sign the order"}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* payment */}
      <section className="card" style={{ padding: "28px 28px" }}>
        <h3 style={{ margin: "0 0 8px" }}>Payment</h3>
        {client.paid ? (
          <p style={{ color: "var(--sage)", fontSize: 14, margin: 0 }}>Payment received. Thank you.</p>
        ) : client.invoice_url ? (
          <>
            <p style={{ color: "var(--ash)", fontSize: 14, lineHeight: 1.7, margin: "0 0 18px" }}>
              Complete payment to start the build. Payable by credit card, ACH or wire.
            </p>
            <a className="btn" href={String(client.invoice_url)} target="_blank" rel="noreferrer">
              Pay invoice
            </a>
          </>
        ) : (
          <p style={{ color: "var(--ash)", fontSize: 14, margin: 0 }}>
            Your invoice will appear here shortly. You can sign the order in the meantime.
          </p>
        )}
      </section>
    </div>
  );
}
