export const TOPIC_TYPE_PRESETS = [
  "Franchise Advisor",
  "Franchise Brand",
  "Brand",
  "Healthcare Broker",
] as const;

export function topicTypeOptions(extra: (string | null | undefined)[] = []) {
  const seen = new Set<string>(TOPIC_TYPE_PRESETS);
  const options = [
    { value: "", label: "All types" },
    ...TOPIC_TYPE_PRESETS.map((value) => ({ value, label: value })),
  ];
  for (const raw of extra) {
    const value = raw?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: value });
  }
  return options;
}
