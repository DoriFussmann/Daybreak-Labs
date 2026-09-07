import { saveCandidateBody } from "../post4me-actions";

export function DraftEditors({
  drafts,
}: {
  drafts: { id: string; variant: number; body: string }[];
}) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {drafts.map((draft) => (
        <form
          key={draft.id}
          action={saveCandidateBody.bind(null, draft.id)}
          style={{
            padding: 24,
            border: "1px solid var(--smoke)",
            borderRadius: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 12,
            }}
          >
            <div className="label">Post {draft.variant}</div>
            <button className="btn" type="submit" style={{ height: 36, padding: "0 16px" }}>
              Save
            </button>
          </div>
          <textarea className="textarea" name="body" rows={8} defaultValue={draft.body} required />
        </form>
      ))}
    </div>
  );
}
