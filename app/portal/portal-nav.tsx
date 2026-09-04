"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Building2, Mail, MessagesSquare, Share2, Users } from "lucide-react";

const ITEMS = [
  { href: "/portal/leads", label: "My leads", icon: Users },
  { href: "/portal/account", label: "Account", icon: Building2 },
  { href: "/portal/analytics", label: "Email analytics", icon: Mail },
  { href: null, label: "LinkedIn Analytics", icon: Share2 },
  { href: null, label: "Health Status", icon: Activity },
  { href: null, label: "Communications", icon: MessagesSquare },
] as const;

const row = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 12px",
  borderRadius: 8,
  fontSize: 14,
  lineHeight: 1.4,
  transition: "background 150ms ease, color 150ms ease",
} as const;

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className="portal-nav" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {ITEMS.map((item) => {
        const Icon = item.icon;
        if (!item.href) {
          return (
            <span
              key={item.label}
              aria-disabled="true"
              style={{
                ...row,
                color: "var(--ash)",
                cursor: "default",
              }}
            >
              <Icon size={18} strokeWidth={1.5} aria-hidden />
              {item.label}
            </span>
          );
        }

        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-active={active ? "true" : "false"}
            aria-current={active ? "page" : undefined}
            style={{
              ...row,
              color: active ? "var(--ink)" : "var(--slate)",
              fontWeight: active ? 500 : 400,
              background: active ? "var(--white)" : "transparent",
              boxShadow: active ? "inset 3px 0 0 var(--brass)" : undefined,
            }}
          >
            <Icon size={20} strokeWidth={1.5} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
