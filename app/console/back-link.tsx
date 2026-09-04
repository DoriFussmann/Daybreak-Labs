import { ArrowLeft } from "lucide-react";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="btn btn-ghost"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        height: 36,
        padding: "0 14px",
        marginBottom: 24,
        width: "fit-content",
      }}
    >
      <ArrowLeft size={20} strokeWidth={1.5} aria-hidden />
      {label}
    </a>
  );
}
