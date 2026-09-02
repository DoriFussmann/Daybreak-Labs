// Smoke-test the pipeline against a REAL AudienceLab export.
// Usage:
//   npx tsx try-pipeline.ts FS.csv CC.csv     (your two real exports)
//   npx tsx try-pipeline.ts sample.csv        (one file -> simulated split)
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { assignLeads, computeHI, type Person, type TerritoryRule } from "./lib/pipeline";

function load(path: string): Person[] {
  const rows = parse(readFileSync(path), {
    columns: true, skip_empty_lines: true, relax_quotes: true,
    relax_column_count: true, trim: true,
  });
  return rows.map((r: any): Person => ({
    alUuid: r.UUID,
    firstName: r.FIRST_NAME, lastName: r.LAST_NAME,
    personalCity: r.PERSONAL_CITY, personalState: r.PERSONAL_STATE,
    companyName: r.COMPANY_NAME, jobTitle: r.JOB_TITLE, linkedinUrl: r.LINKEDIN_URL,
    personalVerifiedEmails: r.PERSONAL_VERIFIED_EMAILS,
    personalEmails: r.PERSONAL_EMAILS, businessEmail: r.BUSINESS_EMAIL,
  })).filter((p: Person) => p.alUuid);
}

const args = process.argv.slice(2);
let fs_: Person[], cc: Person[];
if (args.length >= 2) { fs_ = load(args[0]); cc = load(args[1]); }
else {
  const all = load(args[0]);                       // one file -> fake two overlapping audiences
  fs_ = all.filter((_, i) => i % 3 !== 0);
  cc  = all.filter((_, i) => i % 2 === 0);
  console.log("(one file given -> simulated FS/CC split for the smoke test)\n");
}

// demo territory map: acme owns CA, globex owns NY, both share TX -> round-robin
const territories: TerritoryRule[] = [
  { clientId: "acme",   state: "CA" },
  { clientId: "globex", state: "NY" },
  { clientId: "acme",   state: "TX" },
  { clientId: "globex", state: "TX" },
];

const r = assignLeads({ fs: fs_, cc, territories, alreadyOwned: new Set() });
const per: Record<string, number> = {};
for (const a of r.assignments) per[a.clientId] = (per[a.clientId] ?? 0) + 1;

console.log("FS rows:              ", fs_.length);
console.log("CC rows:              ", cc.length);
console.log("HI (in both, by UUID):", computeHI(fs_, cc).size);
console.log("Assigned total:       ", r.assignments.length);
console.log("  per client:         ", per);
console.log("Unassigned (no CA/NY/TX territory or no state):", r.unassigned.length);
console.log("\nSample assigned lead:", r.assignments[0]);
