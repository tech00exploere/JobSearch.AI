"use client";

import { useState, useEffect, useCallback } from "react";
import { getApplications, getApplicationForm, approveApplication, type ApplicationRecord } from "@/lib/api";

interface FormField {
  field_key: string;
  question_text: string;
  value: string;
  status: "auto_filled" | "needs_input" | "user_filled";
  options?: string[];
}

interface FormMapping {
  application_id: string;
  submission_channel: string;
  fields: FormField[];
}

function channelButtonLabel(channel: string) {
  if (channel.includes("Lever")) return "Submit via Lever API";
  if (channel.includes("Greenhouse")) return "Submit via Greenhouse API";
  if (channel.includes("Email")) return "Send Application Email";
  if (channel.includes("Internshala")) return "Open on Internshala";
  return "Open & Apply Manually";
}

function channelButtonColor(channel: string): string {
  if (channel.includes("Lever")) return "#16a34a";
  if (channel.includes("Greenhouse")) return "#15803d";
  if (channel.includes("Email")) return "#0369a1";
  if (channel.includes("Internshala")) return "#ea580c";
  return "#2563eb";
}

function getMatchBadge(score: number): { bg: string; color: string; border: string; label: string } {
  if (score >= 80) return { bg: "rgba(34,197,94,0.15)", color: "#86efac", border: "rgba(34,197,94,0.35)", label: "Strong Match" };
  if (score >= 60) return { bg: "rgba(251,191,36,0.15)", color: "#fde047", border: "rgba(251,191,36,0.35)", label: "Good Match" };
  return { bg: "rgba(239,68,68,0.12)", color: "#fca5a5", border: "rgba(239,68,68,0.3)", label: "Weak Match" };
}

export default function ApprovalQueuePage() {
  const [apps, setApps] = useState<ApplicationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [formMappings, setFormMappings] = useState<Record<string, FormMapping>>({});
  const [formAnswers, setFormAnswers] = useState<Record<string, Record<string, string>>>({});
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [loadingForm, setLoadingForm] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);

  function loadApplications() {
    setIsLoading(true);
    getApplications()
      .then((data) => { setApps(data); })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => { loadApplications(); }, []);

  async function handleExpandForm(appId: string) {
    if (expandedApp === appId) {
      setExpandedApp(null);
      return;
    }
    setExpandedApp(appId);
    if (!formMappings[appId]) {
      setLoadingForm(appId);
      try {
        const mapping = await getApplicationForm(appId);
        setFormMappings(prev => ({ ...prev, [appId]: mapping }));
        const prefilled: Record<string, string> = {};
        mapping.fields.forEach((f: FormField) => {
          if (f.value) prefilled[f.field_key] = f.value;
        });
        setFormAnswers(prev => ({ ...prev, [appId]: prefilled }));
      } catch {
        // fallback to plain approve
      } finally {
        setLoadingForm(null);
      }
    }
  }

  function updateAnswer(appId: string, key: string, value: string) {
    setFormAnswers(prev => ({
      ...prev,
      [appId]: { ...(prev[appId] || {}), [key]: value }
    }));
  }

  async function handleDecision(appId: string, action: "approved" | "skipped") {
    setSubmitting(appId);
    try {
      const answers = formAnswers[appId] || {};
      const res = await approveApplication(appId, action, undefined, action === "approved" ? answers : undefined);
      const channel = res.submission_channel || "";
      setActionMessage({
        text: action === "approved"
          ? `Application submitted! Channel: ${channel || "Manual Handoff"}. Time: ${res.submitted_at || "now"}.`
          : "Application skipped and moved out of queue.",
        type: "success"
      });
      loadApplications();
      setExpandedApp(null);
    } catch (err: any) {
      setActionMessage({ text: `Error: ${err.message}`, type: "error" });
    } finally {
      setSubmitting(null);
    }
  }

  const preparedApps = apps.filter((a) => a.status === "Prepared");

  return (
    <div style={{ padding: "32px 36px", color: "#f8fafc", maxWidth: 1000, margin: "0 auto" }}>

      {/* Header */}
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#f1f5f9", letterSpacing: "-0.01em" }}>
          HITL Approval Queue
        </h1>
        <p style={{ color: "#64748b", fontSize: 13, margin: "5px 0 0" }}>
          Review AI-prepared applications and authorize submission. Only you can trigger sending.
        </p>
      </header>

      {/* Action Toast */}
      {actionMessage && (
        <div style={{
          padding: "12px 18px", borderRadius: 9, marginBottom: 24,
          background: actionMessage.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${actionMessage.type === "success" ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
          color: actionMessage.type === "success" ? "#86efac" : "#fca5a5",
          fontSize: 13, fontWeight: 600,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", opacity: 0.6, fontSize: 16, lineHeight: 1 }}>x</button>
        </div>
      )}

      {isLoading ? (
        <div style={{ color: "#64748b", padding: 40, textAlign: "center", fontSize: 14 }}>
          Loading approval queue...
        </div>
      ) : preparedApps.length === 0 ? (
        <div style={{
          background: "#151d2a", padding: 56, borderRadius: 14, textAlign: "center",
          border: "1px solid rgba(255,255,255,0.07)",
        }}>
          <div style={{ fontSize: 36, marginBottom: 16, opacity: 0.3 }}>--</div>
          <p style={{ fontSize: 15, color: "#94a3b8", margin: "0 0 6px", fontWeight: 600 }}>Queue is clear</p>
          <p style={{ fontSize: 13, color: "#475569", margin: "0 0 24px" }}>
            No applications pending approval. Use the AI Agent or JD Matcher to prepare new applications.
          </p>
          <a href="/chat" style={{ padding: "10px 22px", background: "#2563eb", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: 13 }}>
            Go to AI Agent Chat
          </a>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {preparedApps.map((app) => {
            const mapping = formMappings[app.application_id];
            const answers = formAnswers[app.application_id] || {};
            const isExpanded = expandedApp === app.application_id;
            const isLoadingThis = loadingForm === app.application_id;
            const isSubmitting = submitting === app.application_id;
            const channel = mapping?.submission_channel || "Manual Browser Handoff";
            const matchBadge = getMatchBadge(app.match_score);
            const btnColor = channelButtonColor(channel);

            return (
              <div
                key={app.application_id}
                style={{
                  background: "#151d2a",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.08)",
                  overflow: "hidden",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                }}
              >
                {/* Card top accent bar based on match score */}
                <div style={{
                  height: 3,
                  background: `linear-gradient(90deg, ${matchBadge.color}60, transparent)`,
                }} />

                <div style={{ padding: 24 }}>
                  {/* Header Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                    <div>
                      <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 5px", color: "#f1f5f9" }}>{app.role_title}</h2>
                      <p style={{ margin: 0, color: "#60a5fa", fontSize: 13, fontWeight: 600 }}>{app.company}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      {/* Match Score */}
                      <div style={{
                        background: matchBadge.bg, color: matchBadge.color,
                        border: `1px solid ${matchBadge.border}`,
                        padding: "5px 14px", borderRadius: 20,
                        fontWeight: 800, fontSize: 13, whiteSpace: "nowrap",
                      }}>
                        {app.match_score}% — {matchBadge.label}
                      </div>
                      {/* Status Badge */}
                      <span style={{
                        fontSize: 10, background: "rgba(251,191,36,0.12)",
                        color: "#fbbf24", padding: "4px 10px", borderRadius: 20,
                        border: "1px solid rgba(251,191,36,0.3)", fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.05em",
                      }}>
                        Pending
                      </span>
                    </div>
                  </div>

                  {/* Cover Letter Snippet */}
                  {app.cover_letter_snippet && (
                    <div style={{
                      background: "rgba(15,23,42,0.8)", padding: "14px 16px",
                      borderRadius: 10, fontSize: 12, color: "#94a3b8",
                      lineHeight: 1.6, marginBottom: 16,
                      borderLeft: "3px solid rgba(59,130,246,0.3)",
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Cover Letter Preview</div>
                      <span style={{ fontStyle: "italic" }}>"{app.cover_letter_snippet}..."</span>
                    </div>
                  )}

                  {/* Form Toggle */}
                  <button
                    onClick={() => handleExpandForm(app.application_id)}
                    style={{
                      width: "100%", textAlign: "left",
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                      color: "#94a3b8", padding: "9px 14px", borderRadius: 8,
                      cursor: "pointer", fontSize: 12, fontWeight: 600, marginBottom: 16,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}
                  >
                    <span>{isExpanded ? "Hide Application Form Fields" : "Review & Fill Application Form Fields"}</span>
                    <span style={{ opacity: 0.5, fontSize: 10 }}>
                      {isExpanded ? "▲" : "▼"}{!isExpanded && !mapping && " (auto-mapping available)"}
                    </span>
                  </button>

                  {/* Form Fields Panel */}
                  {isExpanded && (
                    <div style={{ background: "rgba(11,17,32,0.7)", borderRadius: 10, padding: 20, marginBottom: 16 }}>
                      {isLoadingThis ? (
                        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Loading form fields...</p>
                      ) : mapping ? (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Submission via:</span>
                            <span style={{
                              padding: "3px 10px", borderRadius: 20,
                              background: "rgba(16,185,129,0.12)", color: "#6ee7b7",
                              border: "1px solid rgba(16,185,129,0.25)", fontSize: 11, fontWeight: 600,
                            }}>
                              {channel}
                            </span>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                            {mapping.fields.map((field) => (
                              <div key={field.field_key}>
                                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748b", marginBottom: 5, fontWeight: 700 }}>
                                  {field.question_text}
                                  {field.status === "auto_filled" && (
                                    <span style={{ fontSize: 9, background: "rgba(34,197,94,0.12)", color: "#86efac", border: "1px solid rgba(34,197,94,0.25)", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>Auto</span>
                                  )}
                                  {field.status === "needs_input" && (
                                    <span style={{ fontSize: 9, background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>Required</span>
                                  )}
                                </label>
                                {field.options ? (
                                  <select
                                    value={answers[field.field_key] || ""}
                                    onChange={(e) => updateAnswer(app.application_id, field.field_key, e.target.value)}
                                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, background: "#1e293b", border: `1px solid ${field.status === "needs_input" && !answers[field.field_key] ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.1)"}`, color: "#f8fafc", fontSize: 13 }}
                                  >
                                    <option value="">Select...</option>
                                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={answers[field.field_key] || ""}
                                    onChange={(e) => updateAnswer(app.application_id, field.field_key, e.target.value)}
                                    style={{ width: "100%", padding: "8px 10px", borderRadius: 6, background: "#1e293b", border: `1px solid ${field.status === "needs_input" && !answers[field.field_key] ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.1)"}`, color: "#f8fafc", fontSize: 13, boxSizing: "border-box" }}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Could not load form fields. You can still approve with default values.</p>
                      )}
                    </div>
                  )}

                  {/* Action Footer */}
                  <div style={{
                    display: "flex", justifyContent: "flex-end", gap: 12,
                    paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleDecision(app.application_id, "skipped")}
                      style={{
                        padding: "9px 18px",
                        background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
                        color: "#94a3b8", borderRadius: 8, fontWeight: 600,
                        cursor: isSubmitting ? "not-allowed" : "pointer", fontSize: 13,
                        opacity: isSubmitting ? 0.5 : 1,
                      }}
                    >
                      Skip
                    </button>
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleDecision(app.application_id, "approved")}
                      style={{
                        padding: "9px 24px",
                        background: btnColor, border: "none",
                        color: "#fff", borderRadius: 8, fontWeight: 700,
                        cursor: isSubmitting ? "not-allowed" : "pointer", fontSize: 13,
                        boxShadow: isSubmitting ? "none" : `0 0 14px ${btnColor}55`,
                        opacity: isSubmitting ? 0.6 : 1,
                      }}
                    >
                      {isSubmitting ? "Submitting..." : channelButtonLabel(channel)}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
