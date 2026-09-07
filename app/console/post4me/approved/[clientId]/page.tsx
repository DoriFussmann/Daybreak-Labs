import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BackLink } from "../../../back-link";
import { Section } from "../../../clients/client-fields";
import { PushScheduledPosts } from "../push-modal";

export default async function ApprovedClientPosts({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  await requireAdmin();
  const { clientId } = await params;
  const db = createAdminClient();

  const { data: client } = await db.from("clients").select("id, name").eq("id", clientId).maybeSingle();
  if (!client) notFound();

  const { data: cycles } = await db
    .from("post_cycles")
    .select("id, cycle_date, approved_at")
    .eq("client_id", clientId)
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(1);
  const cycle = cycles?.[0] ?? null;
  if (!cycle) notFound();

  const { data: drafts } = await db
    .from("post_candidates")
    .select("id, variant, body, chosen")
    .eq("cycle_id", cycle.id)
    .eq("chosen", true)
    .order("variant");

  const posts = (drafts ?? []).map((d) => ({
    id: d.id,
    variant: Number(d.variant),
    body: d.body,
  }));

  return (
    <div>
      <BackLink href="/console/post4me/approved" label="Back to approved posts" />
      <h2 style={{ margin: 0 }}>{client.name}</h2>
      <p style={{ color: "var(--ash)", marginTop: 8 }}>
        Approved {cycle.cycle_date}
        {cycle.approved_at
          ? ` · ${new Date(cycle.approved_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}`
          : ""}
      </p>

      <Section
        title="Approved Posts"
        action={posts.length === 2 ? <PushScheduledPosts posts={posts} /> : undefined}
      >
        {posts.length === 0 ? (
          <p style={{ color: "var(--ash)", margin: 0 }}>No chosen posts on this cycle.</p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {posts.map((post) => (
              <div
                key={post.id}
                style={{
                  padding: 24,
                  border: "1px solid var(--smoke)",
                  borderRadius: 10,
                  boxShadow: "inset 3px 0 0 var(--brass)",
                }}
              >
                <div className="label" style={{ marginBottom: 8 }}>
                  Post {post.variant}
                </div>
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{post.body}</div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
