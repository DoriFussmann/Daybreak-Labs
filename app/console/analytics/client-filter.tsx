"use client";

import { useRouter } from "next/navigation";
import { Dropdown } from "@/app/ui/dropdown";

export function ClientFilter({
  clients,
  client,
  range,
}: {
  clients: { id: string; name: string }[];
  client: string;
  range: number;
}) {
  const router = useRouter();
  return (
    <div className="dropdown-wrap">
      <Dropdown
        aria-label="Client"
        value={client}
        options={[
          { value: "all", label: "All clients" },
          ...clients.map((c) => ({ value: c.id, label: c.name })),
        ]}
        onChange={(next) => {
          router.push(`/console/analytics?range=${range}&client=${encodeURIComponent(next)}`);
        }}
      />
    </div>
  );
}
