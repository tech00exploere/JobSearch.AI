"use client";

import { useState, useEffect, useMemo } from "react";
import { searchJobs, calculateMatch, prepareApplication, type JobListing, type JobMatchResult, type PreparedApplication } from "@/lib/api";

const CATEGORIES: Record<string, string[]> = {
  "All":               [],
  "Tech / Engineering": ["engineer", "developer", "backend", "frontend", "full-stack", "ai", "ml"],
  "Sales":             ["sales", "sdr", "account manager", "inside sales"],
  "Business Dev":      ["business development", "partnership", "alliances", "bd"],
  "Marketing":         ["marketing", "brand", "growth", "social media", "performance", "content"],
  "Design":            ["design", "ux", "ui"],
  "Finance":           ["financial", "analyst", "finance"],
  "HR / People":       ["hr", "human resources", "people"],
};

function getCategoryForJob(job: JobListing): string {
  const text = (job.title + " " + job.description).toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    if (cat === "All") continue;
    if (
      keywords.some((k) => {
        const escaped = k.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        const regex = new RegExp(`\\b${escaped}\\b`, "i");
        return regex.test(text);
      })
    ) {
      return cat;
    }
  }
  return "Other";
}


function scoreBadgeColor(score: number) {
  if (score >= 70) return { bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.4)", text: "#86efac" };
  if (score >= 40) return { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.4)", text: "#fbbf24" };
  return { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)", text: "#fca5a5" };
}

export default function MatchPage() {
  const [allJobs, setAllJobs]           = useState<JobListing[]>([]);
  const [searchQuery, setSearchQuery]   = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedJobId, setSelectedJobId]   = useState<string>("");
  const [matchResult, setMatchResult]   = useState<JobMatchResult | null>(null);
  const [prepApp, setPrepApp]           = useState<PreparedApplication | null>(null);
  const [isLoading, setIsLoading]       = useState<boolean>(false);
  const [loadError, setLoadError]       = useState<string | null>(null);
  const [matchError, setMatchError]     = useState<string | null>(null);

  useEffect(() => {
    searchJobs()
      .then((data) => {
        setAllJobs(data);
        if (data.length > 0) setSelectedJobId(data[0].id);
      })
      .catch((err) => setLoadError("Could not load jobs. Is the backend running? " + err.message));
  }, []);

  // Live-filter by search query + category
  const filteredJobs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allJobs.filter((j) => {
      const text = (j.title + " " + j.company + " " + j.description + " " + j.required_skills.join(" ")).toLowerCase();
      const matchesQ = !q || q.split(" ").every((word) => text.includes(word));
      const cat = getCategoryForJob(j);
      const matchesCat = activeCategory === "All" || cat === activeCategory;
      return matchesQ && matchesCat;
    });
  }, [allJobs, searchQuery, activeCategory]);

  // Auto-select first result when filter changes
  useEffect(() => {
    if (filteredJobs.length > 0 && !filteredJobs.find((j) => j.id === selectedJobId)) {
      setSelectedJobId(filteredJobs[0].id);
    }
  }, [filteredJobs]);

  async function handleCalculateMatch() {
    if (!selectedJobId) return;
    setIsLoading(true);
    setMatchError(null);
    setPrepApp(null);
    setMatchResult(null);
    try {
      const match = await calculateMatch(selectedJobId);
      setMatchResult(match);
      const app = await prepareApplication(selectedJobId);
      setPrepApp(app);
    } catch (err: any) {
      setMatchError(err.message || "Failed to calculate match");
    } finally {
      setIsLoading(false);
    }
  }

  const selectedJob = allJobs.find((j) => j.id === selectedJobId) || null;

  return (
    <div style={{ padding: 32, color: "#f8fafc", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#93c5fd" }}>
          Instant JD Matcher & Resume Tailorer
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 14, margin: "6px 0 0" }}>
          Evaluates how well your profile matches any job — across any industry. Generates grounded, non-hallucinated tailored materials ready for your approval.
        </p>
      </header>

      {loadError && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", padding: "12px 16px", borderRadius: 8, marginBottom: 20 }}>
          Error: {loadError}
        </div>
      )}


      {/* Job Picker Panel */}
      <div style={{ background: "#1e293b", padding: 24, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 28 }}>
        
        {/* Search + Analyse row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search by role, skill, company… e.g. 'marketing', 'sales', 'python'"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1, padding: "11px 16px", background: "#0f172a",
              border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8,
              color: "#f8fafc", fontSize: 14, outline: "none",
            }}
          />
          <button
            onClick={handleCalculateMatch}
            disabled={isLoading || !selectedJobId}
            style={{
              padding: "11px 24px", background: isLoading ? "rgba(37,99,235,0.5)" : "#2563eb",
              color: "#fff", fontWeight: 700, borderRadius: 8, border: "none",
              cursor: isLoading || !selectedJobId ? "not-allowed" : "pointer",
              fontSize: 14, whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            {isLoading ? "Analyzing…" : "Match & Tailor →"}
          </button>
        </div>

        {/* Category tag filters */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {Object.keys(CATEGORIES).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: "pointer", border: "1px solid",
                background: activeCategory === cat ? "rgba(59,130,246,0.25)" : "transparent",
                borderColor: activeCategory === cat ? "rgba(59,130,246,0.6)" : "rgba(255,255,255,0.12)",
                color: activeCategory === cat ? "#93c5fd" : "#94a3b8",
                transition: "all 0.15s",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Job cards grid */}
        {filteredJobs.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
            No jobs match your search. Try a different keyword or category.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, maxHeight: 380, overflowY: "auto", paddingRight: 4 }}>
            {filteredJobs.map((j) => {
              const isSelected = j.id === selectedJobId;
              const cat = getCategoryForJob(j);
              return (
                <div
                  key={j.id}
                  onClick={() => { setSelectedJobId(j.id); setMatchResult(null); setPrepApp(null); }}
                  style={{
                    padding: "14px 16px", borderRadius: 10, cursor: "pointer",
                    background: isSelected ? "rgba(37,99,235,0.18)" : "rgba(15,23,42,0.8)",
                    border: `1px solid ${isSelected ? "rgba(59,130,246,0.55)" : "rgba(255,255,255,0.07)"}`,
                    transition: "all 0.15s",
                    boxShadow: isSelected ? "0 0 0 2px rgba(59,130,246,0.2)" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#f8fafc", lineHeight: 1.3, flex: 1, marginRight: 8 }}>
                      {j.title}
                    </p>
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.25)", whiteSpace: "nowrap", fontWeight: 600, flexShrink: 0 }}>
                      {cat}
                    </span>
                  </div>
                  <p style={{ margin: "2px 0 6px", fontSize: 12, color: "#60a5fa", fontWeight: 600 }}>{j.company}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>
                    {j.location} · {j.job_type} · {j.experience_required}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                    {j.required_skills.slice(0, 4).map((s) => (
                      <span key={s} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}>{s}</span>
                    ))}
                    {j.required_skills.length > 4 && (
                      <span style={{ fontSize: 10, color: "#475569" }}>+{j.required_skills.length - 4} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected job info bar */}
        {selectedJob && (
          <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(37,99,235,0.1)", borderRadius: 8, border: "1px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#93c5fd" }}>Selected:</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc" }}>{selectedJob.title}</span>
            <span style={{ fontSize: 12, color: "#60a5fa" }}>@ {selectedJob.company}</span>
            <span style={{ fontSize: 11, color: "#475569", marginLeft: "auto" }}>{selectedJob.salary_range}</span>
          </div>
        )}
      </div>

      {matchError && (
        <div style={{ color: "#ef4444", marginBottom: 20 }}>Error: {matchError}</div>
      )}

      {/* Results */}
      {matchResult && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Match Score Card */}
          <div style={{ background: "#1e293b", padding: 24, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#60a5fa" }}>
              Fit Assessment Results
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "20px 0" }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "radial-gradient(circle, #2563eb, #1d4ed8)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, fontWeight: 800, color: "#fff",
                boxShadow: "0 0 16px rgba(37,99,235,0.5)",
              }}>
                {matchResult.overall_match_score}%
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>{matchResult.role_title}</h3>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: 13 }}>{matchResult.company}</p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5 }}>
              {matchResult.summary_reasoning}
            </p>

            <div style={{ marginTop: 20 }}>
              <h4 style={{ fontSize: 13, color: "#4ade80", margin: "0 0 8px" }}>Matched Skills:</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {matchResult.matched_skills.map((s) => (
                  <span key={s} style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#86efac", fontSize: 12, padding: "3px 8px", borderRadius: 6 }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {matchResult.missing_skills.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ fontSize: 13, color: "#f87171", margin: "0 0 8px" }}>Skill Gaps / Missing:</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {matchResult.missing_skills.map((s) => (
                    <span key={s} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", fontSize: 12, padding: "3px 8px", borderRadius: 6 }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tailored Materials Card */}
          {prepApp && (
            <div style={{ background: "#1e293b", padding: 24, borderRadius: 12, border: "1px solid rgba(59,130,246,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#60a5fa" }}>
                  Tailored Materials (HITL)
                </h2>
                <span style={{ background: "rgba(59,130,246,0.2)", color: "#93c5fd", fontSize: 11, padding: "4px 8px", borderRadius: 6, fontWeight: 600 }}>
                  Ready for Approval
                </span>
              </div>

              <div style={{ marginTop: 16 }}>
                <h4 style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tailored Summary</h4>
                <p style={{ fontSize: 13, color: "#e2e8f0", background: "#0f172a", padding: 12, borderRadius: 8, marginTop: 6, lineHeight: 1.5 }}>
                  "{prepApp.tailored_resume_summary}"
                </p>
              </div>

              <div style={{ marginTop: 16 }}>
                <h4 style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Personalized Cover Letter</h4>
                <pre style={{ fontSize: 12, color: "#cbd5e1", background: "#0f172a", padding: 12, borderRadius: 8, marginTop: 6, whiteSpace: "pre-wrap", fontFamily: "inherit", maxHeight: 180, overflowY: "auto" }}>
                  {prepApp.tailored_cover_letter}
                </pre>
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <a href="/approval" style={{ padding: "10px 18px", background: "#2563eb", color: "#fff", borderRadius: 8, fontWeight: 600, textDecoration: "none", fontSize: 13 }}>
                  Proceed to Approval Queue -&gt;
                </a>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
