import { requireAdmin } from "@/lib/auth";
import { Cockpit } from "./cockpit";

export default async function Console() {
  await requireAdmin();

  return <Cockpit />;
}
