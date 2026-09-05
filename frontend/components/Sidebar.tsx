"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

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
    href: "/career-intelligence",
    label: "Web Job Discovery",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
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
  const { user, isAuthenticated, logout } = useAuth();

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

      {/* User Auth Section */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {isAuthenticated && user ? (
          <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid #334155", borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid #60a5fa" }}
                />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user.name}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user.email}
                </div>
              </div>
            </div>
            <button
              onClick={() => logout()}
              style={{ width: "100%", padding: "6px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px",
              background: "#2563eb",
              color: "#ffffff",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              marginBottom: 12,
              boxShadow: "0 2px 8px rgba(37,99,235,0.3)"
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"/>
            </svg>
            Sign in with Google
          </Link>
        )}

        {/* Footer Info */}
        <div className="glass-card" style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(15,23,42,0.6)" }}>
          <div style={{ fontSize: 10, color: "#60a5fa", fontWeight: 600, marginBottom: 2 }}>
            Application Mode
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.6)" }} />
            <span style={{ fontSize: 11, color: "#94a3b8" }}>Candidate-Controlled</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
