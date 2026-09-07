import type { Tone } from "./clients/client-fields";

export function cycleStatusMeta(status: string): { label: string; tone: Tone } {
  switch (status) {
    case "generated":
      return { label: "Waiting", tone: "warn" };
    case "selected":
      return { label: "Selected", tone: "warn" };
    case "approved":
      return { label: "Approved", tone: "ok" };
    case "scheduled":
      return { label: "Scheduled", tone: "ok" };
    case "skipped":
      return { label: "Skipped", tone: "off" };
    case "failed":
      return { label: "Failed", tone: "bad" };
    default:
      return { label: status, tone: "off" };
  }
}

export function slotLabel(slot: string | null): string {
  if (slot === "wed") return "Wednesday";
  if (slot === "fri") return "Friday";
  return "—";
}
