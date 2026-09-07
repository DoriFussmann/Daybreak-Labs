"use client";

import { useRouter } from "next/navigation";
import { Dropdown } from "@/app/ui/dropdown";

export function ClientPicker({
  value,
  options,
}: {
  value: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  return (
    <div className="dropdown-wrap" style={{ width: 320 }}>
      <Dropdown
        aria-label="Client"
        value={value}
        options={[{ value: "", label: "Choose a client" }, ...options]}
        onChange={(next) => {
          router.push(next ? `/console/post4me?client=${encodeURIComponent(next)}` : "/console/post4me");
        }}
      />
    </div>
  );
}
