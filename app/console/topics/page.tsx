import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Dropdown } from "@/app/ui/dropdown";
import { topicTypeOptions } from "@/lib/post4me-types";
import { createTopic } from "./actions";
import { TypeFilter } from "./type-filter";

function parseType(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() ? value : "all";
}

export default async function TopicsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] }>;
}) {
  await requireAdmin();
  const type = parseType((await searchParams).type);

  const db = createAdminClient();
  const { data: rows } = await db
    .from("post_topics")
    .select("id, title, client_type, is_active")
    .order("is_active", { ascending: false })
    .order("title");

  const topics = rows ?? [];
  const typeOptions = [
    { value: "all", label: "All topics" },
    { value: "__any__", label: "All types" },
    ...topicTypeOptions(topics.map((t) => t.client_type)).filter((o) => o.value),
  ];
  const formTypes = topicTypeOptions(topics.map((t) => t.client_type));

  const filtered = topics.filter((t) => {
    if (type === "all") return true;
    if (type === "__any__") return t.client_type == null;
    return (t.client_type ?? "").toLowerCase() === type.toLowerCase();
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <div>
          <h2>Topics</h2>
          <p style={{ color: "var(--ash)", marginTop: 8, maxWidth: 680 }}>
            The bank the generator draws from. Open a topic to edit it.
          </p>
        </div>
        <details>
          <summary
            className="btn btn-ghost"
            style={{ listStyle: "none", display: "inline-flex", alignItems: "center" }}
          >
            Add topic
          </summary>
          <form action={createTopic} style={{ display: "grid", gap: 12, marginTop: 16, minWidth: 320, maxWidth: 440 }}>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Title</div>
              <input className="input" name="title" required />
            </div>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Guidance</div>
              <textarea className="textarea" name="guidance" rows={3} />
            </div>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>Client type</div>
              <Dropdown name="client_type" defaultValue="" options={formTypes} />
            </div>
            <button className="btn" type="submit" style={{ width: "auto", justifySelf: "start" }}>
              Save
            </button>
          </form>
        </details>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginTop: 24,
        }}
      >
        <TypeFilter value={typeOptions.some((o) => o.value === type) ? type : "all"} options={typeOptions} />
        <div style={{ color: "var(--ash)", fontSize: 14 }}>
          <span className="mono" style={{ color: "var(--ink)" }}>
            {filtered.length}
          </span>
          {filtered.length === 1 ? " topic" : " topics"}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ marginTop: 24, padding: "24px 32px", color: "var(--ash)" }}>
          No topics for this filter.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 16,
            marginTop: 24,
          }}
        >
          {filtered.map((topic) => (
            <Link
              key={topic.id}
              href={`/console/topics/${topic.id}`}
              className="card"
              title={topic.title}
              style={{
                display: "flex",
                alignItems: "center",
                height: "100%",
                minHeight: 102,
                padding: "24px 28px",
                boxSizing: "border-box",
                color: topic.is_active ? "var(--ink)" : "var(--ash)",
              }}
            >
              <span
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  lineHeight: 1.7,
                }}
              >
                {topic.title}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
