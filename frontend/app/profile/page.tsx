"use client";

import { useState, useEffect } from "react";
import { getMasterResume, updateMasterResume, uploadResumeFile } from "@/lib/api";

interface PersonalInfo {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  github: string;
  linkedin: string;
  internshala_profile?: string;
}

interface Project {
  id: string;
  name: string;
  tagline: string;
  technologies: string[];
  highlights: string[];
}

interface Experience {
  id: string;
  company: string;
  role: string;
  location: string;
  period: string;
  highlights: string[];
}

interface Education {
  degree: string;
  institution: string;
  year: string;
  details: string;
}

export default function ProfilePage() {
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    github: "",
    linkedin: "",
    internshala_profile: "",
  });
  const [summary, setSummary] = useState<string>("");
  const [skills, setSkills] = useState<Record<string, string[]>>({
    languages: [],
    frontend: [],
    backend: [],
    ai_ml: [],
    databases: [],
    devops_tools: [],
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [experience, setExperience] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [pdfStored, setPdfStored] = useState<boolean>(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage(null);

    try {
      const res = await uploadResumeFile(file);
      if (res && res.parsed_data) {
        const data = res.parsed_data;
        setPersonalInfo(data.personal_info || {});
        setSummary(data.summary || "");
        setSkills(data.skills || {});
        setProjects(data.projects || []);
        setExperience(data.experience || []);
        setEducation(data.education || []);
        if (res.pdf_stored) setPdfStored(true);
        setMessage({
          text: "Resume uploaded and parsed by Affinda AI! Review the details below and click 'Save Candidate Profile' to lock them in.",
          type: "success"
        });
      } else {
        throw new Error("No parsed data returned from API.");
      }
    } catch (err: any) {
      setMessage({
        text: err.message || "Failed to upload and parse resume file.",
        type: "error"
      });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };


  useEffect(() => {
    loadProfile();
    // Check if a PDF is already stored on the server
    fetch("http://localhost:8000/api/resume/pdf", { method: "HEAD" })
      .then((r) => { if (r.ok) setPdfStored(true); })
      .catch(() => {});
  }, []);



  const loadProfile = () => {
    setIsLoading(true);
    getMasterResume()
      .then((data: any) => {
        if (data) {
          setPersonalInfo(data.personal_info || {});
          setSummary(data.summary || "");
          setSkills(data.skills || {});
          setProjects(data.projects || []);
          setExperience(data.experience || []);
          setEducation(data.education || []);
        }
      })
      .catch((err) => {
        setMessage({ text: "Failed to load master resume profile.", type: "error" });
        console.error(err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const fullResume = {
        personal_info: personalInfo,
        summary,
        skills,
        projects,
        experience,
        education,
      };
      await updateMasterResume(fullResume);
      setMessage({ text: "Candidate profile successfully updated and re-indexed!", type: "success" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to update candidate profile.", type: "error" });
    }
  };

  const updatePersonalInfoField = (field: keyof PersonalInfo, value: string) => {
    setPersonalInfo((prev) => ({ ...prev, [field]: value }));
  };

  const updateSkillCategory = (category: string, value: string) => {
    const arr = value.split(",").map((s) => s.trim()).filter((s) => s !== "");
    setSkills((prev) => ({ ...prev, [category]: arr }));
  };

  // Add / Edit / Delete Helpers for Lists
  const addProject = () => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: "New Project",
      tagline: "Brief tagline describing the project",
      technologies: ["React", "Node.js"],
      highlights: ["Implemented key feature achieving X%", "Designed database schemas"],
    };
    setProjects((prev) => [...prev, newProj]);
  };

  const removeProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const updateProjectField = (index: number, field: keyof Project, value: any) => {
    setProjects((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addExperience = () => {
    const newExp: Experience = {
      id: `exp-${Date.now()}`,
      company: "Company Name",
      role: "Software Intern",
      location: "Location",
      period: "Jan 2024 - Present",
      highlights: ["Developed enterprise features", "Collaborated in Agile sprints"],
    };
    setExperience((prev) => [...prev, newExp]);
  };

  const removeExperience = (id: string) => {
    setExperience((prev) => prev.filter((e) => e.id !== id));
  };

  const updateExperienceField = (index: number, field: keyof Experience, value: any) => {
    setExperience((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addEducation = () => {
    const newEdu: Education = {
      degree: "Degree / Program",
      institution: "University / Institution",
      year: "2021 - 2025",
      details: "Grade / Focus area details",
    };
    setEducation((prev) => [...prev, newEdu]);
  };

  const removeEducation = (index: number) => {
    setEducation((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEducationField = (index: number, field: keyof Education, value: string) => {
    setEducation((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  if (isLoading) {
    return (
      <div style={{ padding: 32, color: "#94a3b8", maxWidth: 900, margin: "0 auto" }}>
        <p>Loading candidate profile details...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, color: "#f8fafc", maxWidth: 950, margin: "0 auto" }}>
      <header style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#93c5fd" }}>
            👤 Candidate Profile & Master Resume
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 14, margin: "6px 0 0" }}>
            View and manage your master resume details. This profile is used by the RAG engine to tailormake application materials.
          </p>
        </div>
      </header>

      {/* Resume File Section */}
      <section className="glass-card" style={{ padding: 24, background: "rgba(30,41,59,0.5)", borderRadius: 12, border: "1px dashed rgba(59,130,246,0.3)", marginBottom: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px", color: "#60a5fa" }}>
          Resume File
        </h3>
        <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 18px", maxWidth: 560 }}>
          Upload your resume (PDF or TXT). Affinda AI parses it and auto-fills your profile below. PDFs are also stored on the server so they can be attached to application emails.
        </p>

        {/* Current PDF status card */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
          background: "#0f172a", borderRadius: 10, marginBottom: 16,
          border: pdfStored ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(255,255,255,0.07)"
        }}>
          <div style={{ flex: 1, textAlign: "left" }}>

            {pdfStored ? (
              <>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#f8fafc" }}>resume.pdf</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6ee7b7" }}>Stored — used for application emails and matching</p>
              </>
            ) : (
              <>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#94a3b8" }}>No resume PDF uploaded yet</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>Upload a PDF to store it for application emails and preview</p>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
            {pdfStored && (
              <a
                href="http://localhost:8000/api/resume/pdf"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "8px 16px",
                  background: "rgba(16,185,129,0.12)",
                  border: "1px solid rgba(16,185,129,0.35)",
                  color: "#6ee7b7",
                  borderRadius: 6, fontSize: 13, fontWeight: 600,
                  textDecoration: "none", whiteSpace: "nowrap",
                }}
              >
                View PDF
              </a>
            )}

            {/* Upload / Replace button */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                disabled={isUploading}
                style={{
                  padding: "8px 16px",
                  background: isUploading ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.15)",
                  border: "1px solid rgba(59,130,246,0.4)",
                  color: "#93c5fd",
                  borderRadius: 6, fontSize: 13, fontWeight: 600,
                  cursor: isUploading ? "not-allowed" : "pointer", whiteSpace: "nowrap",
                }}
              >
                {isUploading ? "Parsing..." : pdfStored ? "Replace PDF" : "Upload PDF"}
              </button>
              <input
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileUpload}
                disabled={isUploading}
                style={{
                  position: "absolute", top: 0, left: 0,
                  width: "100%", height: "100%", opacity: 0,
                  cursor: isUploading ? "not-allowed" : "pointer"
                }}
              />
            </div>
          </div>
        </div>

        <p style={{ color: "#475569", fontSize: 12, margin: 0, textAlign: "center" }}>
          TXT/MD files are only parsed to fill your profile — only PDF files are saved to the server.
        </p>
      </section>


      {message && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 24,
            border: message.type === "success" ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)",
            background: message.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            color: message.type === "success" ? "#86efac" : "#fca5a5",
            fontSize: 14,
          }}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {/* Section 1: Personal Details */}
        <section className="glass-card" style={{ padding: 24, background: "#1e293b", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 18, color: "#60a5fa", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 10 }}>
            Contact & Personal Info
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>Full Name</label>
              <input
                type="text"
                value={personalInfo.name || ""}
                onChange={(e) => updatePersonalInfoField("name", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#f8fafc" }}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>Professional Title</label>
              <input
                type="text"
                value={personalInfo.title || ""}
                onChange={(e) => updatePersonalInfoField("title", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#f8fafc" }}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>Email Address</label>
              <input
                type="email"
                value={personalInfo.email || ""}
                onChange={(e) => updatePersonalInfoField("email", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#f8fafc" }}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>Phone Number</label>
              <input
                type="text"
                value={personalInfo.phone || ""}
                onChange={(e) => updatePersonalInfoField("phone", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#f8fafc" }}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>Location (e.g. Remote, India)</label>
              <input
                type="text"
                value={personalInfo.location || ""}
                onChange={(e) => updatePersonalInfoField("location", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#f8fafc" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>GitHub Username/URL</label>
              <input
                type="text"
                value={personalInfo.github || ""}
                onChange={(e) => updatePersonalInfoField("github", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#f8fafc" }}
              />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>LinkedIn Profile URL</label>
              <input
                type="text"
                value={personalInfo.linkedin || ""}
                onChange={(e) => updatePersonalInfoField("linkedin", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#f8fafc" }}
              />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>
                Internshala Profile URL
                <span style={{ fontSize: 10, background: "rgba(249,115,22,0.12)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.3)", padding: "1px 7px", borderRadius: 8, fontWeight: 600 }}>
                  Internshala
                </span>
              </label>
              <input
                type="text"
                value={personalInfo.internshala_profile || ""}
                onChange={(e) => updatePersonalInfoField("internshala_profile", e.target.value)}
                placeholder="https://internshala.com/student/profile/your-id"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "#0f172a", border: "1px solid rgba(249,115,22,0.2)", color: "#f8fafc" }}
              />
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b" }}>
                Saved here so JobSetu can reference it when preparing Internshala applications. No password needed.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Summary */}
        <section className="glass-card" style={{ padding: 24, background: "#1e293b", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 18, color: "#60a5fa", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 10 }}>
            Professional Summary
          </h2>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>Brief overview of your expertise</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#f8fafc", fontFamily: "inherit" }}
              required
            />
          </div>
        </section>

        {/* Section 3: Skills */}
        <section className="glass-card" style={{ padding: 24, background: "#1e293b", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 18, color: "#60a5fa", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 10 }}>
            Technical Skills (comma-separated lists)
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { label: "Programming Languages", key: "languages" },
              { label: "Frontend Technologies", key: "frontend" },
              { label: "Backend Technologies", key: "backend" },
              { label: "AI & Machine Learning", key: "ai_ml" },
              { label: "Databases", key: "databases" },
              { label: "DevOps & Tools", key: "devops_tools" },
            ].map((skillCat) => (
              <div key={skillCat.key}>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>{skillCat.label}</label>
                <input
                  type="text"
                  value={(skills[skillCat.key] || []).join(", ")}
                  onChange={(e) => updateSkillCategory(skillCat.key, e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 6, background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", color: "#f8fafc" }}
                  placeholder="e.g. React, Next.js, Node.js"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Projects */}
        <section className="glass-card" style={{ padding: 24, background: "#1e293b", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 10, marginBottom: 18 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#60a5fa" }}>Projects</h2>
            <button
              type="button"
              onClick={addProject}
              style={{ padding: "6px 12px", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
            >
              + Add Project
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {projects.map((proj, idx) => (
              <div key={proj.id} style={{ border: "1px solid rgba(255,255,255,0.05)", padding: 16, borderRadius: 8, background: "rgba(15,23,42,0.4)", position: "relative" }}>
                <button
                  type="button"
                  onClick={() => removeProject(proj.id)}
                  style={{ position: "absolute", top: 12, right: 12, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", padding: "4px 8px", borderRadius: 4, fontSize: 11, cursor: "pointer" }}
                >
                  Remove
                </button>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Project Name</label>
                    <input
                      type="text"
                      value={proj.name}
                      onChange={(e) => updateProjectField(idx, "name", e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 4, background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc", fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Tagline</label>
                    <input
                      type="text"
                      value={proj.tagline}
                      onChange={(e) => updateProjectField(idx, "tagline", e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 4, background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc", fontSize: 13 }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Technologies used (comma-separated)</label>
                  <input
                    type="text"
                    value={proj.technologies.join(", ")}
                    onChange={(e) => updateProjectField(idx, "technologies", e.target.value.split(",").map(t => t.trim()))}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 4, background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc", fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Bullet Highlights (one per line)</label>
                  <textarea
                    value={proj.highlights.join("\n")}
                    onChange={(e) => updateProjectField(idx, "highlights", e.target.value.split("\n"))}
                    rows={3}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 4, background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc", fontSize: 13, fontFamily: "inherit" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Work Experience */}
        <section className="glass-card" style={{ padding: 24, background: "#1e293b", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 10, marginBottom: 18 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#60a5fa" }}>Work Experience / Internships</h2>
            <button
              type="button"
              onClick={addExperience}
              style={{ padding: "6px 12px", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
            >
              + Add Experience
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {experience.map((exp, idx) => (
              <div key={exp.id} style={{ border: "1px solid rgba(255,255,255,0.05)", padding: 16, borderRadius: 8, background: "rgba(15,23,42,0.4)", position: "relative" }}>
                <button
                  type="button"
                  onClick={() => removeExperience(exp.id)}
                  style={{ position: "absolute", top: 12, right: 12, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", padding: "4px 8px", borderRadius: 4, fontSize: 11, cursor: "pointer" }}
                >
                  Remove
                </button>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Company Name</label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => updateExperienceField(idx, "company", e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 4, background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc", fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Role Title</label>
                    <input
                      type="text"
                      value={exp.role}
                      onChange={(e) => updateExperienceField(idx, "role", e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 4, background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc", fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Work Period</label>
                    <input
                      type="text"
                      value={exp.period}
                      onChange={(e) => updateExperienceField(idx, "period", e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 4, background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc", fontSize: 13 }}
                      placeholder="e.g. Jan 2024 - Present"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Location</label>
                    <input
                      type="text"
                      value={exp.location}
                      onChange={(e) => updateExperienceField(idx, "location", e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 4, background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc", fontSize: 13 }}
                      placeholder="e.g. Remote, India"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Bullet Highlights (one per line)</label>
                  <textarea
                    value={exp.highlights.join("\n")}
                    onChange={(e) => updateExperienceField(idx, "highlights", e.target.value.split("\n"))}
                    rows={3}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 4, background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc", fontSize: 13, fontFamily: "inherit" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 6: Education */}
        <section className="glass-card" style={{ padding: 24, background: "#1e293b", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 10, marginBottom: 18 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#60a5fa" }}>Education</h2>
            <button
              type="button"
              onClick={addEducation}
              style={{ padding: "6px 12px", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
            >
              + Add Education
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {education.map((edu, idx) => (
              <div key={idx} style={{ border: "1px solid rgba(255,255,255,0.05)", padding: 16, borderRadius: 8, background: "rgba(15,23,42,0.4)", position: "relative" }}>
                <button
                  type="button"
                  onClick={() => removeEducation(idx)}
                  style={{ position: "absolute", top: 12, right: 12, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", padding: "4px 8px", borderRadius: 4, fontSize: 11, cursor: "pointer" }}
                >
                  Remove
                </button>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Degree / Branch</label>
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => updateEducationField(idx, "degree", e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 4, background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc", fontSize: 13 }}
                      placeholder="e.g. B.Tech Computer Science"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Institution Name</label>
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => updateEducationField(idx, "institution", e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 4, background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc", fontSize: 13 }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Years</label>
                    <input
                      type="text"
                      value={edu.year}
                      onChange={(e) => updateEducationField(idx, "year", e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 4, background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc", fontSize: 13 }}
                      placeholder="e.g. 2021 - 2025"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Additional Focus / Details</label>
                    <input
                      type="text"
                      value={edu.details}
                      onChange={(e) => updateEducationField(idx, "details", e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 4, background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc", fontSize: 13 }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Form Action Button */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 40 }}>
          <button
            type="submit"
            style={{
              padding: "12px 28px",
              background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
              border: "none",
              color: "#ffffff",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(59,130,246,0.4)",
              transition: "transform 0.15s ease",
            }}
          >
            Save Candidate Profile
          </button>
        </div>
      </form>
    </div>
  );
}
