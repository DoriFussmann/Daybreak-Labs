"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

// Displays the one permanent intake link for Jay, with a copy button.
export function StandingIntake({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          border: "1px solid var(--smoke)",
          borderRadius: 6,
          background: "#F4F5F6",
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: "var(--ink)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {url}
        </span>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={copy}
          style={{ height: 34, padding: "0 12px", flexShrink: 0 }}
        >
          {copied ? <Check size={16} strokeWidth={1.5} /> : <Copy size={16} strokeWidth={1.5} />}
          <span style={{ marginLeft: 6 }}>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <p style={{ color: "var(--ash)", fontSize: 13, margin: 0 }}>
        This is Jay&rsquo;s permanent link — he can bookmark it and submit any number of clients. Each submission appears
        below. No need to generate a new one.
      </p>
    </div>
  );
}
