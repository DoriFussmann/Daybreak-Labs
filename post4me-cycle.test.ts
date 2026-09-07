// Run: npx vitest run post4me-cycle.test.ts
import { describe, it, expect } from "vitest";
import {
  addDaysYmd,
  cycleMonday,
  decideDeadline,
  selectionDeadlineIso,
  slotsForPicks,
  zonedDateTimeToUtc,
} from "./lib/post4me-cycle";

describe("cycleMonday", () => {
  it("returns the Monday of the current ET week", () => {
    // Monday 2026-09-07 08:00 ET (EDT, UTC-4)
    expect(cycleMonday(new Date("2026-09-07T12:00:00.000Z"))).toBe("2026-09-07");
    // Tuesday
    expect(cycleMonday(new Date("2026-09-08T16:00:00.000Z"))).toBe("2026-09-07");
    // Sunday belongs to the week that started the previous Monday
    expect(cycleMonday(new Date("2026-09-06T16:00:00.000Z"))).toBe("2026-08-31");
  });
});

describe("selectionDeadlineIso", () => {
  it("is Tuesday 23:59 America/New_York (EDT → 03:59 UTC next day)", () => {
    expect(selectionDeadlineIso("2026-09-07")).toBe("2026-09-09T03:59:00.000Z");
  });

  it("handles EST (UTC-5) in January", () => {
    // Monday 2026-01-05 → Tuesday 2026-01-06 23:59 EST
    expect(selectionDeadlineIso("2026-01-05")).toBe("2026-01-07T04:59:00.000Z");
  });
});

describe("zonedDateTimeToUtc / addDaysYmd", () => {
  it("adds calendar days without shifting the date string", () => {
    expect(addDaysYmd("2026-09-07", 1)).toBe("2026-09-08");
    expect(addDaysYmd("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("resolves a known ET wall-clock", () => {
    expect(zonedDateTimeToUtc("2026-09-08", 23, 59, 0).toISOString()).toBe("2026-09-09T03:59:00.000Z");
  });
});

describe("slotsForPicks", () => {
  it("assigns Wednesday to the lower variant", () => {
    expect(slotsForPicks([{ id: "b", variant: 4 }, { id: "a", variant: 1 }])).toEqual([
      { id: "a", slot: "wed" },
      { id: "b", slot: "fri" },
    ]);
  });
});

describe("decideDeadline", () => {
  const candidates = [
    { id: "1", variant: 3, chosen: false },
    { id: "2", variant: 1, chosen: false },
    { id: "3", variant: 4, chosen: false },
    { id: "4", variant: 2, chosen: false },
  ];
  const past = "2026-01-01T00:00:00.000Z";
  const future = "2099-01-01T00:00:00.000Z";

  it("does nothing before the deadline", () => {
    expect(
      decideDeadline({ status: "generated", postingMode: "opt_out", deadline: future, candidates }),
    ).toEqual({ action: "none" });
  });

  it("skips opt_in after the deadline", () => {
    expect(
      decideDeadline({ status: "generated", postingMode: "opt_in", deadline: past, candidates }),
    ).toEqual({ action: "skip" });
  });

  it("auto-selects the two lowest variants for opt_out", () => {
    expect(
      decideDeadline({ status: "generated", postingMode: "opt_out", deadline: past, candidates }),
    ).toEqual({
      action: "auto_select",
      picks: [
        { id: "2", slot: "wed" },
        { id: "4", slot: "fri" },
      ],
    });
  });

  it("does not touch cycles that are no longer waiting", () => {
    expect(
      decideDeadline({ status: "selected", postingMode: "opt_out", deadline: past, candidates }),
    ).toEqual({ action: "none" });
  });
});
