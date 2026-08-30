"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Overview",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: "/chat",
    label: "AI Agent Chat",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: "/match",
    label: "JD Matcher & Tailorer",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
  },
  {
    href: "/approval",
    label: "HITL Approval Queue",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    href: "/tracker",
    label: "Application Tracker",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Candidate Profile",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="sidebar" aria-label="Main navigation">
      {/* Brand Header */}
      <div style={{ padding: "16px 16px 12px", display: "flex", justifyContent: "center" }}>
        <Link href="/" style={{ textDecoration: "none", display: "block", width: "100%" }}>
          <img
            src="/logo.png"
            alt="JobSearch.ai Logo"
            style={{
              width: "100%",
              height: "auto",
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              display: "block",
            }}
          />
        </Link>
      </div>


      <div style={{ height: 1, background: "rgba(59,130,246,0.15)", margin: "8px 16px" }} />

      {/* Navigation */}
      <div style={{ padding: "8px 12px", flex: 1 }}>
        <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", padding: "8px 6px", fontWeight: 600 }}>
          Agent Workspace
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item${isActive ? " active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                margin: "2px 0",
                borderRadius: 8,
                color: isActive ? "#93c5fd" : "#94a3b8",
                background: isActive ? "rgba(59,130,246,0.15)" : "transparent",
                borderLeft: isActive ? "3px solid #3b82f6" : "3px solid transparent",
                fontWeight: isActive ? 600 : 400,
                textDecoration: "none",
                fontSize: 13,
                transition: "all 0.15s ease",
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Footer Info */}
      <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="glass-card" style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(15,23,42,0.6)" }}>
          <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 600, marginBottom: 4 }}>
            Safety Enforcement
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 6px rgba(34,197,94,0.6)",
              }}
            />
            <span style={{ fontSize: 11, color: "#94a3b8" }}>HITL Approval Active</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
