"use client";

import { useRouter } from "next/navigation";
import { Dropdown } from "@/app/ui/dropdown";

export function TypeFilter({
  value,
  options,
}: {
  value: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  return (
    <div className="dropdown-wrap">
      <Dropdown
        aria-label="Client type"
        value={value}
        options={options}
        onChange={(next) => {
          const qs = next === "all" ? "" : `?type=${encodeURIComponent(next)}`;
          router.push(`/console/topics${qs}`);
        }}
      />
    </div>
  );
}
