"use client";

import { useState, useTransition } from "react";
import { Copy, Check } from "lucide-react";
import { buildJayEmail } from "@/lib/onboarding";
import {
  getOrCreateOnboardingToken,
  markReady,
  markSent,
  saveInvoiceUrl,
  setPaid,
} from "../../onboarding/actions";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost"
      style={{ height: 34, padding: "0 12px" }}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check size={16} strokeWidth={1.5} /> : <Copy size={16} strokeWidth={1.5} />}
      <span style={{ marginLeft: 6 }}>{copied ? "Copied" : label}</span>
    </button>
  );
}

export function OnboardingControls({
  clientId,
  invoiceUrl,
  paid,
  readyAt,
  sentAt,
  onboardingUrl,
  contactName,
  secondContactName,
  companyName,
}: {
  clientId: string;
  invoiceUrl: string;
  paid: boolean;
  readyAt: string | null;
  sentAt: string | null;
  onboardingUrl: string | null;
  contactName: string | null;
  secondContactName: string | null;
  companyName: string | null;
}) {
  const [invoice, setInvoice] = useState(invoiceUrl);
  const [url, setUrl] = useState<string | null>(onboardingUrl);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run(fn: () => Promise<void>) {
    setMsg(null);
    start(async () => {
      try {
        await fn();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  const email =
    url != null
      ? buildJayEmail({
          contactName,
          secondContactName,
          companyName,
          onboardingUrl: url,
        })
      : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* invoice link */}
      <div>
        <div className="label" style={{ marginBottom: 8 }}>Stripe invoice link</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            className="input"
            value={invoice}
            onChange={(e) => setInvoice(e.target.value)}
            placeholder="https://invoice.stripe.com/i/..."
            style={{ maxWidth: 480 }}
          />
          <button className="btn btn-ghost" type="button" disabled={pending} onClick={() => run(() => saveInvoiceUrl(clientId, invoice))}>
            Save
          </button>
        </div>
        <p style={{ color: "var(--ash)", fontSize: 13, marginTop: 8 }}>
          The client pays through this one link. Match the amount to the level they&rsquo;ll sign.
        </p>
      </div>

      {/* stage buttons */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn btn-ghost" type="button" disabled={pending || Boolean(readyAt)} onClick={() => run(() => markReady(clientId))}>
          {readyAt ? "Ready ✓" : "Mark ready to send"}
        </button>
        <button className="btn btn-ghost" type="button" disabled={pending || Boolean(sentAt)} onClick={() => run(() => markSent(clientId))}>
          {sentAt ? "Sent ✓" : "Mark sent"}
        </button>
        <div style={{ display: "inline-flex", gap: 2, padding: 3, border: "1px solid var(--smoke)", borderRadius: 6 }}>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setPaid(clientId, false))}
            style={pillStyle(!paid, "off")}
          >
            Unpaid
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setPaid(clientId, true))}
            style={pillStyle(paid, "on")}
          >
            Paid
          </button>
        </div>
      </div>

      {/* onboarding link */}
      <div>
        <div className="label" style={{ marginBottom: 8 }}>Client onboarding link</div>
        {url ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 13,
                color: "var(--ink)",
                padding: "10px 14px",
                border: "1px solid var(--smoke)",
                borderRadius: 6,
                background: "var(--parchment)",
                maxWidth: 480,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {url}
            </span>
            <CopyButton text={url} label="Copy link" />
          </div>
        ) : (
          <button
            className="btn btn-ghost"
            type="button"
            disabled={pending}
            onClick={() => run(async () => { const r = await getOrCreateOnboardingToken(clientId); setUrl(r.url); })}
          >
            Generate onboarding link
          </button>
        )}
      </div>

      {/* Jay's email */}
      {url ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div className="label">Email for Jay to send</div>
            <CopyButton text={email} label="Copy email" />
          </div>
          <textarea
            readOnly
            value={email}
            className="input"
            style={{ height: 220, padding: "12px 14px", resize: "vertical", lineHeight: 1.6, fontSize: 14 }}
          />
        </div>
      ) : null}

      {msg ? <p style={{ color: "var(--cinnabar)", fontSize: 14, margin: 0 }}>{msg}</p> : null}
    </div>
  );
}

function pillStyle(active: boolean, kind: "on" | "off"): React.CSSProperties {
  return {
    height: 32,
    padding: "0 14px",
    border: "none",
    borderRadius: 4,
    background: active ? (kind === "on" ? "var(--sage)" : "var(--ink)") : "transparent",
    color: active ? "#fff" : "var(--ash)",
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    cursor: "pointer",
  };
}
