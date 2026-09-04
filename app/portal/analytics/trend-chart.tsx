export type DailyPoint = { date: string; sent: number; opens: number; replies: number };

const W = 720;
const H = 240;
const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 10;
const PAD_B = 28;
const INNER_W = W - PAD_L - PAD_R;
const INNER_H = H - PAD_T - PAD_B;

const SERIES = [
  { key: "sent" as const, label: "sent", color: "#1A1A2E" },
  { key: "opens" as const, label: "opens", color: "#B5935A" },
  { key: "replies" as const, label: "replies", color: "#3A7D5E" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function niceCeil(n: number): number {
  if (n <= 0) return 1;
  const padded = n * 1.15;
  const pow = 10 ** Math.floor(Math.log10(padded));
  const norm = padded / pow;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * pow;
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return `${MONTHS[month - 1]} ${day}`;
}

function formatTick(n: number) {
  if (n >= 1000) return `${Math.round(n / 100) / 10}k`;
  return String(Math.round(n));
}

export function TrendChart({ daily }: { daily: DailyPoint[] }) {
  if (daily.length < 2) {
    return (
      <p style={{ color: "var(--ash)", margin: 0 }}>Not enough data yet to chart a trend.</p>
    );
  }

  const rawMax = Math.max(...daily.flatMap((d) => [d.sent, d.opens, d.replies]), 0);
  const yMax = niceCeil(rawMax);
  const last = daily.length - 1;
  const xAt = (i: number) => PAD_L + (i / last) * INNER_W;
  const yAt = (v: number) => PAD_T + INNER_H - (v / yMax) * INNER_H;

  const ticks = [0, 1, 2, 3].map((i) => (yMax * i) / 3);
  const mid = Math.floor(last / 2);
  const xTicks = [...new Set([0, mid, last])];

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 12, color: "var(--ash)" }}>
        {SERIES.map((s) => (
          <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              aria-hidden
              style={{
                width: 10,
                height: 2,
                background: s.color,
                display: "inline-block",
              }}
            />
            {s.label}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label="Daily sent, opens, and replies"
      >
        {ticks.map((t) => {
          const y = yAt(t);
          return (
            <g key={t}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={y}
                y2={y}
                stroke="var(--smoke)"
                strokeWidth="1"
              />
              <text
                x={PAD_L - 8}
                y={y + 3}
                textAnchor="end"
                fill="var(--ash)"
                fontSize="11"
                fontFamily="var(--font-mono), monospace"
              >
                {formatTick(t)}
              </text>
            </g>
          );
        })}
        {SERIES.map((s) => {
          const points = daily.map((d, i) => `${xAt(i)},${yAt(d[s.key])}`).join(" ");
          return (
            <g key={s.key}>
              <polyline
                points={points}
                fill="none"
                stroke={s.color}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {daily.map((d, i) => (
                <circle key={`${s.key}-${d.date}`} cx={xAt(i)} cy={yAt(d[s.key])} r="2" fill={s.color} />
              ))}
            </g>
          );
        })}
        {xTicks.map((i) => (
          <text
            key={daily[i].date}
            x={xAt(i)}
            y={H - 6}
            textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}
            fill="var(--ash)"
            fontSize="11"
            fontFamily="var(--font-mono), monospace"
          >
            {formatDate(daily[i].date)}
          </text>
        ))}
      </svg>
    </div>
  );
}
