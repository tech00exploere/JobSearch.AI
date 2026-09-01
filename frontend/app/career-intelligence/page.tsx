"use client";

import { useState, useEffect, useCallback } from "react";
import {
  searchDiscoveredJobs,
  getDiscoveredJobs,
  analyzeDiscoveredJob,
  saveDiscoveredJob,
  markJobApplied,
  markJobNotApplied,
  removeDiscoveredJob,
  type DiscoveredJob,
  type DiscoveryDiagnostics
} from "@/lib/api";

const NOT_APPLIED_REASONS = [
  "Not eligible",
  "Salary",
  "Location",
  "Already applied",
  "Not interested",
  "Other"
];

export default function CareerIntelligencePage() {
  const [role, setRole] = useState("sales");
  const [location, setLocation] = useState("India");
  const [experience, setExperience] = useState("0-2 years");
  const [skills, setSkills] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const [isInternship, setIsInternship] = useState(true);
  const [isFullTime, setIsFullTime] = useState(true);

  const [jobs, setJobs] = useState<DiscoveredJob[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiscoveryDiagnostics | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<DiscoveredJob | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [appliedJobs, setAppliedJobs] = useState<Record<string, boolean>>({});
  const [notAppliedJobs, setNotAppliedJobs] = useState<Record<string, boolean>>({});
  const [savedJobs, setSavedJobs] = useState<Record<string, boolean>>({});
  const [removedJobs, setRemovedJobs] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  // Reason Modal State
  const [reasonJob, setReasonJob] = useState<DiscoveredJob | null>(null);
  const [selectedReason, setSelectedReason] = useState("Not interested");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const criteria = {
        role,
        location,
        experience,
        skills: skills ? skills.split(",").map((s) => s.trim()) : [],
        remote: isRemote,
        internship: isInternship,
        full_time: isFullTime,
      };
      const res = await searchDiscoveredJobs(criteria);
      setJobs(res.jobs || []);
      if (res.diagnostics) {
        setDiagnostics(res.diagnostics);
      }
    } catch {
      showToast("Failed to fetch web job discoveries. Showing baseline results.");
      const fallback = await getDiscoveredJobs({ role, location });
      setJobs(fallback.jobs || []);
    } finally {
      setIsLoading(false);
    }
  }, [role, location, experience, skills, isRemote, isInternship, isFullTime]);

  useEffect(() => {
    handleSearch();
  }, []);

  /**
   * Strictly opens the exact external target URL in a new browser tab.
   * Priority: application_url -> job_url -> source_url
   * DOES NOT make any backend application submission API call.
   * DOES NOT change job status.
   * NEVER invents or fabricates fake URLs.
   */
  const handleApplyNowClick = (job: DiscoveredJob) => {
    const targetUrl = job.application_url || job.job_url || job.source_url;
    if (!targetUrl) {
      showToast("Application URL unavailable for this job.");
      return;
    }
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  const handleMarkApplied = async (job: DiscoveredJob) => {
    try {
      await markJobApplied(job.id, "Candidate confirmed manual submission on external website.");
      setAppliedJobs((prev) => ({ ...prev, [job.id]: true }));
      showToast(`Status updated to APPLIED: ${job.title} at ${job.company}`);
    } catch {
      showToast("Failed to mark status as APPLIED.");
    }
  };

  const openReasonModal = (job: DiscoveredJob) => {
    setReasonJob(job);
    setSelectedReason("Not interested");
  };

  const confirmMarkNotApplied = async () => {
    if (!reasonJob) return;
    try {
      await markJobNotApplied(reasonJob.id, selectedReason);
      setNotAppliedJobs((prev) => ({ ...prev, [reasonJob.id]: true }));
      showToast(`Status updated to NOT_APPLIED (${selectedReason}): ${reasonJob.title} at ${reasonJob.company}`);
    } catch {
      showToast("Failed to mark status as NOT_APPLIED.");
    } finally {
      setReasonJob(null);
    }
  };

  const handleRemoveJob = async (job: DiscoveredJob) => {
    try {
      await removeDiscoveredJob(job.id);
      setRemovedJobs((prev) => ({ ...prev, [job.id]: true }));
      showToast(`Removed job from feed: ${job.title} at ${job.company}`);
    } catch {
      showToast("Failed to remove job.");
    }
  };

  const handleSaveJob = async (job: DiscoveredJob) => {
    try {
      await saveDiscoveredJob(job.id);
      setSavedJobs((prev) => ({ ...prev, [job.id]: true }));
      showToast(`Saved job: ${job.title} at ${job.company}`);
    } catch {
      showToast("Failed to save job.");
    }
  };

  const handleRunAiAnalysis = async (job: DiscoveredJob) => {
    setSelectedJob(job);
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const res = await analyzeDiscoveredJob(job.id);
      setAiAnalysis(res.analysis);
    } catch {
      showToast("Gemini AI Analysis unavailable right now.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const activeJobs = jobs.filter((j) => !removedJobs[j.id]);

  return (
    <div style={{ padding: "30px 40px", color: "#f8fafc", maxWidth: 1200, margin: "0 auto" }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 20, right: 20, background: "#10b981", color: "#fff", padding: "12px 20px", borderRadius: 8, fontWeight: 600, zIndex: 999, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
          {toast}
        </div>
      )}

      {/* Didn't Apply Reason Modal */}
      {reasonJob && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#1e293b", padding: 24, borderRadius: 12, border: "1px solid #475569", maxWidth: 420, width: "90%" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 16, color: "#f8fafc" }}>Mark as Didn't Apply</h3>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 15 }}>
              Optionally select a reason for declining <strong>{reasonJob.title}</strong> at <strong>{reasonJob.company}</strong>:
            </p>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", background: "#0f172a", border: "1px solid #475569", borderRadius: 6, color: "#fff", fontSize: 13, marginBottom: 20 }}
            >
              {NOT_APPLIED_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setReasonJob(null)}
                style={{ padding: "8px 16px", background: "transparent", border: "1px solid #475569", color: "#94a3b8", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                onClick={confirmMarkNotApplied}
                style={{ padding: "8px 18px", background: "#ef4444", border: "none", color: "#fff", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: 13 }}
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 25 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#60a5fa", margin: 0 }}>
          JOBSEARCH AI — Web-Wide Job Discovery Engine
        </h1>
        <p style={{ color: "#94a3b8", marginTop: 6, fontSize: 14 }}>
          Discover real job openings across public ATS portals (Greenhouse, Lever, Ashby, Workday, SmartRecruiters), job boards (LinkedIn, Indeed, Internshala, Naukri, Monster, Wellfound), and company career portals.
        </p>
      </div>

      {/* Search Criteria Bar */}
      <div style={{ background: "#1e293b", padding: 20, borderRadius: 12, border: "1px solid #334155", marginBottom: 25 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 15, marginBottom: 15 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>Role / Title</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. sales, software engineer"
              style={{ width: "100%", padding: "9px 12px", background: "#0f172a", border: "1px solid #475569", borderRadius: 6, color: "#fff", fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. India, Remote"
              style={{ width: "100%", padding: "9px 12px", background: "#0f172a", border: "1px solid #475569", borderRadius: 6, color: "#fff", fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>Experience Level</label>
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", background: "#0f172a", border: "1px solid #475569", borderRadius: 6, color: "#fff", fontSize: 13 }}
            >
              <option value="0-2 years">0-2 years (Entry / Junior)</option>
              <option value="2-5 years">2-5 years (Mid-Level)</option>
              <option value="5+ years">5+ years (Senior)</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>Key Skills</label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. Sales, Python, React"
              style={{ width: "100%", padding: "9px 12px", background: "#0f172a", border: "1px solid #475569", borderRadius: 6, color: "#fff", fontSize: 13 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 15 }}>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <label style={{ fontSize: 13, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={isRemote} onChange={(e) => setIsRemote(e.target.checked)} />
              Remote
            </label>
            <label style={{ fontSize: 13, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={isInternship} onChange={(e) => setIsInternship(e.target.checked)} />
              Internship
            </label>
            <label style={{ fontSize: 13, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={isFullTime} onChange={(e) => setIsFullTime(e.target.checked)} />
              Full-Time
            </label>
          </div>

          <button
            onClick={handleSearch}
            disabled={isLoading}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              padding: "10px 24px",
              borderRadius: 8,
              fontWeight: 700,
              cursor: isLoading ? "not-allowed" : "pointer",
              fontSize: 14,
              boxShadow: "0 2px 8px rgba(37,99,235,0.4)"
            }}
          >
            {isLoading ? "Discovering..." : "Discover Jobs 🔍"}
          </button>
        </div>
      </div>

      {/* Discovery Diagnostics Bar (Collapsible) */}
      {diagnostics && (
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8" }}>Discovery Diagnostics</span>
              <span style={{ fontSize: 12, background: "rgba(56,189,248,0.12)", color: "#7dd3fc", padding: "2px 10px", borderRadius: 12, fontWeight: 600 }}>
                Total: {diagnostics.total_discovered} | Deduplicated: {diagnostics.after_deduplication}
              </span>
            </div>
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >
              {showDiagnostics ? "Hide ▲" : "Show Source Diagnostics ▼"}
            </button>
          </div>

          {showDiagnostics && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {diagnostics.sources.map((src) => {
                const isOk = src.jobs_retrieved > 0;
                return (
                  <div
                    key={src.name}
                    style={{
                      background: isOk ? "rgba(34,197,94,0.08)" : "rgba(100,116,139,0.08)",
                      border: `1px solid ${isOk ? "rgba(34,197,94,0.3)" : "rgba(100,116,139,0.2)"}`,
                      color: isOk ? "#86efac" : "#64748b",
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    <span>{isOk ? "✓" : "⚠"}</span>
                    <strong style={{ color: isOk ? "#f8fafc" : "#94a3b8" }}>{src.name}</strong>
                    <span style={{ opacity: 0.7, fontSize: 11 }}>({src.jobs_retrieved})</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Count & Sort Sub-Header (Matches Screenshot) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, padding: "0 4px" }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc", margin: 0 }}>
          {activeJobs.length} public jobs discovered &amp; ranked
        </h2>
        <span style={{ fontSize: 13, color: "#60a5fa", fontWeight: 600 }}>
          Sorted by: <strong style={{ color: "#93c5fd" }}>Newest First (Freshness)</strong>
        </span>
      </div>

      {/* Discovered Jobs List (Matches Screenshot UI Cards) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {activeJobs.length === 0 ? (
          <div style={{ background: "#1e293b", padding: 40, borderRadius: 12, textAlign: "center", color: "#94a3b8", border: "1px solid #334155" }}>
            No active discovered jobs matching criteria. Click "Discover Jobs 🔍" to search the public web.
          </div>
        ) : (
          activeJobs.map((job) => {
            const isApplied = appliedJobs[job.id] || job.status === "APPLIED";
            const isNotApplied = notAppliedJobs[job.id] || job.status === "NOT_APPLIED";
            const isSaved = savedJobs[job.id] || job.status === "SAVED";
            const currentStatus = isApplied ? "APPLIED" : isNotApplied ? "NOT_APPLIED" : isSaved ? "SAVED" : job.status || "DISCOVERED";

            const targetUrl = job.application_url || job.job_url || job.source_url;
            const viewJobUrl = job.job_url || job.source_url;
            const careerPageUrl = job.career_page_url;

            const sourcesList = job.sources && job.sources.length > 0 ? job.sources : [job.source];
            const sourceDisplay = sourcesList.length > 1
              ? `Sources: ${sourcesList.join(" · ")}`
              : `Source: ${job.source}`;

            const matchScore = job.match_score !== undefined ? Math.round(job.match_score) : 40;

            return (
              <div
                key={job.id}
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: 12,
                  padding: 22,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14
                }}
              >
                {/* Top Row: Company, Title, Location, Match & Status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0, color: "#f8fafc" }}>
                      {job.company}
                    </h2>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: "5px 0 0", color: "#60a5fa" }}>
                      {job.title}
                    </h3>
                    <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6, display: "flex", gap: 12, alignItems: "center" }}>
                      <span>📍 {job.location || "India"}</span>
                      <span>🕒 Posted recently</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)", padding: "5px 14px", borderRadius: 20, fontWeight: 800, fontSize: 13 }}>
                      Match: {matchScore}%
                    </span>
                    <span style={{ background: "#0f172a", color: "#38bdf8", border: "1px solid #334155", padding: "5px 12px", borderRadius: 6, fontWeight: 700, fontSize: 12 }}>
                      Status: {currentStatus}
                    </span>
                  </div>
                </div>

                {/* Card Button Bar (Matches Screenshot exactly) */}
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                  {viewJobUrl ? (
                    <a
                      href={viewJobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ background: "#0f172a", color: "#60a5fa", border: "1px solid #3b82f6", padding: "9px 18px", borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: "none" }}
                    >
                      View Job ↗
                    </a>
                  ) : (
                    <span style={{ color: "#64748b", fontSize: 12, fontStyle: "italic" }}>Job URL unavailable</span>
                  )}

                  {targetUrl ? (
                    <button
                      onClick={() => handleApplyNowClick(job)}
                      style={{ background: "#2563eb", color: "#fff", border: "none", padding: "9px 20px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                    >
                      Apply Now ↗
                    </button>
                  ) : (
                    <span style={{ color: "#64748b", fontSize: 12, fontStyle: "italic" }}>Application URL unavailable</span>
                  )}

                  <button
                    onClick={() => handleMarkApplied(job)}
                    disabled={isApplied}
                    style={{
                      background: isApplied ? "rgba(34,197,94,0.25)" : "#10b981",
                      color: "#fff",
                      border: "none",
                      padding: "9px 18px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isApplied ? "default" : "pointer"
                    }}
                  >
                    {isApplied ? "✓ Applied" : "I Applied"}
                  </button>

                  <button
                    onClick={() => openReasonModal(job)}
                    disabled={isNotApplied}
                    style={{
                      background: "rgba(100,116,139,0.2)",
                      color: "#94a3b8",
                      border: "1px solid #475569",
                      padding: "9px 18px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isNotApplied ? "default" : "pointer"
                    }}
                  >
                    {isNotApplied ? "Didn't Apply" : "Didn't Apply"}
                  </button>

                  <button
                    onClick={() => handleRemoveJob(job)}
                    style={{
                      background: "rgba(239,68,68,0.12)",
                      color: "#f87171",
                      border: "1px solid rgba(239,68,68,0.3)",
                      padding: "9px 18px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Remove
                  </button>
                </div>

                {/* Footer Bar (Matches Screenshot) */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 4, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13, color: "#64748b" }}>
                  <div>
                    <span style={{ color: "#38bdf8", fontWeight: 600 }}>{sourceDisplay}</span>
                  </div>

                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    {careerPageUrl && (
                      <a
                        href={careerPageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#a855f7", textDecoration: "none", fontWeight: 600 }}
                      >
                        Company Career Page ↗
                      </a>
                    )}

                    <button
                      onClick={() => handleSaveJob(job)}
                      style={{ background: "none", border: "none", color: isSaved ? "#fbbf24" : "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                    >
                      {isSaved ? "✓ Saved" : "Save"}
                    </button>

                    <button
                      onClick={() => handleRunAiAnalysis(job)}
                      style={{ background: "none", border: "none", color: "#c084fc", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                    >
                      AI Analysis ⚡
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
