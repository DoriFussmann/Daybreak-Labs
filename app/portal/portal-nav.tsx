"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Building2, Mail, MessagesSquare, PanelLeft, PanelLeftClose, Share2, Users } from "lucide-react";

const ITEMS = [
  { href: "/portal/leads", label: "My Leads", icon: Users },
  { href: "/portal/account", label: "Account", icon: Building2 },
  { href: "/portal/analytics", label: "Email Analytics", icon: Mail },
  { href: null, label: "LinkedIn Analytics", icon: Share2 },
  { href: null, label: "Health Status", icon: Activity },
  { href: null, label: "Communications", icon: MessagesSquare },
] as const;

const STORAGE_KEY = "portal-nav-collapsed";

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

export function PortalSidebar({ displayName }: { displayName: string }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  function toggle() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <aside
      className="portal-aside"
      data-collapsed={collapsed ? "true" : "false"}
      style={{
        width: collapsed ? 48 : 220,
        flexShrink: 0,
        transition: "width 150ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: 8,
          marginBottom: 16,
          minHeight: 32,
        }}
      >
        {!collapsed ? (
          <div
            className="label"
            style={{ margin: 0, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {displayName}
          </div>
        ) : null}
        <button
          type="button"
          className="portal-nav-toggle"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        >
          {collapsed ? <PanelLeft size={20} strokeWidth={1.5} /> : <PanelLeftClose size={20} strokeWidth={1.5} />}
        </button>
      </div>
      <PortalNav collapsed={collapsed} />
    </aside>
  );
}

export function PortalNav({ collapsed = false }: { collapsed?: boolean }) {
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
              title={item.label}
              style={{
                ...row,
                color: "var(--ash)",
                cursor: "default",
                justifyContent: collapsed ? "center" : "flex-start",
                padding: collapsed ? "8px 0" : row.padding,
              }}
            >
              <Icon size={18} strokeWidth={1.5} aria-hidden />
              {!collapsed ? item.label : <span className="sr-only">{item.label}</span>}
            </span>
          );
        }

        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            data-active={active ? "true" : "false"}
            aria-current={active ? "page" : undefined}
            style={{
              ...row,
              color: active ? "var(--ink)" : "var(--slate)",
              fontWeight: active ? 500 : 400,
              background: active ? "var(--white)" : "transparent",
              boxShadow: active ? "inset 3px 0 0 var(--brass)" : undefined,
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "8px 0" : row.padding,
            }}
          >
            <Icon size={20} strokeWidth={1.5} aria-hidden />
            {!collapsed ? item.label : <span className="sr-only">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
