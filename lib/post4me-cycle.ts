// Pure Post4Me calendar and deadline rules. No I/O — test like lib/pipeline.ts.
// Week is Monday–Sunday in America/New_York. Selection closes Tuesday 23:59 there.

export const POST4ME_TZ = "America/New_York";

export type PostingMode = "opt_in" | "opt_out";
export type CycleStatus = "generated" | "selected" | "approved" | "scheduled" | "skipped" | "failed";
export type Slot = "wed" | "fri";

export type DeadlineCandidate = { id: string; variant: number; chosen: boolean };

export type DeadlineCycle = {
  status: CycleStatus | string;
  postingMode: PostingMode;
  deadline: string | null;
  candidates: DeadlineCandidate[];
};

export type DeadlineDecision =
  | { action: "none" }
  | { action: "skip" }
  | { action: "auto_select"; picks: { id: string; slot: Slot }[] };

const WEEKDAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function partsInTz(date: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const map = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  let hour = Number(map.hour);
  if (hour === 24) hour = 0;
  return {
    weekday: map.weekday,
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

export function ymdInTz(date: Date, tz = POST4ME_TZ): string {
  const p = partsInTz(date, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Instant whose wall-clock in `tz` is ymd at h:min:s. */
export function zonedDateTimeToUtc(ymd: string, h: number, min: number, s: number, tz = POST4ME_TZ): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  let utc = Date.UTC(y, m - 1, d, h + 5, min, s);
  for (let i = 0; i < 8; i++) {
    const date = new Date(utc);
    const p = partsInTz(date, tz);
    const target = Date.UTC(y, m - 1, d, h, min, s);
    const actual = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const diff = target - actual;
    if (diff === 0) return date;
    utc += diff;
  }
  return new Date(utc);
}

/** Monday of the current Post4Me week (YYYY-MM-DD in America/New_York). */
export function cycleMonday(now = new Date()): string {
  const p = partsInTz(now, POST4ME_TZ);
  const dow = WEEKDAY[p.weekday] ?? 1;
  const sinceMonday = dow === 0 ? 6 : dow - 1;
  return addDaysYmd(ymdInTz(now), -sinceMonday);
}

/** Tuesday 23:59:00 America/New_York of the week that starts on `mondayYmd`. */
export function selectionDeadlineIso(mondayYmd: string): string {
  return zonedDateTimeToUtc(addDaysYmd(mondayYmd, 1), 23, 59, 0).toISOString();
}

/** Lower variant → Wednesday, higher → Friday. */
export function slotsForPicks<T extends { id: string; variant: number }>(picks: T[]): { id: string; slot: Slot }[] {
  const sorted = [...picks].sort((a, b) => a.variant - b.variant);
  return sorted.map((p, i) => ({ id: p.id, slot: (i === 0 ? "wed" : "fri") as Slot }));
}

export function decideDeadline(cycle: DeadlineCycle, now = new Date()): DeadlineDecision {
  if (cycle.status !== "generated") return { action: "none" };
  if (!cycle.deadline || now.getTime() < new Date(cycle.deadline).getTime()) return { action: "none" };
  if (cycle.postingMode === "opt_in") return { action: "skip" };
  const ranked = [...cycle.candidates].sort((a, b) => a.variant - b.variant).slice(0, 2);
  if (ranked.length < 2) return { action: "skip" };
  return { action: "auto_select", picks: slotsForPicks(ranked) };
}
