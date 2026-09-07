import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { asLine } from "@/lib/post4me-lines";
import { ymdInTz } from "@/lib/post4me-cycle";
import { Section, StatusBadge } from "../clients/client-fields";
import { GenerateProposalButton, SendApprovalButton, TopicSelectButton } from "./action-button";
import { ClientPicker } from "./client-picker";
import { DraftEditors } from "./draft-editors";

function parseId(raw: string | string[] | undefined) {
  return (Array.isArray(raw) ? raw[0] : raw)?.trim() || "";
}

export default async function PostsGeneratorPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string | string[]; topic?: string | string[] }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const clientId = parseId(params.client);
  const topicId = parseId(params.topic);

  const db = createAdminClient();
  const { data: clientRows } = await db.from("clients").select("id, name, client_type").order("name");
  const clients = clientRows ?? [];
  const client = clients.find((c) => c.id === clientId) ?? null;

  const { data: topic } = topicId
    ? await db.from("post_topics").select("id, title, guidance").eq("id", topicId).maybeSingle()
    : { data: null };

  const today = ymdInTz(new Date());
  let cycleQuery = client
    ? await db
        .from("post_cycles")
        .select("id, cycle_date, status, sent_at")
        .eq("client_id", client.id)
        .eq("cycle_date", today)
        .maybeSingle()
    : { data: null, error: null };
  if (cycleQuery.error && /sent_at|PGRST204/i.test(cycleQuery.error.message)) {
    cycleQuery = await db
      .from("post_cycles")
      .select("id, cycle_date, status")
      .eq("client_id", client!.id)
      .eq("cycle_date", today)
      .maybeSingle();
  }
  const cycle = (cycleQuery.data ?? null) as {
    id: string;
    cycle_date: string;
    status: string;
    sent_at?: string | null;
  } | null;

  const { data: drafts } = cycle
    ? await db
        .from("post_candidates")
        .select("id, variant, body, topic_id")
        .eq("cycle_id", cycle.id)
        .order("variant")
    : { data: [] };

  const cycleTopicId = drafts?.[0]?.topic_id ?? null;
  const { data: cycleTopic } =
    !topic && cycleTopicId
      ? await db.from("post_topics").select("id, title, guidance").eq("id", cycleTopicId).maybeSingle()
      : { data: null };
  const shownTopic = topic ?? cycleTopic;

  const sent = Boolean(cycle?.sent_at);

  const { data: noteRows } = client
    ? await db.from("client_post_notes").select("*").eq("client_id", client.id)
    : { data: [] };
  const notes = (noteRows ?? [])
    .map((row) => asLine(row as Record<string, unknown>))
    .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));

  return (
    <div>
      <h2 style={{ margin: 0 }}>Posts Generator</h2>
      <p style={{ color: "var(--ash)", marginTop: 8, maxWidth: 680 }}>
        Pick a client, select one topic, then generate four posts. Send them when the copy is ready.
      </p>

      <Section title="Client">
        <ClientPicker
          value={clientId}
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
        />
        {client ? (
          <p style={{ color: "var(--ash)", fontSize: 14, margin: "12px 0 0" }}>
            {client.client_type ? client.client_type : "No client type set. Only all-types topics will match."}
          </p>
        ) : null}

        {client ? (
          <div style={{ marginTop: 24 }}>
            <div className="label" style={{ marginBottom: 8 }}>Client input | Notes to add</div>
            {notes.length === 0 ? (
              <p style={{ color: "var(--ash)", margin: 0 }}>No client notes yet.</p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {notes.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      padding: "12px 14px",
                      border: "1px solid var(--smoke)",
                      borderRadius: 6,
                      background: "var(--parchment)",
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.7,
                    }}
                  >
                    {note.body}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </Section>

      {client ? (
        <Section title="Topic">
          <TopicSelectButton clientId={client.id} />
          {shownTopic ? (
            <div
              style={{
                marginTop: 24,
                padding: 24,
                border: "1px solid var(--smoke)",
                borderRadius: 10,
              }}
            >
              <div className="label" style={{ marginBottom: 8 }}>Chosen topic</div>
              <div style={{ color: "var(--ink)" }}>{shownTopic.title}</div>
              {shownTopic.guidance ? (
                <p style={{ color: "var(--ash)", margin: "8px 0 0" }}>{shownTopic.guidance}</p>
              ) : null}
            </div>
          ) : (
            <p style={{ color: "var(--ash)", margin: "16px 0 0" }}>No topic selected yet.</p>
          )}
        </Section>
      ) : null}

      {client ? (
        <Section title="Proposal">
          <GenerateProposalButton clientId={client.id} topicId={topic?.id ?? null} />
          {!topic ? (
            <p style={{ color: "var(--ash)", fontSize: 14, margin: "12px 0 0" }}>
              Select a topic before generating.
            </p>
          ) : null}
        </Section>
      ) : null}

      {cycle && (drafts ?? []).length > 0 ? (
        <Section
          title="Posts"
          meta={
            <StatusBadge
              label={sent ? "Sent" : cycle.status === "approved" ? "Approved" : "Draft"}
              tone={sent || cycle.status === "approved" ? "ok" : "warn"}
            />
          }
        >
          <DraftEditors
            drafts={(drafts ?? []).map((d) => ({
              id: d.id,
              variant: Number(d.variant),
              body: d.body,
            }))}
          />
          <div style={{ marginTop: 24 }}>
            <SendApprovalButton
              cycleId={cycle.id}
              disabled={sent || cycle.status === "approved"}
            />
            {sent ? (
              <p style={{ color: "var(--ash)", fontSize: 14, margin: "12px 0 0" }}>
                Visible in the client portal.
              </p>
            ) : null}
          </div>
        </Section>
      ) : null}
    </div>
  );
}
