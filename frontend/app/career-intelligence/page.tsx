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
  type DiscoveredJob
} from "@/lib/api";

export default function CareerIntelligencePage() {
  const [role, setRole] = useState("Software Engineer");
  const [location, setLocation] = useState("India");
  const [experience, setExperience] = useState("0-2 years");
  const [skills, setSkills] = useState("Python, FastAPI, React, Node.js");
  const [isRemote, setIsRemote] = useState(true);
  const [isInternship, setIsInternship] = useState(false);
  const [isFullTime, setIsFullTime] = useState(true);

  const [jobs, setJobs] = useState<DiscoveredJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<DiscoveredJob | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [appliedJobs, setAppliedJobs] = useState<Record<string, boolean>>({});
  const [notAppliedJobs, setNotAppliedJobs] = useState<Record<string, boolean>>({});
  const [savedJobs, setSavedJobs] = useState<Record<string, boolean>>({});
  const [removedJobs, setRemovedJobs] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

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
        skills: skills.split(",").map((s) => s.trim()),
        remote: isRemote,
        internship: isInternship,
        full_time: isFullTime,
      };
      const res = await searchDiscoveredJobs(criteria);
      setJobs(res.jobs || []);
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
   * DOES NOT make any backend application submission API call.
   * DOES NOT change job status.
   */
  const handleApplyNowClick = (job: DiscoveredJob) => {
    const targetUrl = job.application_url ?? job.job_url;
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

  const handleMarkNotApplied = async (job: DiscoveredJob) => {
    try {
      await markJobNotApplied(job.id, "Not interested");
      setNotAppliedJobs((prev) => ({ ...prev, [job.id]: true }));
      showToast(`Status updated to NOT_APPLIED: ${job.title} at ${job.company}`);
    } catch {
      showToast("Failed to mark status as NOT_APPLIED.");
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

      {/* Header */}
      <div style={{ marginBottom: 25 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#60a5fa", margin: 0 }}>
          JOBSETU AI — Web-Wide Job Discovery Engine
        </h1>
        <p style={{ color: "#94a3b8", marginTop: 6, fontSize: 14 }}>
          Discover real job openings across public ATS portals (Greenhouse, Lever, Ashby, Workday, SmartRecruiters), job boards (LinkedIn, Indeed, Internshala, Naukri, Monster, Wellfound), and company career portals.
        </p>
      </div>

      {/* Search Criteria Bar */}
      <div style={{ background: "#1e293b", padding: 20, borderRadius: 12, border: "1px solid #334155", marginBottom: 30 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 15, marginBottom: 15 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>Role / Title</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", background: "#0f172a", border: "1px solid #475569", borderRadius: 6, color: "#fff", fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
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
              style={{ width: "100%", padding: "9px 12px", background: "#0f172a", border: "1px solid #475569", borderRadius: 6, color: "#fff", fontSize: 13 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 15 }}>
          <div style={{ display: "flex", gap: 20, alignItems: "center", fontSize: 13, color: "#cbd5e1" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={isRemote} onChange={(e) => setIsRemote(e.target.checked)} /> Remote
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={isInternship} onChange={(e) => setIsInternship(e.target.checked)} /> Internship
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={isFullTime} onChange={(e) => setIsFullTime(e.target.checked)} /> Full-Time
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
            {isLoading ? "Searching Web..." : "Discover Jobs 🔍"}
          </button>
        </div>
      </div>

      {/* Discovery Results Meta */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#cbd5e1" }}>
          {activeJobs.length} public jobs discovered & ranked
        </span>
        <span style={{ fontSize: 13, color: "#94a3b8" }}>
          Sorted by: <strong style={{ color: "#38bdf8" }}>Newest First (Freshness)</strong>
        </span>
      </div>

      {/* Job Cards Stream */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8", fontSize: 16 }}>
          🔍 Querying multi-source discovery engine (ATS Platforms, Job Boards, Company Career Portals)...
        </div>
      ) : activeJobs.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: "#1e293b", borderRadius: 12, border: "1px solid #334155" }}>
          <p style={{ color: "#94a3b8", fontSize: 16, margin: 0 }}>No matching job discoveries found for the current search criteria.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {activeJobs.map((job) => {
            const targetUrl = job.application_url ?? job.job_url;
            const isApplied = Boolean(appliedJobs[job.id]);
            const isNotApplied = Boolean(notAppliedJobs[job.id]);
            const isSaved = Boolean(savedJobs[job.id]);
            const currentStatus = isApplied ? "APPLIED" : (isNotApplied ? "NOT_APPLIED" : (isSaved ? "SAVED" : (job.status || "DISCOVERED")));

            return (
              <div
                key={job.id}
                style={{
                  background: "#1e293b",
                  borderRadius: 12,
                  border: "1px solid #334155",
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12
                }}
              >
                {/* Company & Role Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#f8fafc" }}>
                      {job.company}
                    </h2>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: "4px 0 0", color: "#60a5fa" }}>
                      {job.title}
                    </h3>
                    <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4, display: "flex", gap: 12, alignItems: "center" }}>
                      <span>📍 {job.location || "Remote"}</span>
                      <span>🕒 Posted recently</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {job.match_score !== undefined && (
                      <span style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)", padding: "4px 12px", borderRadius: 20, fontWeight: 800, fontSize: 13 }}>
                        Match: {Math.round(job.match_score)}%
                      </span>
                    )}
                    <span style={{ background: "#0f172a", color: "#38bdf8", border: "1px solid #334155", padding: "4px 10px", borderRadius: 6, fontWeight: 700, fontSize: 12 }}>
                      Status: {currentStatus}
                    </span>
                  </div>
                </div>

                {/* Main Action Buttons */}
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                  {job.job_url ? (
                    <a
                      href={job.job_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ background: "#0f172a", color: "#60a5fa", border: "1px solid #3b82f6", padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: "none" }}
                    >
                      View Job ↗
                    </a>
                  ) : (
                    <span style={{ color: "#64748b", fontSize: 12, fontStyle: "italic" }}>Job URL unavailable</span>
                  )}

                  {targetUrl ? (
                    <button
                      onClick={() => handleApplyNowClick(job)}
                      style={{ background: "#2563eb", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
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
                      background: isApplied ? "rgba(34,197,94,0.2)" : "#10b981",
                      color: "#fff",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: isApplied ? "default" : "pointer"
                    }}
                  >
                    {isApplied ? "✓ Applied" : "I Applied"}
                  </button>

                  <button
                    onClick={() => handleMarkNotApplied(job)}
                    disabled={isNotApplied}
                    style={{
                      background: "rgba(100,116,139,0.2)",
                      color: "#94a3b8",
                      border: "1px solid #475569",
                      padding: "8px 16px",
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
                      padding: "8px 16px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    Remove
                  </button>
                </div>

                {/* Secondary Actions & Metadata Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 4, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: "#64748b" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span>Source: <strong style={{ color: "#38bdf8" }}>{job.source || "Company Career Page"}</strong></span>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {job.career_page_url && (
                      <a
                        href={job.career_page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#c084fc", textDecoration: "none", fontWeight: 600 }}
                      >
                        Company Career Page ↗
                      </a>
                    )}
                    <button
                      onClick={() => handleSaveJob(job)}
                      disabled={isSaved}
                      style={{ background: "none", border: "none", color: isSaved ? "#94a3b8" : "#cbd5e1", cursor: isSaved ? "default" : "pointer", fontSize: 12, fontWeight: 600 }}
                    >
                      {isSaved ? "Saved" : "Save"}
                    </button>
                    <button
                      onClick={() => handleRunAiAnalysis(job)}
                      style={{ background: "none", border: "none", color: "#c084fc", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                    >
                      AI Analysis ⚡
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Analysis Modal */}
      {selectedJob && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20 }}>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, width: "100%", maxWidth: 650, maxHeight: "85vh", overflowY: "auto", padding: 25 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
              <h3 style={{ margin: 0, color: "#c084fc", fontSize: 18 }}>
                Gemini AI Deep JD Analysis — {selectedJob.title}
              </h3>
              <button onClick={() => setSelectedJob(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>

            {isAnalyzing ? (
              <p style={{ color: "#94a3b8" }}>Analyzing job description with Gemini AI...</p>
            ) : aiAnalysis ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13, color: "#e2e8f0" }}>
                <div>
                  <strong style={{ color: "#38bdf8" }}>Required Skills:</strong>
                  <p style={{ margin: "4px 0 0" }}>{aiAnalysis.required_skills?.join(", ") || "Python, React, REST APIs"}</p>
                </div>
                <div>
                  <strong style={{ color: "#38bdf8" }}>Fit Evaluation:</strong>
                  <p style={{ margin: "4px 0 0" }}>{aiAnalysis.summary_reasoning || "Strong technical skill alignment with full-stack and API development."}</p>
                </div>
              </div>
            ) : (
              <p style={{ color: "#f87171" }}>Unable to complete AI analysis.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
