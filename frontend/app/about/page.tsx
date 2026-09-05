import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — KrishiLM",
  description: "About KrishiLM — a learning-focused ML/DL project for Indian agriculture.",
};

const TECH_STACK = [
  { layer: "Frontend",   tech: "Next.js 14 + TypeScript + Tailwind CSS" },
  { layer: "Backend",    tech: "Python 3.11 + FastAPI + Uvicorn + Pydantic" },
  { layer: "ML/DL",      tech: "PyTorch 2.x + NumPy (custom Transformer)" },
  { layer: "Tokenizer",  tech: "SentencePiece BPE (vocab 32K, Hindi+English)" },
  { layer: "Database",   tech: "PostgreSQL (minimal, future use)" },
  { layer: "Container",  tech: "Docker + Docker Compose" },
];


const ML_CONCEPTS = [
  { topic: "Tokenization",         desc: "Convert text to integers via BPE/SentencePiece" },
  { topic: "Token Embeddings",     desc: "Map token IDs to dense vectors (nn.Embedding)" },
  { topic: "Positional Encoding",  desc: "Inject word-order information with sinusoids" },
  { topic: "Multi-Head Attention", desc: "Scaled dot-product attention across h parallel heads" },
  { topic: "Feed-Forward Network", desc: "2-layer MLP with GELU activation at each position" },
  { topic: "Transformer Blocks",   desc: "Stack of N identical Attention + FFN layers" },
  { topic: "Language Model Head",  desc: "Linear projection to vocab logits + softmax" },
  { topic: "Training Loop",        desc: "AdamW optimizer, cross-entropy loss, gradient clipping" },
  { topic: "Text Generation",      desc: "Top-P nucleus sampling with temperature scaling" },
];

export default function AboutPage() {
  return (
    <div style={{ padding: "32px 40px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#e2f0e4" }}>About KrishiLM</h1>
        </div>
        <p style={{ margin: 0, color: "#6b8f72", fontSize: 16, lineHeight: 1.7, maxWidth: 680 }}>
          KrishiLM is a <strong style={{ color: "#a3d9a5" }}>learning-focused ML/DL project</strong> —
          the goal is to build a domain-specific language model for Indian agriculture completely from scratch,
          without relying on any external AI API or pretrained model.
        </p>
      </div>

      {/* Mission */}
      <section aria-labelledby="mission-heading" style={{ marginBottom: 40 }}>
        <div className="glass-card" style={{ padding: "28px 32px", borderColor: "rgba(34,197,94,0.2)" }}>
          <h2 id="mission-heading" style={{ margin: "0 0 14px", fontSize: 18, color: "#4ade80", fontWeight: 700 }}>
            Mission
          </h2>

          <p style={{ margin: "0 0 16px", color: "#8aad8e", lineHeight: 1.7 }}>
            India has over 600 million farmers. Access to reliable, timely agricultural information
            in local languages can meaningfully improve crop yield, reduce pesticide overuse, and
            improve farmers&apos; livelihoods.
          </p>
          <p style={{ margin: 0, color: "#8aad8e", lineHeight: 1.7 }}>
            KrishiLM aims to be a small, open, specialized model that anyone can run locally —
            trained on Indian agriculture knowledge in Hindi and English.
          </p>
        </div>
      </section>

      {/* Tech Stack */}
      <section aria-labelledby="tech-heading" style={{ marginBottom: 40 }}>
        <h2
          id="tech-heading"
          style={{ fontSize: 13, color: "#4b6b50", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}
        >
          Tech Stack
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {TECH_STACK.map(({ layer, tech }) => (
            <div
              key={layer}
              className="stat-card"
              style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 20px" }}
            >
              <div>
                <div style={{ fontSize: 11, color: "#4b6b50", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{layer}</div>
                <div style={{ fontSize: 14, color: "#a3d9a5", fontWeight: 500 }}>{tech}</div>
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* ML Concepts */}
      <section aria-labelledby="concepts-heading" style={{ marginBottom: 40 }}>
        <h2
          id="concepts-heading"
          style={{ fontSize: 13, color: "#4b6b50", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}
        >
          ML Concepts You Will Implement
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 10,
          }}
        >
          {ML_CONCEPTS.map(({ topic, desc }, idx) => (
            <div
              key={topic}
              style={{
                padding: "14px 18px",
                background: "var(--color-surface-800)",
                border: "1px solid var(--color-border)",
                borderRadius: 10,
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: "rgba(34,197,94,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#4ade80",
                  fontFamily: "var(--font-mono)",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {String(idx + 1).padStart(2, "0")}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#a3d9a5", marginBottom: 3 }}>{topic}</div>
                <div style={{ fontSize: 12, color: "#4b6b50", lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/chat" className="btn-primary">Try Chat</Link>
        <Link href="/lab"  className="btn-secondary">View AI Lab</Link>
      </div>

    </div>
  );
}
