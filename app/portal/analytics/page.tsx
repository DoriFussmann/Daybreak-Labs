import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Section } from "@/app/console/clients/client-fields";
import { TrendChart, type DailyPoint } from "./trend-chart";

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];
const LISTS = ["FS", "CC", "HI"] as const;

function utcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseRange(raw: string | string[] | undefined): Range {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "7" || value === "90") return Number(value) as Range;
  return 30;
}

function rate(part: number, whole: number): number | null {
  if (whole === 0) return null;
  return part / whole;
}

function formatRate(value: number | null): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export default async function PortalAnalytics({
  searchParams,
}: {
  searchParams: Promise<{ range?: string | string[] }>;
}) {
  const session = await requireSession();
  if (!session.clientIds[0]) redirect("/login");

  const range = parseRange((await searchParams).range);
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - range);
  const startDate = utcYmd(start);
  const endDate = utcYmd(end);

  const db = await createClient();
  const { data } = await db
    .from("metric_snapshots")
    .select("list_type, snapshot_date, sent, opens, clicks, replies")
    .eq("channel", "email")
    .gte("snapshot_date", startDate)
    .lte("snapshot_date", endDate)
    .order("snapshot_date", { ascending: true });

  const rows = data ?? [];
  let sent = 0;
  let opens = 0;
  let clicks = 0;
  let replies = 0;
  const byDate = new Map<string, DailyPoint>();
  const byList: Record<(typeof LISTS)[number], { sent: number; replies: number }> = {
    FS: { sent: 0, replies: 0 },
    CC: { sent: 0, replies: 0 },
    HI: { sent: 0, replies: 0 },
  };

  for (const row of rows) {
    const s = row.sent ?? 0;
    const o = row.opens ?? 0;
    const c = row.clicks ?? 0;
    const r = row.replies ?? 0;
    sent += s;
    opens += o;
    clicks += c;
    replies += r;

    const date = row.snapshot_date;
    const day = byDate.get(date) ?? { date, sent: 0, opens: 0, replies: 0 };
    day.sent += s;
    day.opens += o;
    day.replies += r;
    byDate.set(date, day);

    const list = row.list_type as (typeof LISTS)[number];
    if (byList[list]) {
      byList[list].sent += s;
      byList[list].replies += r;
    }
  }

  const daily = [...byDate.values()];
  const lists = LISTS.filter((list) => byList[list].sent > 0).map((list) => ({
    list,
    sent: byList[list].sent,
    replyRate: rate(byList[list].replies, byList[list].sent),
  }));
  const empty = sent === 0 && daily.length === 0;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: empty ? 24 : 40,
        }}
      >
        <h2 style={{ margin: 0 }}>Email analytics</h2>
        <nav className="portal-range" style={{ display: "flex", gap: 4 }} aria-label="Date range">
          {RANGES.map((n) => {
            const active = n === range;
            return (
              <Link
                key={n}
                href={`/portal/analytics?range=${n}`}
                style={{
                  padding: "6px 10px",
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  color: active ? "var(--ink)" : "var(--ash)",
                  borderBottom: active ? "2px solid var(--brass)" : "2px solid transparent",
                }}
              >
                {n} days
              </Link>
            );
          })}
        </nav>
      </div>

      {empty ? (
        <div className="card" style={{ padding: "36px 32px" }}>
          <p style={{ color: "var(--ash)", margin: 0, maxWidth: 680 }}>
            No email analytics yet. Data appears here once your campaigns start sending.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <StatCard label="Emails sent" value={sent} />
            <StatCard label="Opens" value={opens} rate={rate(opens, sent)} />
            <StatCard label="Replies" value={replies} rate={rate(replies, sent)} />
            <StatCard label="Clicks" value={clicks} rate={rate(clicks, sent)} />
          </div>

          <div className="card" style={{ padding: "36px 32px", marginTop: 24 }}>
            <TrendChart daily={daily} />
          </div>

          {lists.length > 0 && (
            <Section title="By list">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th className="label" style={{ textAlign: "left", padding: "0 0 12px", fontWeight: 500 }}>
                      List
                    </th>
                    <th className="label" style={{ textAlign: "right", padding: "0 0 12px", fontWeight: 500 }}>
                      Sent
                    </th>
                    <th className="label" style={{ textAlign: "right", padding: "0 0 12px", fontWeight: 500 }}>
                      Reply rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lists.map((row, i) => (
                    <tr key={row.list}>
                      <td
                        className="mono"
                        style={{
                          padding: "16px 0",
                          borderTop: i === 0 ? "1px solid var(--smoke)" : undefined,
                          borderBottom: "1px solid var(--smoke)",
                          color: "var(--ink)",
                        }}
                      >
                        {row.list}
                      </td>
                      <td
                        className="mono"
                        style={{
                          padding: "16px 0",
                          textAlign: "right",
                          borderTop: i === 0 ? "1px solid var(--smoke)" : undefined,
                          borderBottom: "1px solid var(--smoke)",
                          color: "var(--ink)",
                        }}
                      >
                        {row.sent.toLocaleString("en-US")}
                      </td>
                      <td
                        className="mono"
                        style={{
                          padding: "16px 0",
                          textAlign: "right",
                          borderTop: i === 0 ? "1px solid var(--smoke)" : undefined,
                          borderBottom: "1px solid var(--smoke)",
                          color: "var(--ink)",
                        }}
                      >
                        {formatRate(row.replyRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, rate: rateValue }: { label: string; value: number; rate?: number | null }) {
  return (
    <div className="card" style={{ padding: 24, flex: "1 1 160px", minWidth: 140 }}>
      <div className="label">{label}</div>
      <div
        className="mono"
        style={{ fontSize: 34, fontWeight: 300, color: "var(--ink)", lineHeight: 1.2, marginTop: 8 }}
      >
        {value.toLocaleString("en-US")}
      </div>
      {rateValue !== undefined && (
        <div style={{ color: "var(--ash)", fontSize: 13, marginTop: 4 }}>{formatRate(rateValue)}</div>
      )}
    </div>
  );
}
