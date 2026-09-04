"use client";

import { useState } from "react";
import { Dropdown } from "@/app/ui/dropdown";

const PRESETS = ["Brand", "Franchise Advisor", "Healthcare Broker"];
const CUSTOM = "__custom__";

export function ClientTypeField({ value }: { value: string | null }) {
  const saved = value ?? "";
  const extra = saved && !PRESETS.includes(saved) ? saved : "";
  const [selected, setSelected] = useState(saved);
  const showCustom = selected === CUSTOM;

  return (
    <div>
      <Dropdown
        name="client_type"
        value={selected}
        onChange={setSelected}
        options={[
          { value: "", label: "—" },
          ...PRESETS.map((preset) => ({ value: preset, label: preset })),
          ...(extra ? [{ value: extra, label: extra }] : []),
          { value: CUSTOM, label: "Custom…" },
        ]}
      />
      {showCustom ? (
        <div style={{ marginTop: 8 }}>
          <div className="label" style={{ marginBottom: 8 }}>Custom</div>
          <input className="input" name="client_type_custom" defaultValue={extra} />
        </div>
      ) : null}
    </div>
  );
}
