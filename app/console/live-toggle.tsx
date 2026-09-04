"use client";

import { useTransition } from "react";
import { setLive } from "./clients/actions";

export function LiveToggle({ clientId, isLive }: { clientId: string; isLive: boolean }) {
  const [pending, startTransition] = useTransition();

  function segment(live: boolean, label: string) {
    const on = isLive === live;
    return (
      <button
        type="button"
        disabled={pending}
        aria-pressed={on}
        onClick={() => {
          if (!on) startTransition(() => setLive(clientId, live));
        }}
        style={{
          height: 32,
          padding: "0 14px",
          border: "none",
          borderRadius: 4,
          background: on ? (live ? "var(--sage)" : "var(--ink)") : "transparent",
          cursor: pending || on ? "default" : "pointer",
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: on ? "#fff" : "var(--ash)",
          opacity: pending ? 0.6 : 1,
          transition: "background 150ms ease, color 150ms ease, opacity 150ms ease",
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Client status"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: 3,
        border: "1px solid var(--smoke)",
        borderRadius: 6,
        background: "var(--white)",
      }}
    >
      {segment(false, "Paused")}
      {segment(true, "Live")}
    </div>
  );
}
