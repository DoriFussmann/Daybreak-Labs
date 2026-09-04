"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, LayoutDashboard, Megaphone, MessagesSquare, Users } from "lucide-react";

const ITEMS = [
  { href: "/console", label: "Operations", icon: LayoutDashboard },
  { href: "/console/clients", label: "Clients", icon: Users },
  { href: "/console/analytics", label: "Analytics", icon: BarChart3 },
  { href: null, label: "Campaigns", icon: Megaphone },
  { href: null, label: "Communications", icon: MessagesSquare },
  { href: null, label: "Health", icon: Activity },
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

function isActive(pathname: string, href: string) {
  if (href === "/console") return pathname === "/console";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ConsoleNav() {
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
              <span>
                {item.label}
                <span className="label" style={{ display: "block", marginTop: 2 }}>
                  Coming soon
                </span>
              </span>
            </span>
          );
        }

        const active = isActive(pathname, item.href);
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
