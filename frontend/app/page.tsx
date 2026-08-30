"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getApplications, type ApplicationRecord } from "@/lib/api";

const PIPELINE_STEPS = [
  { label: "Discover", desc: "Find relevant jobs" },
  { label: "Analyze", desc: "JD fit scoring" },
  { label: "Match", desc: "Resume alignment" },
  { label: "Prepare", desc: "Tailored materials" },
  { label: "Review", desc: "HITL approval" },
  { label: "Submit", desc: "Apply safely" },
];

const FEATURE_CARDS = [
  {
    num: "01",
    title: "Job Search Agent",
    desc: "Discovers, filters, and ranks jobs matching your target background and location.",
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
    title: "Human-in-the-Loop",
    desc: "Safety-first: AI prepares applications, but only an explicit [Apply] click submits them.",
    accent: "#f59e0b",
  },
];

export default function OverviewPage() {
  const [apps, setApps] = useState<ApplicationRecord[]>([]);

  useEffect(() => {
    getApplications().then(setApps).catch(() => {});
  }, []);

  const totalApps = apps.length;
  const pending = apps.filter((a) => a.status === "Prepared").length;
  const submitted = apps.filter((a) => a.status === "Submitted" || a.status === "Handoff").length;
  const avgScore =
    apps.length > 0
      ? Math.round(apps.reduce((sum, a) => sum + (a.match_score || 0), 0) / apps.length)
      : 0;

  const kpiCards = [
    { label: "Tracked Applications", value: totalApps, sub: "Total in database", color: "#93c5fd", accent: "rgba(59,130,246,0.15)" },
    { label: "Pending HITL Review", value: pending, sub: "Awaiting your approval", color: "#fde047", accent: "rgba(251,191,36,0.12)" },
    { label: "Successfully Submitted", value: submitted, sub: "Sent to employers", color: "#86efac", accent: "rgba(34,197,94,0.12)" },
    { label: "Avg. Match Score", value: apps.length > 0 ? `${avgScore}%` : "--", sub: "Across all applications", color: "#c084fc", accent: "rgba(168,85,247,0.12)" },
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
          Your AI-Powered Job Search & Application Agent
        </p>
        <p style={{ fontSize: 14, color: "#64748b", maxWidth: 680, margin: "0 auto 28px", lineHeight: 1.7 }}>
          An agentic AI platform that discovers relevant jobs, evaluates resume fit via deterministic scoring,
          generates non-hallucinated tailored materials, and prepares applications for{" "}
          <strong style={{ color: "#93c5fd" }}>Human-Approved Submission</strong>.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
          <Link
            href="/chat"
            style={{ padding: "12px 26px", background: "#2563eb", color: "#fff", borderRadius: 9, fontWeight: 700, textDecoration: "none", fontSize: 14, boxShadow: "0 4px 16px rgba(37,99,235,0.35)" }}
          >
            Launch AI Agent Chat
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
                  background: i < submitted + 1 ? "rgba(59,130,246,0.25)" : "rgba(30,41,59,1)",
                  border: `2px solid ${i < submitted + 1 ? "#3b82f6" : "rgba(255,255,255,0.1)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800,
                  color: i < submitted + 1 ? "#93c5fd" : "#475569",
                  zIndex: 1, position: "relative",
                  boxShadow: i < submitted + 1 ? "0 0 12px rgba(59,130,246,0.3)" : "none",
                }}>
                  {i + 1}
                </div>
                <div style={{ marginTop: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: i < submitted + 1 ? "#e2e8f0" : "#475569" }}>{step.label}</div>
                  <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{step.desc}</div>
                </div>
              </div>
              {/* Connector line */}
              {i < PIPELINE_STEPS.length - 1 && (
                <div style={{
                  flex: "0 0 auto", width: 40, height: 2, marginTop: 17,
                  background: i < submitted ? "#3b82f6" : "rgba(255,255,255,0.08)",
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
