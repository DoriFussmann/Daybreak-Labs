// lib/post4me-select.ts
// Pure topic selection with repeat avoidance. No I/O, so it unit-tests like lib/pipeline.ts.
// Rule: prefer topics this client has never been shown, then least-recently shown.
// Never repeat anything shown within the cooldown window unless the bank is exhausted.

export type Topic = { id: string; clientType: string | null };

export type SelectArgs = {
  topics: Topic[]; // active topics from post_topics
  clientType: string | null; // the client's client_type (free text)
  // topic_id -> the most recent cycle_date it was shown to THIS client (ISO date), if ever
  lastShown: Map<string, string>;
  count?: number; // default 2
  cooldownCount?: number; // how many of the most-recent topics to hard-exclude; default 8
  rng?: () => number; // injectable for deterministic tests; default Math.random
};

// case-insensitive; a topic with null clientType applies to every client
function typeMatches(topic: Topic, clientType: string | null): boolean {
  if (topic.clientType == null) return true;
  if (clientType == null) return false;
  return topic.clientType.trim().toLowerCase() === clientType.trim().toLowerCase();
}

export function selectTopics(args: SelectArgs): Topic[] {
  const { topics, clientType, lastShown } = args;
  const count = args.count ?? 2;
  const cooldownCount = args.cooldownCount ?? 8;
  const rng = args.rng ?? Math.random;

  const eligible = topics.filter((t) => typeMatches(t, clientType));

  // The N most-recently-shown topic ids are on cooldown.
  const onCooldown = new Set(
    [...lastShown.entries()]
      .sort((a, b) => b[1].localeCompare(a[1])) // newest date first
      .slice(0, cooldownCount)
      .map(([id]) => id),
  );

  const shuffle = <T,>(xs: T[]): T[] => {
    const a = [...xs];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Priority order:
  //  1. never shown, not on cooldown
  //  2. shown before, not on cooldown, oldest first
  //  3. on cooldown, oldest first (only if the bank can't fill the request otherwise)
  const neverShown = shuffle(eligible.filter((t) => !lastShown.has(t.id)));
  const shownNotCooling = eligible
    .filter((t) => lastShown.has(t.id) && !onCooldown.has(t.id))
    .sort((a, b) => (lastShown.get(a.id)! < lastShown.get(b.id)! ? -1 : 1));
  const cooling = eligible
    .filter((t) => onCooldown.has(t.id))
    .sort((a, b) => (lastShown.get(a.id)! < lastShown.get(b.id)! ? -1 : 1));

  return [...neverShown, ...shownNotCooling, ...cooling].slice(0, count);
}
