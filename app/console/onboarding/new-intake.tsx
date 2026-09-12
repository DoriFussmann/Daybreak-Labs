"use client";

import { useState, useTransition } from "react";
import { Copy, Check } from "lucide-react";
import { createIntakeToken } from "./actions";

export function NewIntake() {
  const [pending, start] = useTransition();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function create() {
    start(async () => {
      const res = await createIntakeToken(label);
      setUrl(res.url);
      setCopied(false);
    });
  }

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="Label (optional) — e.g. Blue Sage / from Jay"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{ maxWidth: 360 }}
        />
        <button className="btn" type="button" onClick={create} disabled={pending}>
          {pending ? "Creating..." : "Create intake link"}
        </button>
      </div>
      {url ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            border: "1px solid var(--smoke)",
            borderRadius: 6,
            background: "var(--parchment)",
          }}
        >
          <span style={{ fontFamily: "var(--mono, monospace)", fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {url}
          </span>
          <button className="btn btn-ghost" type="button" onClick={copy} style={{ height: 34, padding: "0 12px", flexShrink: 0 }}>
            {copied ? <Check size={16} strokeWidth={1.5} /> : <Copy size={16} strokeWidth={1.5} />}
            <span style={{ marginLeft: 6 }}>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      ) : null}
      <p style={{ color: "var(--ash)", fontSize: 13, margin: 0 }}>
        Send this to Jay. When he submits it, the client appears below.
      </p>
    </div>
  );
}
