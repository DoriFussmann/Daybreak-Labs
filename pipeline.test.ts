// Fast, infra-free tests for the pieces that will silently break if wrong.
// Run: npx vitest run pipeline.test.ts
import { describe, it, expect } from "vitest";
import {
  canonicalEmail, computeHI, matchingClients, assignLeads,
  type Person, type TerritoryRule,
} from "./lib/pipeline";

const person = (over: Partial<Person> & { alUuid: string }): Person => over;

describe("canonicalEmail", () => {
  it("prefers first verified personal email", () => {
    expect(canonicalEmail(person({ alUuid: "1",
      personalVerifiedEmails: "a@x.com, b@x.com", personalEmails: "c@x.com" }))).toBe("a@x.com");
  });
  it("falls back to personal, then business", () => {
    expect(canonicalEmail(person({ alUuid: "1", personalEmails: "c@x.com" }))).toBe("c@x.com");
    expect(canonicalEmail(person({ alUuid: "1", businessEmail: "d@x.com" }))).toBe("d@x.com");
  });
  it("returns null when no email", () => {
    expect(canonicalEmail(person({ alUuid: "1" }))).toBeNull();
  });
});

describe("computeHI", () => {
  it("is the UUID intersection of FS and CC", () => {
    const fs = [person({ alUuid: "1" }), person({ alUuid: "2" }), person({ alUuid: "3" })];
    const cc = [person({ alUuid: "2" }), person({ alUuid: "3" }), person({ alUuid: "4" })];
    expect([...computeHI(fs, cc)].sort()).toEqual(["2", "3"]);
  });
});

describe("matchingClients (territory: state + optional city)", () => {
  const rules: TerritoryRule[] = [
    { clientId: "A", state: "CA" },                      // whole state
    { clientId: "B", state: "CA", city: "Los Angeles" }, // city-refined
  ];
  it("whole-state rule matches any city in that state", () => {
    expect(matchingClients(person({ alUuid: "1", personalState: "CA", personalCity: "San Diego" }), rules))
      .toEqual(["A"]);
  });
  it("both a whole-state and a matching city rule fire -> overlap", () => {
    expect(matchingClients(person({ alUuid: "1", personalState: "CA", personalCity: "LOS ANGELES" }), rules))
      .toEqual(["A", "B"]);
  });
  it("no state -> matches nobody (holding bucket)", () => {
    expect(matchingClients(person({ alUuid: "1", personalState: "" }), rules)).toEqual([]);
  });
  it("normalizes case/whitespace on city", () => {
    expect(matchingClients(person({ alUuid: "1", personalState: "ca", personalCity: " los angeles " }), rules))
      .toEqual(["A", "B"]);
  });
});

describe("assignLeads", () => {
  const territories: TerritoryRule[] = [
    { clientId: "A", state: "CA" },
    { clientId: "B", state: "CA" }, // A and B share CA -> round-robin
  ];
  it("round-robins shared territory across clients", () => {
    const ppl = ["1", "2", "3", "4"].map((u) => person({ alUuid: u, personalState: "CA" }));
    const r = assignLeads({ fs: ppl, cc: [], territories, alreadyOwned: new Set() });
    const owners = r.assignments.sort((a, b) => a.alUuid.localeCompare(b.alUuid)).map((a) => a.clientId);
    expect(owners).toEqual(["A", "B", "A", "B"]);
  });
  it("never reassigns an already-owned uuid", () => {
    const ppl = [person({ alUuid: "1", personalState: "CA" }), person({ alUuid: "2", personalState: "CA" })];
    const r = assignLeads({ fs: ppl, cc: [], territories, alreadyOwned: new Set(["1"]) });
    expect(r.assignments.map((a) => a.alUuid)).toEqual(["2"]);
  });
  it("tags HI when a uuid is in both FS and CC", () => {
    const r = assignLeads({
      fs: [person({ alUuid: "9", personalState: "CA" })],
      cc: [person({ alUuid: "9", personalState: "CA" })],
      territories, alreadyOwned: new Set(),
    });
    expect(r.assignments[0].sourceLists.sort()).toEqual(["CC", "FS", "HI"]);
  });
  it("parks stateless leads in unassigned", () => {
    const r = assignLeads({
      fs: [person({ alUuid: "1", personalState: "" })],
      cc: [], territories, alreadyOwned: new Set(),
    });
    expect(r.assignments).toHaveLength(0);
    expect(r.unassigned).toEqual(["1"]);
  });
});
