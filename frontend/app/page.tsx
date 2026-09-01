"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getApplications, type ApplicationRecord } from "@/lib/api";

const PIPELINE_STEPS = [
  { label: "Discover", desc: "Multi-source web search" },
  { label: "Analyze", desc: "Gemini AI fit scoring" },
  { label: "Match", desc: "Resume alignment" },
  { label: "Rank", desc: "Freshness sorting" },
  { label: "Explore", desc: "Open real job URLs" },
  { label: "Track", desc: "Candidate-confirmed APPLIED" },
];

const FEATURE_CARDS = [
  {
    num: "01",
    title: "Web-Wide Job Discovery",
    desc: "Discovers and ranks job postings across ATS portals, company career sites, and public job boards.",
    accent: "#3b82f6",
  },
  {
    num: "02",
    title: "Deterministic Fit Score",
    desc: "Computes mathematically grounded skill coverage percentages, matched skills, and skill gaps.",
    accent: "#8b5cf6",
  },
  {
    num: "03",
    title: "Resume RAG & Tailoring",
    desc: "Retrieves master resume proof and writes non-hallucinated cover letters grounded in your actual experience.",
    accent: "#10b981",
  },
  {
    num: "04",
    title: "Candidate-Controlled Tracking",
    desc: "JobSetu opens the real external application site for you to apply, and you explicitly confirm your status.",
    accent: "#f59e0b",
  },
];

export default function OverviewPage() {
  const [apps, setApps] = useState<ApplicationRecord[]>([]);

  useEffect(() => {
    getApplications().then(setApps).catch(() => {});
  }, []);

  const totalApps = apps.length;
  const appliedCount = apps.filter((a) => a.status === "APPLIED").length;
  const savedCount = apps.filter((a) => a.status === "SAVED").length;
  const avgScore =
    apps.length > 0
      ? Math.round(apps.reduce((sum, a) => sum + (a.match_score || 0), 0) / apps.length)
      : 0;

  const kpiCards = [
    { label: "Tracked Applications", value: totalApps, sub: "Total in tracker database", color: "#93c5fd", accent: "rgba(59,130,246,0.15)" },
    { label: "Shortlisted / Saved", value: savedCount, sub: "Saved for candidate application", color: "#fde047", accent: "rgba(251,191,36,0.12)" },
    { label: "Confirmed Applied", value: appliedCount, sub: "Explicitly marked by candidate", color: "#86efac", accent: "rgba(34,197,94,0.12)" },
    { label: "Avg. Match Score", value: apps.length > 0 ? `${avgScore}%` : "--", sub: "Across all discoveries", color: "#c084fc", accent: "rgba(168,85,247,0.12)" },
  ];

  return (
    <div style={{ padding: "36px 40px", color: "#f8fafc", maxWidth: 1140, margin: "0 auto" }}>

      {/* Hero */}
      <section style={{ textAlign: "center", marginBottom: 48 }}>
        <img
          src="/logo.png"
          alt="JobSearch.ai Logo"
          style={{ maxWidth: 280, height: "auto", marginBottom: 20, display: "block", margin: "0 auto 20px" }}
        />
        <p style={{ fontSize: 16, color: "#60a5fa", margin: "0 0 12px", fontWeight: 600 }}>
          Web-Wide Job Discovery Engine &amp; Application Assistant
        </p>
        <p style={{ fontSize: 14, color: "#64748b", maxWidth: 680, margin: "0 auto 28px", lineHeight: 1.7 }}>
          An AI-powered web-wide job search engine that discovers real job openings across the public web,
          ranks them using your candidate profile, provides exact original URLs, and lets you personally apply.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
          <Link
            href="/career-intelligence"
            style={{ padding: "12px 26px", background: "#2563eb", color: "#fff", borderRadius: 9, fontWeight: 700, textDecoration: "none", fontSize: 14, boxShadow: "0 4px 16px rgba(37,99,235,0.35)" }}
          >
            Launch Web Job Discovery Engine
          </Link>
          <Link
            href="/match"
            style={{ padding: "12px 26px", background: "transparent", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.35)", borderRadius: 9, fontWeight: 600, textDecoration: "none", fontSize: 14 }}
          >
            Instant JD Matcher
          </Link>
        </div>
      </section>

      {/* KPI Cards */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {kpiCards.map((k) => (
            <div
              key={k.label}
              style={{
                background: k.accent,
                border: `1px solid ${k.color}30`,
                borderRadius: 14,
                padding: "22px 24px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ fontSize: 32, fontWeight: 800, color: k.color, lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}>
                {k.value}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginTop: 8 }}>{k.label}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pipeline Stepper */}
      <section style={{ marginBottom: 52 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>
          AI Workflow Pipeline
        </h2>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 0, overflowX: "auto", paddingBottom: 4 }}>
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.label} style={{ display: "flex", alignItems: "flex-start", flex: 1, minWidth: 100 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                {/* Circle */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: i < appliedCount + 1 ? "rgba(59,130,246,0.25)" : "rgba(30,41,59,1)",
                  border: `2px solid ${i < appliedCount + 1 ? "#3b82f6" : "rgba(255,255,255,0.1)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800,
                  color: i < appliedCount + 1 ? "#93c5fd" : "#475569",
                  zIndex: 1, position: "relative",
                  boxShadow: i < appliedCount + 1 ? "0 0 12px rgba(59,130,246,0.3)" : "none",
                }}>
                  {i + 1}
                </div>
                <div style={{ marginTop: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: i < appliedCount + 1 ? "#e2e8f0" : "#475569" }}>{step.label}</div>
                  <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{step.desc}</div>
                </div>
              </div>
              {/* Connector line */}
              {i < PIPELINE_STEPS.length - 1 && (
                <div style={{
                  flex: "0 0 auto", width: 40, height: 2, marginTop: 17,
                  background: i < appliedCount ? "#3b82f6" : "rgba(255,255,255,0.08)",
                }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Feature Cards */}
      <section>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>
          Platform Capabilities
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {FEATURE_CARDS.map((f) => (
            <div
              key={f.num}
              style={{
                background: "#151d2a",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14,
                padding: "22px 24px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: f.accent, letterSpacing: "0.08em", marginBottom: 10 }}>
                {f.num}
              </div>
              <h3 style={{ fontSize: 14, margin: "0 0 8px", color: "#e2e8f0", fontWeight: 700 }}>{f.title}</h3>
              <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, ${f.accent}60, transparent)`,
              }} />
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
