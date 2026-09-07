"use client";

import { useState } from "react";
import { submitApprovedPosts } from "./actions";

export function DraftPicker({
  clientId,
  cycleId,
  drafts,
}: {
  clientId: string;
  cycleId: string;
  drafts: { id: string; variant: number; body: string }[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      if (current.length >= 2) return current;
      return [...current, id];
    });
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
          const res = await submitApprovedPosts(clientId, cycleId, selected);
          if (!res.ok) setError(res.error);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not submit.");
        }
        setBusy(false);
      }}
    >
      <p style={{ color: "var(--ash)", margin: "0 0 16px", maxWidth: 680 }}>
        Pick exactly two posts, then submit them as approved.
      </p>
      <div style={{ display: "grid", gap: 16 }}>
        {drafts.map((draft) => {
          const on = selected.includes(draft.id);
          return (
            <button
              key={draft.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(draft.id)}
              style={{
                textAlign: "left",
                padding: 24,
                background: "var(--white)",
                border: `1px solid ${on ? "var(--ink)" : "var(--smoke)"}`,
                borderRadius: 10,
                cursor: selected.length === 2 && !on ? "default" : "pointer",
                boxShadow: on ? "inset 3px 0 0 var(--brass)" : undefined,
                color: "var(--charcoal)",
                font: "inherit",
                opacity: selected.length === 2 && !on ? 0.7 : 1,
              }}
            >
              <div className="label" style={{ marginBottom: 8 }}>
                Post {draft.variant}
              </div>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{draft.body}</div>
            </button>
          );
        })}
      </div>
      {error ? (
        <p style={{ color: "var(--cinnabar)", fontSize: 14, margin: "16px 0 0" }}>{error}</p>
      ) : null}
      <button
        className="btn"
        type="submit"
        disabled={busy || selected.length !== 2}
        style={{ marginTop: 24, opacity: busy || selected.length !== 2 ? 0.6 : 1 }}
      >
        {busy ? "Submitting" : "Submit approved posts"}
      </button>
    </form>
  );
}
