import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Dropdown } from "@/app/ui/dropdown";
import { topicTypeOptions } from "@/lib/post4me-types";
import { BackLink } from "../../back-link";
import { Section, StatusBadge } from "../../clients/client-fields";
import { setTopicActive, updateTopic } from "../actions";

export default async function TopicDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const db = createAdminClient();
  const { data: topic } = await db
    .from("post_topics")
    .select("id, title, guidance, client_type, is_active")
    .eq("id", id)
    .maybeSingle();
  if (!topic) notFound();

  const { data: typeRows } = await db.from("post_topics").select("client_type");
  const formTypes = topicTypeOptions((typeRows ?? []).map((t) => t.client_type));

  return (
    <div>
      <BackLink href="/console/topics" label="Back to topics" />

      <form action={updateTopic.bind(null, topic.id)}>
        <Section
          title="Topic"
          meta={
            <StatusBadge
              label={topic.is_active ? "Active" : "Inactive"}
              tone={topic.is_active ? "ok" : "off"}
            />
          }
          action={
            <button className="btn" type="submit" style={{ height: 36, padding: "0 16px" }}>
              Save
            </button>
          }
        >
          <div style={{ display: "grid", gap: 16, maxWidth: 680 }}>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Title</div>
              <input className="input" name="title" defaultValue={topic.title} required />
            </div>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Guidance</div>
              <textarea className="textarea" name="guidance" rows={5} defaultValue={topic.guidance ?? ""} />
            </div>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Client type</div>
              <Dropdown
                name="client_type"
                defaultValue={topic.client_type ?? ""}
                options={formTypes}
              />
            </div>
          </div>
        </Section>
      </form>

      <form action={setTopicActive.bind(null, topic.id, !topic.is_active)} style={{ marginTop: 16 }}>
        <button
          type="submit"
          className="btn btn-ghost"
          style={topic.is_active ? { color: "var(--cinnabar)" } : undefined}
        >
          {topic.is_active ? "Deactivate" : "Reactivate"}
        </button>
      </form>
    </div>
  );
}
