"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export type DropdownOption = { value: string; label: string };

export function Dropdown({
  name,
  options,
  value,
  defaultValue,
  "aria-label": ariaLabel,
  onChange,
}: {
  name?: string;
  options: DropdownOption[];
  value?: string;
  defaultValue?: string;
  "aria-label"?: string;
  onChange?: (value: string) => void;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? value ?? options[0]?.value ?? "");
  const selected = value ?? uncontrolled;
  const current = options.find((o) => o.value === selected) ?? options[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: string) {
    if (value === undefined) setUncontrolled(next);
    onChange?.(next);
    setOpen(false);
  }

  return (
    <div className="dropdown" ref={rootRef}>
      {name ? <input type="hidden" name={name} value={selected} /> : null}
      <button
        type="button"
        className="dropdown-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        data-open={open ? "true" : "false"}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{current?.label ?? ""}</span>
        <ChevronDown className="dropdown-chevron" size={16} strokeWidth={1.5} aria-hidden />
      </button>
      {open && (
        <div className="dropdown-menu" id={id} role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const active = option.value === selected;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                className="dropdown-option"
                data-active={active ? "true" : "false"}
                onClick={() => choose(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
