// Proves the isolation guarantee: Client A's user CANNOT read Client B's leads.
// This is an INTEGRATION test — it needs a running Supabase (local or a project)
// with 001_schema.sql applied. Run: npx vitest run rls-isolation.test.ts
//
// Env required:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
// Locally:  supabase start  (then use the printed url + keys)
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anon = process.env.SUPABASE_ANON_KEY!;

const admin = createClient(url, service, { auth: { persistSession: false } });

let clientA = "", clientB = "";
let userA: SupabaseClient, userB: SupabaseClient;
const emailA = `a_${Date.now()}@example.com`;
const emailB = `b_${Date.now()}@example.com`;
const pw = "test-passw0rd!";

async function makeUser(email: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email, password: pw, email_confirm: true,
  });
  if (error) throw error;
  const c = createClient(url, anon, { auth: { persistSession: false } });
  const { error: e2 } = await c.auth.signInWithPassword({ email, password: pw });
  if (e2) throw e2;
  return { id: data.user!.id, client: c };
}

beforeAll(async () => {
  const a = await makeUser(emailA);
  const b = await makeUser(emailB);
  userA = a.client; userB = b.client;

  const { data: cs } = await admin.from("clients")
    .insert([{ name: "Client A" }, { name: "Client B" }]).select();
  clientA = cs!.find((c) => c.name === "Client A")!.id;
  clientB = cs!.find((c) => c.name === "Client B")!.id;

  await admin.from("client_members").insert([
    { user_id: a.id, client_id: clientA },
    { user_id: b.id, client_id: clientB },
  ]);
  await admin.from("leads").insert([
    { al_uuid: `A_${Date.now()}`, owning_client_id: clientA, email: "lead-a@x.com" },
    { al_uuid: `B_${Date.now()}`, owning_client_id: clientB, email: "lead-b@x.com" },
  ]);
});

afterAll(async () => {
  await admin.from("clients").delete().in("id", [clientA, clientB]);
});

describe("RLS lead isolation", () => {
  it("Client A sees only its own lead", async () => {
    const { data } = await userA.from("leads").select("owning_client_id");
    expect(data!.length).toBe(1);
    expect(data!.every((r) => r.owning_client_id === clientA)).toBe(true);
  });

  it("Client A CANNOT read Client B's leads", async () => {
    const { data } = await userA.from("leads").select("*").eq("owning_client_id", clientB);
    expect(data).toEqual([]); // filtered out by RLS, not an error
  });

  it("Client B sees only its own lead", async () => {
    const { data } = await userB.from("leads").select("owning_client_id");
    expect(data!.length).toBe(1);
    expect(data!.every((r) => r.owning_client_id === clientB)).toBe(true);
  });
});
