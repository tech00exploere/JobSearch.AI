"use client";

import { useState, useEffect, useCallback } from "react";
import { getApplications, deleteApplication, clearApplications, type ApplicationRecord } from "@/lib/api";

const STATUS_OPTIONS = ["All", "DISCOVERED", "SAVED", "VIEWED", "APPLIED", "NOT_APPLIED", "INTERVIEW", "OFFER", "REJECTED"];

function getStatusStyle(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case "APPLIED":
    case "Submitted":
      return { bg: "rgba(34,197,94,0.15)", text: "#86efac", border: "rgba(34,197,94,0.35)" };
    case "NOT_APPLIED":
      return { bg: "rgba(100,116,139,0.15)", text: "#94a3b8", border: "rgba(100,116,139,0.3)" };
    case "SAVED":
      return { bg: "rgba(59,130,246,0.15)", text: "#93c5fd", border: "rgba(59,130,246,0.35)" };
    case "INTERVIEW":
    case "Interview":
      return { bg: "rgba(168,85,247,0.15)", text: "#c084fc", border: "rgba(168,85,247,0.35)" };
    case "OFFER":
    case "Offer":
      return { bg: "rgba(20,184,166,0.15)", text: "#5eead4", border: "rgba(20,184,166,0.35)" };
    case "REJECTED":
    case "Rejected":
      return { bg: "rgba(239,68,68,0.12)", text: "#fca5a5", border: "rgba(239,68,68,0.3)" };
    case "DISCOVERED":
    case "VIEWED":
    default:
      return { bg: "rgba(100,116,139,0.15)", text: "#cbd5e1", border: "rgba(100,116,139,0.3)" };
  }
}

function getMatchColor(score: number): string {
  if (score >= 80) return "#86efac";
  if (score >= 60) return "#fde047";
  return "#fca5a5";
}

export default function TrackerPage() {
  const [apps, setApps] = useState<ApplicationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadApps = useCallback(() => {
    setIsLoading(true);
    getApplications()
      .then((data) => setApps(data))
      .catch(() => showToast("Failed to load applications.", "error"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  const filtered = apps.filter((a) => {
    const matchSearch =
      search === "" ||
      a.company.toLowerCase().includes(search.toLowerCase()) ||
      a.role_title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function handleDelete(appId: string) {
    setDeletingId(appId);
    try {
      await deleteApplication(appId);
      setApps((prev) => prev.filter((a) => a.application_id !== appId));
      showToast("Application removed.", "success");
    } catch {
      showToast("Failed to delete application.", "error");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleClear() {
    if (!confirm("Reset the tracker database to mock defaults? This cannot be undone.")) return;
    setClearing(true);
    try {
      await clearApplications();
      showToast("Tracker database reset to baseline.", "success");
      loadApps();
    } catch {
      showToast("Failed to reset database.", "error");
    } finally {
      setClearing(false);
    }
  }

  const countByStatus: Record<string, number> = {};
  apps.forEach((a) => {
    countByStatus[a.status] = (countByStatus[a.status] || 0) + 1;
  });

  return (
    <div style={{ padding: "32px 36px", color: "#f8fafc", maxWidth: 1200, margin: "0 auto" }}>

      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 24, zIndex: 100,
          padding: "12px 20px", borderRadius: 10,
          background: toast.type === "success" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
          border: `1px solid ${toast.type === "success" ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
          color: toast.type === "success" ? "#86efac" : "#fca5a5",
          fontSize: 13, fontWeight: 600,
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        }}>
          {toast.text}
        </div>
      )}

      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#f1f5f9", letterSpacing: "-0.01em" }}>
          Application Tracker
        </h1>
        <p style={{ color: "#64748b", fontSize: 13, margin: "5px 0 0" }}>
          Full lifecycle tracking for all prepared and submitted applications.
        </p>
      </header>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Total", value: apps.length, color: "#93c5fd" },
          { label: "Prepared", value: countByStatus["Prepared"] || 0, color: "#fde047" },
          { label: "Submitted", value: countByStatus["Submitted"] || 0, color: "#86efac" },
          { label: "Skipped", value: countByStatus["Skipped"] || 0, color: "#94a3b8" },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: "#151d2a",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 10,
            padding: "12px 20px",
            minWidth: 100,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, lineHeight: 1.1 }}>{stat.value}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
          >
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company or role..."
            style={{
              width: "100%", padding: "9px 12px 9px 34px",
              background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, color: "#f8fafc", fontSize: 13, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "9px 14px", background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
            color: "#f8fafc", fontSize: 13, cursor: "pointer", outline: "none",
          }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        <button
          onClick={handleClear}
          disabled={clearing}
          style={{
            padding: "9px 18px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.35)",
            color: "#fca5a5", borderRadius: 8, fontWeight: 600, fontSize: 13,
            cursor: clearing ? "not-allowed" : "pointer",
            opacity: clearing ? 0.6 : 1,
          }}
        >
          {clearing ? "Resetting..." : "Reset Database"}
        </button>
      </div>

      {isLoading ? (
        <div style={{ color: "#64748b", padding: 40, textAlign: "center", fontSize: 14 }}>
          Loading tracker records...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#151d2a", padding: 48, borderRadius: 12, textAlign: "center", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
            {apps.length === 0 ? "No applications tracked yet." : "No results match your search or filter."}
          </p>
        </div>
      ) : (
        <div style={{ background: "#151d2a", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#0b1120", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <th style={{ padding: "13px 20px", color: "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Company</th>
                <th style={{ padding: "13px 20px", color: "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Role</th>
                <th style={{ padding: "13px 20px", color: "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Match</th>
                <th style={{ padding: "13px 20px", color: "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</th>
                <th style={{ padding: "13px 20px", color: "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Job</th>
                <th style={{ padding: "13px 20px", color: "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Updated</th>
                <th style={{ padding: "13px 20px", color: "#475569", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, idx) => {
                const colors = getStatusStyle(a.status);
                const isDeleting = deletingId === a.application_id;
                return (
                  <tr
                    key={a.application_id}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      background: idx % 2 === 1 ? "rgba(255,255,255,0.02)" : "transparent",
                      opacity: isDeleting ? 0.4 : 1,
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    <td style={{ padding: "14px 20px", fontWeight: 700, color: "#60a5fa" }}>
                      {a.company}
                    </td>
                    <td style={{ padding: "14px 20px", color: "#e2e8f0", maxWidth: 260 }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {a.role_title}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: getMatchColor(a.match_score) }}>
                        {a.match_score}%
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{
                        background: colors.bg, color: colors.text,
                        border: `1px solid ${colors.border}`,
                        padding: "3px 10px", borderRadius: 20,
                        fontSize: 11, fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}>
                        {a.status}
                      </span>
                    </td>

                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                        {a.job_url ? (
                          <a
                            href={a.job_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: "rgba(59, 130, 246, 0.12)",
                              color: "#60a5fa",
                              border: "1px solid rgba(59, 130, 246, 0.3)",
                              padding: "4px 10px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              textDecoration: "none"
                            }}
                          >
                            View Job ↗
                          </a>
                        ) : (
                          <span style={{ color: "#64748b", fontSize: 12, fontStyle: "italic" }}>
                            Job URL unavailable
                          </span>
                        )}

                        {a.application_url || a.job_url ? (
                          <a
                            href={a.application_url || a.job_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: "rgba(37, 99, 235, 0.15)",
                              color: "#60a5fa",
                              border: "1px solid rgba(37, 99, 235, 0.4)",
                              padding: "4px 10px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              textDecoration: "none"
                            }}
                          >
                            Apply on External Site ↗
                          </a>
                        ) : (
                          <span style={{ color: "#64748b", fontSize: 12, fontStyle: "italic" }}>
                            Application URL unavailable
                          </span>
                        )}

                        {a.career_page_url ? (
                          <a
                            href={a.career_page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: "rgba(168, 85, 247, 0.12)",
                              color: "#c084fc",
                              border: "1px solid rgba(168, 85, 247, 0.3)",
                              padding: "4px 10px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              textDecoration: "none"
                            }}
                          >
                            Company Career Page ↗
                          </a>
                        ) : (
                          <span style={{ color: "#64748b", fontSize: 12, fontStyle: "italic" }}>
                            Career Page unavailable
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", color: "#475569", fontSize: 12 }}>
                      {a.updated_at.split(" ")[0]}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <button
                        disabled={isDeleting}
                        onClick={() => handleDelete(a.application_id)}
                        style={{
                          padding: "5px 12px",
                          background: "rgba(239,68,68,0.08)",
                          border: "1px solid rgba(239,68,68,0.25)",
                          color: "#f87171", borderRadius: 6,
                          fontSize: 12, fontWeight: 600,
                          cursor: isDeleting ? "not-allowed" : "pointer",
                        }}
                      >
                        {isDeleting ? "..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: "10px 20px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#475569", fontSize: 12 }}>
              Showing {filtered.length} of {apps.length} records
            </span>
            {(search || statusFilter !== "All") && (
              <button
                onClick={() => { setSearch(""); setStatusFilter("All"); }}
                style={{ background: "none", border: "none", color: "#64748b", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
