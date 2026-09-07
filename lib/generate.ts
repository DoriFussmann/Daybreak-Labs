// lib/generate.ts
// The controlled generator: ONE topic -> 4 LinkedIn post drafts.
// Server-only. Uses the Anthropic Messages API over plain fetch, matching the
// house style in lib/post4me.ts and lib/heyreach.ts (no heavy SDK dependency).
//
// Env:
//   ANTHROPIC_API_KEY   required
//   ANTHROPIC_MODEL     optional; pin a snapshot in production

const BASE = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export type GenInput = {
  topic: { id: string; title: string; guidance?: string | null };
  // Admin-authored positioning lines (client LinkedIn posts direction). Client never sees these.
  directions: string[];
  // Client-authored things they want mentioned (up to 5). The client wrote these.
  notes: string[];
};

export type Draft = { topicId: string; body: string };

// The prompt WE control. Single source of truth for tone and the LinkedIn rules.
const SYSTEM = `You write LinkedIn posts for franchise professionals.

You will be given ONE topic and must write FOUR distinct posts on that topic,
each taking a different angle (for example: a lesson, a contrarian take, a short
story, a practical tip). They must not feel like rewrites of each other.

Rules for every post:
- First-person, from the client. Never mention you are an AI or a ghostwriter.
- 90 to 180 words. One idea per post. No hashtags. At most one emoji, usually none.
- Open with a specific hook, not a definition. No "In today's world" openers.
- Plain, measured, confident. No hype words, no exclamation marks, no "unlock" or "supercharge".
- End with a light invitation to reply or a short question, not a hard CTA.
- Honor the client's direction lines. Weave in the client's own notes where they fit
  naturally; use each note at most once and never force one in.

Return ONLY a JSON array of exactly four objects: [{"topicId": "...", "body": "..."}].
No prose, no markdown, no code fences.`;

function buildUserMessage(input: GenInput): string {
  const topic =
    `Topic (topicId ${input.topic.id}): ${input.topic.title}` +
    (input.topic.guidance ? `\n  angle: ${input.topic.guidance}` : "");
  const directions = input.directions.filter((d) => d.trim()).length
    ? `\n\nClient direction / positioning (admin-set):\n` +
      input.directions.filter((d) => d.trim()).map((d) => `- ${d.trim()}`).join("\n")
    : "";
  const notes = input.notes.filter((n) => n.trim()).length
    ? `\n\nThings the client wants mentioned (use where natural, each at most once):\n` +
      input.notes.filter((n) => n.trim()).map((n) => `- ${n.trim()}`).join("\n")
    : "";
  return `Write four LinkedIn posts on the topic below.\n\n${topic}` + directions + notes;
}

function parseDrafts(text: string, input: GenInput): Draft[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("Model did not return a JSON array.");
  const parsed = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("Model output was not an array.");
  const drafts: Draft[] = parsed
    .filter((d) => d && typeof d.body === "string")
    .map((d) => ({ topicId: input.topic.id, body: String(d.body).trim() }))
    .filter((d) => d.body.length > 0);
  if (drafts.length < 4) throw new Error(`Expected 4 drafts, got ${drafts.length}.`);
  return drafts.slice(0, 4);
}

export async function generateDrafts(input: GenInput): Promise<Draft[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set.");

  const res = await fetch(BASE, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM,
      messages: [{ role: "user", content: buildUserMessage(input) }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const text: string = (data?.content ?? [])
    .filter((b: { type?: string }) => b?.type === "text")
    .map((b: { text?: string }) => b.text ?? "")
    .join("\n");
  return parseDrafts(text, input);
}
