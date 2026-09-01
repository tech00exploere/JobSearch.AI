"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  searchDiscoveredJobs,
  getDiscoveredJobs,
  analyzeDiscoveredJob,
  saveDiscoveredJob,
  markJobApplied,
  markJobNotApplied,
  removeDiscoveredJob,
  type DiscoveredJob,
  type DiscoveryDiagnostics,
} from "@/lib/api";
import { buildPlatformLinks, type PlatformLink, type SearchCriteria } from "@/lib/platformSearch";

const NOT_APPLIED_REASONS = [
  "Not eligible",
  "Salary",
  "Location",
  "Already applied",
  "Not interested",
  "Other",
];

export default function CareerIntelligencePage() {
  // Search form state
  const [role, setRole] = useState("sales");
  const [location, setLocation] = useState("India");
  const [experience, setExperience] = useState("0-2 years");
  const [skills, setSkills] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const [isInternship, setIsInternship] = useState(true);
  const [isFullTime, setIsFullTime] = useState(true);

  // Individual discovered jobs (ATS, career pages, web discovery)
  const [jobs, setJobs] = useState<DiscoveredJob[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiscoveryDiagnostics | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // UI state
  const [appliedJobs, setAppliedJobs] = useState<Record<string, boolean>>({});
  const [notAppliedJobs, setNotAppliedJobs] = useState<Record<string, boolean>>({});
  const [savedJobs, setSavedJobs] = useState<Record<string, boolean>>({});
  const [removedJobs, setRemovedJobs] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [reasonJob, setReasonJob] = useState<DiscoveredJob | null>(null);
  const [selectedReason, setSelectedReason] = useState("Not interested");
  const [analyzingJobId, setAnalyzingJobId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // ── Platform links — pure client-side, no backend call ──
  // Recomputed instantly whenever search criteria changes.
  const platformCriteria: SearchCriteria = useMemo(() => ({
    role,
    location,
    experience,
    skills: skills ? skills.split(",").map((s) => s.trim()) : [],
    remote: isRemote,
    internship: isInternship,
    fullTime: isFullTime,
  }), [role, location, experience, skills, isRemote, isInternship, isFullTime]);

  const platformLinks: PlatformLink[] = useMemo(
    () => buildPlatformLinks(platformCriteria),
    [platformCriteria]
  );
  // ─────────────────────────────────────────────────────────

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
      if (res.diagnostics) setDiagnostics(res.diagnostics);
    } catch {
      showToast("Discovery failed. Showing cached results.");
      const fallback = await getDiscoveredJobs({ role, location }).catch(() => ({ jobs: [] as DiscoveredJob[] }));
      setJobs(fallback.jobs || []);
    } finally {
      setIsLoading(false);
    }
  }, [role, location, experience, skills, isRemote, isInternship, isFullTime]);

  useEffect(() => { handleSearch(); }, []);

  /**
   * Opens platform's OWN search page in a new tab.
   * Pure navigation shortcut — NO backend call, NO status change.
   */
  const handleBrowsePlatform = (link: PlatformLink) => {
    if (!link.searchUrl || !link.available) return;
    window.open(link.searchUrl, "_blank", "noopener,noreferrer");
    // Explicitly: no status change, no application record created.
  };

  /**
   * Opens the EXACT real job URL discovered by the engine.
   * Priority: application_url -> job_url -> source_url
   * NEVER fabricates a URL. NEVER changes status.
   */
  const handleApplyNowClick = (job: DiscoveredJob) => {
    const targetUrl = job.application_url || job.job_url || job.source_url;
    if (!targetUrl) { showToast("Application URL unavailable for this job."); return; }
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  const handleMarkApplied = async (job: DiscoveredJob) => {
    try {
      await markJobApplied(job.id, "Candidate confirmed manual submission on external website.");
      setAppliedJobs((prev) => ({ ...prev, [job.id]: true }));
      showToast(`APPLIED: ${job.title} at ${job.company}`);
    } catch { showToast("Failed to mark APPLIED."); }
  };

  const openReasonModal = (job: DiscoveredJob) => { setReasonJob(job); setSelectedReason("Not interested"); };

  const confirmMarkNotApplied = async () => {
    if (!reasonJob) return;
    try {
      await markJobNotApplied(reasonJob.id, selectedReason);
      setNotAppliedJobs((prev) => ({ ...prev, [reasonJob.id]: true }));
      showToast(`NOT_APPLIED (${selectedReason}): ${reasonJob.title} at ${reasonJob.company}`);
    } catch { showToast("Failed to mark NOT_APPLIED."); }
    finally { setReasonJob(null); }
  };

  const handleRemoveJob = async (job: DiscoveredJob) => {
    try {
      await removeDiscoveredJob(job.id);
      setRemovedJobs((prev) => ({ ...prev, [job.id]: true }));
      showToast(`Removed: ${job.title} at ${job.company}`);
    } catch { showToast("Failed to remove job."); }
  };

  const handleSaveJob = async (job: DiscoveredJob) => {
    try {
      await saveDiscoveredJob(job.id);
      setSavedJobs((prev) => ({ ...prev, [job.id]: true }));
      showToast(`Saved: ${job.title} at ${job.company}`);
    } catch { showToast("Failed to save job."); }
  };

  const handleRunAiAnalysis = async (job: DiscoveredJob) => {
    setAnalyzingJobId(job.id);
    try {
      const res = await analyzeDiscoveredJob(job.id);
      showToast(res.analysis ? "AI Analysis complete." : "AI Analysis returned no data.");
    } catch { showToast("Gemini AI Analysis unavailable right now."); }
    finally { setAnalyzingJobId(null); }
  };

  const activeJobs = jobs.filter((j) => !removedJobs[j.id]);

  return (
    <div style={{ padding: "30px 40px", color: "#f8fafc", maxWidth: 1200, margin: "0 auto" }}>
      {/* Toast */}
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
              Reason for declining <strong>{reasonJob.title}</strong> at <strong>{reasonJob.company}</strong>:
            </p>
            <select value={selectedReason} onChange={(e) => setSelectedReason(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", background: "#0f172a", border: "1px solid #475569", borderRadius: 6, color: "#fff", fontSize: 13, marginBottom: 20 }}>
              {NOT_APPLIED_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setReasonJob(null)} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #475569", color: "#94a3b8", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Cancel</button>
              <button onClick={confirmMarkNotApplied} style={{ padding: "8px 18px", background: "#ef4444", border: "none", color: "#fff", borderRadius: 6, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Confirm Decline</button>
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
          Discover real job openings from ATS portals (Greenhouse, Lever, Ashby, Workday, SmartRecruiters) and company career pages — plus direct search shortcuts to LinkedIn, Indeed, Naukri, Internshala, and more.
        </p>
      </div>

      {/* Search Bar */}
      <div style={{ background: "#1e293b", padding: 20, borderRadius: 12, border: "1px solid #334155", marginBottom: 25 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 15, marginBottom: 15 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>Role / Title</label>
            <input type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. sales, software engineer"
              style={{ width: "100%", padding: "9px 12px", background: "#0f172a", border: "1px solid #475569", borderRadius: 6, color: "#fff", fontSize: 13 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. India, Remote"
              style={{ width: "100%", padding: "9px 12px", background: "#0f172a", border: "1px solid #475569", borderRadius: 6, color: "#fff", fontSize: 13 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>Experience Level</label>
            <select value={experience} onChange={(e) => setExperience(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", background: "#0f172a", border: "1px solid #475569", borderRadius: 6, color: "#fff", fontSize: 13 }}>
              <option value="0-2 years">0-2 years (Entry / Junior)</option>
              <option value="2-5 years">2-5 years (Mid-Level)</option>
              <option value="5+ years">5+ years (Senior)</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>Key Skills</label>
            <input type="text" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. Sales, Python, React"
              style={{ width: "100%", padding: "9px 12px", background: "#0f172a", border: "1px solid #475569", borderRadius: 6, color: "#fff", fontSize: 13 }} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 15 }}>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            {[
              { label: "Remote", val: isRemote, set: setIsRemote },
              { label: "Internship", val: isInternship, set: setIsInternship },
              { label: "Full-Time", val: isFullTime, set: setIsFullTime },
            ].map(({ label, val, set }) => (
              <label key={label} style={{ fontSize: 13, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} /> {label}
              </label>
            ))}
          </div>
          <button onClick={handleSearch} disabled={isLoading}
            style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, fontWeight: 700, cursor: isLoading ? "not-allowed" : "pointer", fontSize: 14, boxShadow: "0 2px 8px rgba(37,99,235,0.4)" }}>
            {isLoading ? "Discovering..." : "Discover Jobs 🔍"}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 1: INDIVIDUALLY DISCOVERED JOBS
          Real listings from ATS portals and company career pages.
          Each has real job_url / application_url from the engine.
          ═══════════════════════════════════════════════════════ */}

      {/* Diagnostics Bar */}
      {diagnostics && (
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#38bdf8" }}>Discovery Diagnostics</span>
              <span style={{ fontSize: 12, background: "rgba(56,189,248,0.12)", color: "#7dd3fc", padding: "2px 10px", borderRadius: 12, fontWeight: 600 }}>
                Found: {diagnostics.total_discovered} | After dedup: {diagnostics.after_deduplication}
              </span>
            </div>
            <button onClick={() => setShowDiagnostics(!showDiagnostics)}
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              {showDiagnostics ? "Hide ▲" : "Show Sources ▼"}
            </button>
          </div>
          {showDiagnostics && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {diagnostics.sources.map((src) => {
                const isOk = src.jobs_retrieved > 0;
                return (
                  <div key={src.name} style={{
                    background: isOk ? "rgba(34,197,94,0.08)" : "rgba(100,116,139,0.08)",
                    border: `1px solid ${isOk ? "rgba(34,197,94,0.3)" : "rgba(100,116,139,0.2)"}`,
                    borderRadius: 6, padding: "4px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 6
                  }}>
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

      {/* Count + Sort */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, padding: "0 4px" }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc", margin: 0 }}>
          {activeJobs.length} public jobs discovered &amp; ranked
        </h2>
        <span style={{ fontSize: 13, color: "#60a5fa", fontWeight: 600 }}>
          Sorted by: <strong style={{ color: "#93c5fd" }}>Newest First (Freshness)</strong>
        </span>
      </div>

      {/* Individual Job Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>
        {activeJobs.length === 0 ? (
          <div style={{ background: "#1e293b", padding: 30, borderRadius: 12, textAlign: "center", color: "#94a3b8", border: "1px solid #334155" }}>
            No individual jobs discovered from ATS portals or company career pages.
            <br />
            <span style={{ fontSize: 13, marginTop: 8, display: "block", color: "#64748b" }}>
              Use the platform shortcuts below to search LinkedIn, Indeed, Naukri, and more directly.
            </span>
          </div>
        ) : (
          activeJobs.map((job) => {
            const isApplied = appliedJobs[job.id] || job.status === "APPLIED";
            const isNotApplied = notAppliedJobs[job.id] || job.status === "NOT_APPLIED";
            const isSaved = savedJobs[job.id] || job.status === "SAVED";
            const currentStatus = isApplied ? "APPLIED" : isNotApplied ? "NOT_APPLIED" : isSaved ? "SAVED" : (job.status || "DISCOVERED");

            // Real URL resolution — zero fabrication
            const viewJobUrl = job.job_url || job.source_url;
            const applyUrl = job.application_url || job.job_url || job.source_url;
            const matchScore = job.match_score !== undefined ? Math.round(job.match_score) : null;
            const sourcesList = (job.sources && job.sources.length > 0) ? job.sources : [job.source];
            const sourceDisplay = sourcesList.length > 1 ? `Sources: ${sourcesList.join(" · ")}` : `Source: ${job.source}`;

            return (
              <div key={job.id} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Top Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0, color: "#f8fafc" }}>{job.company}</h2>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: "5px 0 0", color: "#60a5fa" }}>{job.title}</h3>
                    <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6, display: "flex", gap: 12 }}>
                      <span>📍 {job.location || "India"}</span>
                      <span>🕒 Posted recently</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {matchScore !== null && (
                      <span style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)", padding: "5px 14px", borderRadius: 20, fontWeight: 800, fontSize: 13 }}>
                        Match: {matchScore}%
                      </span>
                    )}
                    <span style={{ background: "#0f172a", color: "#38bdf8", border: "1px solid #334155", padding: "5px 12px", borderRadius: 6, fontWeight: 700, fontSize: 12 }}>
                      Status: {currentStatus}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {viewJobUrl
                    ? <a href={viewJobUrl} target="_blank" rel="noopener noreferrer" style={{ background: "#0f172a", color: "#60a5fa", border: "1px solid #3b82f6", padding: "9px 18px", borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>View Job ↗</a>
                    : <span style={{ color: "#64748b", fontSize: 12, fontStyle: "italic" }}>Job URL unavailable</span>
                  }
                  {applyUrl
                    ? <button onClick={() => handleApplyNowClick(job)} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "9px 20px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Apply Now ↗</button>
                    : <span style={{ color: "#64748b", fontSize: 12, fontStyle: "italic" }}>Application URL unavailable</span>
                  }
                  <button onClick={() => handleMarkApplied(job)} disabled={isApplied}
                    style={{ background: isApplied ? "rgba(34,197,94,0.25)" : "#10b981", color: "#fff", border: "none", padding: "9px 18px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: isApplied ? "default" : "pointer" }}>
                    {isApplied ? "✓ Applied" : "I Applied"}
                  </button>
                  <button onClick={() => openReasonModal(job)} disabled={isNotApplied}
                    style={{ background: "rgba(100,116,139,0.2)", color: "#94a3b8", border: "1px solid #475569", padding: "9px 18px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: isNotApplied ? "default" : "pointer" }}>
                    {isNotApplied ? "Didn't Apply" : "Didn't Apply"}
                  </button>
                  <button onClick={() => handleRemoveJob(job)}
                    style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", padding: "9px 18px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    Remove
                  </button>
                </div>

                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
                  <span style={{ color: "#38bdf8", fontWeight: 600 }}>{sourceDisplay}</span>
                  <div style={{ display: "flex", gap: 16 }}>
                    {job.career_page_url && (
                      <a href={job.career_page_url} target="_blank" rel="noopener noreferrer" style={{ color: "#a855f7", textDecoration: "none", fontWeight: 600 }}>Company Career Page ↗</a>
                    )}
                    <button onClick={() => handleSaveJob(job)} style={{ background: "none", border: "none", color: isSaved ? "#fbbf24" : "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      {isSaved ? "✓ Saved" : "Save"}
                    </button>
                    <button onClick={() => handleRunAiAnalysis(job)} style={{ background: "none", border: "none", color: "#c084fc", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                      {analyzingJobId === job.id ? "Analyzing..." : "AI Analysis ⚡"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2: SEARCH MORE JOBS ON (Platform Shortcuts)
          NOT individual job listings.
          Pure navigation shortcuts to each platform's own
          search results page. Pure client-side URL generation.
          Clicking NEVER changes application status.
          ═══════════════════════════════════════════════════════ */}
      <div style={{ borderTop: "1px solid #1e293b", paddingTop: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc", margin: 0 }}>
            Search More Jobs On
          </h2>
          <span style={{ fontSize: 12, background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)", padding: "3px 12px", borderRadius: 12, fontWeight: 600 }}>
            Opens platform's own search · Not fetched by JobSearch.ai
          </span>
        </div>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20, marginTop: 6 }}>
          For platforms JobSearch.ai cannot directly retrieve jobs from, click to open that platform's own live search results for <strong style={{ color: "#94a3b8" }}>&ldquo;{role}&rdquo;</strong> in <strong style={{ color: "#94a3b8" }}>{location}</strong>.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 14 }}>
          {platformLinks.map((link) => (
            <div key={link.platform} style={{
              background: link.available ? "#1e293b" : "#111827",
              border: `1px solid ${link.available ? "#334155" : "#1e293b"}`,
              borderRadius: 10,
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              opacity: link.available ? 1 : 0.5,
            }}>
              {/* Platform Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 22 }}>{link.icon}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#f8fafc" }}>{link.displayName}</div>
                  <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: 600, marginTop: 1 }}>
                    {role} Jobs
                  </div>
                </div>
              </div>

              {/* Search Details */}
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
                <div>Search: <span style={{ color: "#cbd5e1", fontWeight: 600 }}>{role}</span></div>
                <div>Location: <span style={{ color: "#cbd5e1", fontWeight: 600 }}>{location}</span></div>
              </div>

              {/* Browse Button */}
              {link.available ? (
                <button onClick={() => handleBrowsePlatform(link)}
                  style={{
                    background: "rgba(37,99,235,0.15)",
                    color: "#93c5fd",
                    border: "1px solid rgba(37,99,235,0.4)",
                    padding: "9px 16px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                  }}>
                  Browse {link.displayName} Jobs ↗
                </button>
              ) : (
                <div style={{ fontSize: 12, color: "#475569", fontStyle: "italic", padding: "9px 0" }}>
                  Platform search unavailable
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
