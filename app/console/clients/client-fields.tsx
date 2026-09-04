export function ReadValue({ children, empty }: { children: React.ReactNode; empty?: boolean }) {
  return (
    <div
      style={{
        minHeight: 44,
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        border: "1px solid var(--smoke)",
        borderRadius: 6,
        background: "var(--parchment)",
        color: empty ? "var(--ash)" : "var(--ink)",
        fontSize: 14,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

export function hrefFor(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

export function Section({
  title,
  action,
  meta,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card" style={{ padding: "36px 32px", marginTop: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, minWidth: 0 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          {meta}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="label" style={{ marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

export function Cols({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 16,
        width: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export type Tone = "ok" | "warn" | "off" | "bad";

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  const color =
    tone === "ok" ? "var(--sage)" :
    tone === "warn" ? "var(--amber)" :
    tone === "bad" ? "var(--cinnabar)" :
    "var(--ash)";
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${tone === "off" ? "var(--smoke)" : color}`,
        borderRadius: 6,
        padding: "2px 8px",
      }}
    >
      {label}
    </span>
  );
}

export function StatusCell({ title, label, tone }: { title: string; label: string; tone: Tone }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 8 }}>{title}</div>
      <div
        style={{
          minHeight: 44,
          display: "flex",
          alignItems: "center",
        }}
      >
        <StatusBadge label={label} tone={tone} />
      </div>
    </div>
  );
}

export function connectionStatus(id: string, resolved: boolean, hasKey: boolean): { label: string; tone: Tone } {
  if (!id) return { label: "Not connected", tone: "off" };
  if (!hasKey) return { label: "ID saved", tone: "warn" };
  if (resolved) return { label: "Connected", tone: "ok" };
  return { label: "Not found", tone: "bad" };
}

export function instantlyStatus(
  id: string,
  info: { name: string; status: string | null } | null,
  hasKey: boolean,
): { label: string; tone: Tone } {
  if (!id) return { label: "Not set", tone: "off" };
  if (!hasKey) return { label: "ID saved", tone: "warn" };
  if (!info) return { label: "Not found", tone: "bad" };
  const s = info.status;
  if (s === "paused") return { label: "Paused", tone: "warn" };
  if (s === "draft") return { label: "Draft", tone: "warn" };
  if (s === "completed") return { label: "Completed", tone: "off" };
  if (s === "suspended") return { label: "Suspended", tone: "bad" };
  if (s === "unhealthy") return { label: "Unhealthy", tone: "bad" };
  if (s === "active") return { label: "Active", tone: "ok" };
  return { label: "Ready", tone: "ok" };
}
