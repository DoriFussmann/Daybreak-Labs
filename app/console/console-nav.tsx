"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, BarChart3, LayoutDashboard, Megaphone, MessagesSquare, PenLine, Users } from "lucide-react";
import { Dropdown } from "@/app/ui/dropdown";

const ITEMS = [
  { href: "/console", label: "Operations", icon: LayoutDashboard },
  { href: "/console/clients", label: "Clients", icon: Users },
  { href: "/console/analytics", label: "Analytics", icon: BarChart3 },
  { href: null, label: "Campaigns", icon: Megaphone },
  { href: null, label: "Communications", icon: MessagesSquare },
  { href: null, label: "Health", icon: Activity },
] as const;

const POST4ME_OPTIONS = [
  { value: "/console/topics", label: "Topics" },
  { value: "/console/post4me", label: "Posts Generator" },
  { value: "/console/post4me/approved", label: "Approved Posts" },
];

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
  if (href === "/console" || href === "/console/post4me") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function post4meValue(pathname: string) {
  const match = POST4ME_OPTIONS.find((o) => isActive(pathname, o.value));
  return match?.value ?? "";
}

export function ConsoleNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="portal-nav" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {ITEMS.slice(0, 2).map((item) =>
        item.href ? (
          <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} pathname={pathname} />
        ) : null,
      )}

      <Dropdown
        aria-label="Post4Me"
        variant="nav"
        triggerLabel="Post4Me"
        leading={<PenLine size={20} strokeWidth={1.5} aria-hidden />}
        value={post4meValue(pathname)}
        options={POST4ME_OPTIONS}
        onChange={(href) => router.push(href)}
      />

      {ITEMS.slice(2).map((item) => {
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
        return <NavLink key={item.href} href={item.href} label={item.label} icon={Icon} pathname={pathname} />;
      })}
    </nav>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  pathname: string;
}) {
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
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
      {label}
    </Link>
  );
}
