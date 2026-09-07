"use client";

import { useState } from "react";
import { ymdInTz } from "@/lib/post4me-cycle";

export function PushScheduledPosts({
  posts,
}: {
  posts: { id: string; body: string; variant: number }[];
}) {
  const [open, setOpen] = useState(false);
  const today = ymdInTz(new Date());

  return (
    <>
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        Push scheduled posts
      </button>
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Push scheduled posts"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "rgba(26, 26, 46, 0.28)",
          }}
          onClick={() => setOpen(false)}
        >
          <div
            className="card"
            style={{
              width: "min(640px, 100%)",
              maxHeight: "90vh",
              overflow: "auto",
              padding: "36px 32px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0 }}>Push Scheduled Posts</h3>
            <p style={{ color: "var(--ash)", marginTop: 8 }}>
              Set a date and time for each approved post. Posting is not connected yet.
            </p>
            <div style={{ display: "grid", gap: 24, marginTop: 24 }}>
              {posts.map((post) => (
                <div
                  key={post.id}
                  style={{ padding: 20, border: "1px solid var(--smoke)", borderRadius: 10 }}
                >
                  <div className="label" style={{ marginBottom: 8 }}>
                    Post {post.variant}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, marginBottom: 16 }}>
                    {post.body}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div className="label" style={{ marginBottom: 8 }}>Date</div>
                      <input className="input" type="date" defaultValue={today} />
                    </div>
                    <div>
                      <div className="label" style={{ marginBottom: 8 }}>Time</div>
                      <input className="input" type="time" defaultValue="09:00" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
              <button type="button" className="btn" onClick={() => undefined}>
                Push scheduled posts
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
