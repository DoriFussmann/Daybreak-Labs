"use client";

import { useState } from "react";

export function LinesEditor({
  initial,
  max,
  save,
  addLabel = "Add line",
}: {
  initial: { id: string; body: string }[];
  max?: number;
  save: (lines: string[]) => Promise<{ ok: true } | { ok: false; error: string }>;
  addLabel?: string;
}) {
  const [rows, setRows] = useState(initial.map((r) => r.body));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const atMax = max != null && rows.length >= max;

  return (
    <div>
      <div style={{ display: "grid", gap: 12 }}>
        {rows.length === 0 ? (
          <p style={{ color: "var(--ash)", margin: 0 }}>No lines yet.</p>
        ) : (
          rows.map((body, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <textarea
                className="textarea"
                rows={2}
                value={body}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = e.target.value;
                  setRows(next);
                }}
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
                style={{ color: "var(--cinnabar)", height: 36, padding: "0 10px", flexShrink: 0 }}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 16 }}>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={atMax}
          onClick={() => {
            if (atMax) return;
            setRows([...rows, ""]);
          }}
        >
          {addLabel}
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={async () => {
            setError("");
            setBusy(true);
            try {
              const res = await save(rows);
              if (!res.ok) setError(res.error);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not save.");
            }
            setBusy(false);
          }}
          style={{ height: 44, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "Saving" : "Save"}
        </button>
        {max != null ? (
          <span style={{ color: "var(--ash)", fontSize: 14 }}>
            {rows.length} of {max}
          </span>
        ) : null}
      </div>
      {error ? (
        <p style={{ color: "var(--cinnabar)", fontSize: 14, margin: "12px 0 0" }}>{error}</p>
      ) : null}
    </div>
  );
}
