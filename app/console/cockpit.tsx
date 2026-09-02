"use client";

import { useState } from "react";
import { runAssignment } from "./actions";
import { pushToInstantly } from "./push-actions";

type Success = Extract<Awaited<ReturnType<typeof runAssignment>>, { ok: true }>;
type PushResult = Awaited<ReturnType<typeof pushToInstantly>>;

export function Cockpit() {
  const [fs, setFs] = useState<File | null>(null);
  const [cc, setCc] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Success | null>(null);
  const [pushing, setPushing] = useState(false);
  const [pushError, setPushError] = useState("");
  const [pushResult, setPushResult] = useState<PushResult | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const formData = new FormData();
    if (fs) formData.set("fs", fs);
    if (cc) formData.set("cc", cc);
    const res = await runAssignment(formData);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResult(res);
  }

  return (
    <div style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 24px" }}>
      <h2>Tonight&apos;s run</h2>
      <p style={{ color: "var(--ash)", marginTop: 8, maxWidth: 680 }}>
        Upload both exports, then assign. Nothing runs on its own.
      </p>

      <form onSubmit={onSubmit} className="card" style={{ padding: "36px 32px", marginTop: 40 }}>
        <div style={{ marginBottom: 20 }}>
          <div className="label" style={{ marginBottom: 8 }}>Franchise Seekers (FS)</div>
          <input
            className="input"
            type="file"
            accept=".csv"
            onChange={(e) => setFs(e.target.files?.[0] ?? null)}
            style={{ paddingTop: 10 }}
          />
        </div>
        <div style={{ marginBottom: error ? 12 : 24 }}>
          <div className="label" style={{ marginBottom: 8 }}>Career Changers (CC)</div>
          <input
            className="input"
            type="file"
            accept=".csv"
            onChange={(e) => setCc(e.target.files?.[0] ?? null)}
            style={{ paddingTop: 10 }}
          />
        </div>
        {error && (
          <div style={{ color: "var(--cinnabar)", fontSize: 14, marginBottom: 20 }}>{error}</div>
        )}
        <button
          className="btn"
          type="submit"
          disabled={busy}
          style={{ opacity: busy ? 0.6 : 1, cursor: busy ? "default" : "pointer" }}
        >
          {busy ? "Assigning…" : "Upload and assign"}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: 40 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 16,
            }}
          >
            <Metric label="FS rows" value={result.fsCount} />
            <Metric label="CC rows" value={result.ccCount} />
            <Metric label="In both (HI)" value={result.hi} />
            <Metric label="Assigned" value={result.assigned} />
            <Metric label="Holding" value={result.holding} />
          </div>

          {result.perClient.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <div className="label" style={{ marginBottom: 16 }}>Per client</div>
              <div className="card" style={{ padding: "8px 0" }}>
                {result.perClient.map((row, i) => (
                  <div
                    key={row.name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "16px 24px",
                      borderTop: i === 0 ? "none" : "1px solid var(--smoke)",
                    }}
                  >
                    <span>{row.name}</span>
                    <span className="mono" style={{ color: "var(--ink)" }}>{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card" style={{ padding: "36px 32px", marginTop: 40 }}>
            <h3 style={{ marginBottom: 8 }}>Push to Instantly</h3>
            <p style={{ color: "var(--ash)", marginBottom: 24, maxWidth: 680 }}>
              Send unpushed assigned leads into each client&apos;s Instantly campaigns.
            </p>
            <button
              className="btn"
              type="button"
              disabled={pushing}
              onClick={async () => {
                setPushError("");
                setPushing(true);
                try {
                  const res = await pushToInstantly();
                  setPushResult(res);
                } catch (e: unknown) {
                  setPushError(e instanceof Error ? e.message : "Push failed.");
                }
                setPushing(false);
              }}
              style={{ opacity: pushing ? 0.6 : 1, cursor: pushing ? "default" : "pointer" }}
            >
              {pushing ? "Pushing…" : "Push to Instantly"}
            </button>
            {pushError && (
              <div style={{ color: "var(--cinnabar)", fontSize: 14, marginTop: 20 }}>{pushError}</div>
            )}
          </div>

          {pushResult && (
            <div style={{ marginTop: 24 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 16,
                }}
              >
                <Metric label="Pushed" value={pushResult.pushed} />
                <Metric label="Skipped" value={pushResult.skipped} />
                <Metric label="Errors" value={pushResult.errorCount} />
              </div>
              {pushResult.errorCount > 0 && (
                <div style={{ color: "var(--cinnabar)", fontSize: 14, marginTop: 16 }}>
                  {pushResult.sampleErrors.map((msg) => (
                    <div key={msg}>{msg}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="card" style={{ padding: "24px" }}>
      <div className="label">{label}</div>
      <div style={{ fontSize: 34, fontWeight: 300, color: "var(--ink)", lineHeight: 1.2, marginTop: 8 }}>
        {value}
      </div>
    </div>
  );
}
