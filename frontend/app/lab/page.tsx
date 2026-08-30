import type { Metadata } from "next";
import { ModelStatusCard } from "@/components/ModelStatusCard";

export const metadata: Metadata = {
  title: "AI Lab — KrishiLM",
  description: "Model architecture, training status, and technical details for KrishiLM.",
};

const MODEL_CARDS = [
  {
    label: "Model Name",
    value: "KrishiLM",
    description: "Domain-specific LM for Indian agriculture",
    highlight: true,
  },
  {
    label: "Architecture",
    value: "Transformer",
    description: "Decoder-only (GPT-style), built from scratch in PyTorch",
  },
  {
    label: "Parameters",
    value: "Not trained yet",
    description: "Target: ~10M–100M params (configurable via KrishiLMConfig)",
  },
  {
    label: "Training Status",
    value: "Not started",
    description: "Waiting for: data collection -> tokenizer -> model -> training",
  },
  {
    label: "Dataset",
    value: "Not available yet",
    description: "Will use Indian agriculture text in Hindi + English (JSONL format)",
  },
  {
    label: "Tokenizer",
    value: "SentencePiece",
    description: "Planned: BPE with vocab_size=32,000, multilingual support",
  },
];

const PIPELINE_STEPS = [
  { step: "01", title: "Data Collection", desc: "Collect agricultural text from ICAR, Krishi Jagran, AgriStack", done: false },
  { step: "02", title: "Tokenizer Training", desc: "Train SentencePiece BPE tokenizer on raw corpus", done: false },
  { step: "03", title: "Dataset Pipeline", desc: "Implement AgricultureDataset + DataLoader in ml/data/", done: false },
  { step: "04", title: "Model Architecture", desc: "Implement Transformer blocks in ml/model/transformer.py", done: false },
  { step: "05", title: "Training Loop", desc: "Implement Trainer with AdamW + cosine LR schedule", done: false },
  { step: "06", title: "Evaluation", desc: "Run Evaluator — compute perplexity on held-out test set", done: false },
  { step: "07", title: "Inference Integration", desc: "Plug KrishiInference into FastAPI ml_service.py", done: false },
];

export default function AILabPage() {
  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Page Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#e2f0e4" }}>AI Lab</h1>
          <span className="badge-mock">v0.1.0 Scaffold</span>
        </div>
        <p style={{ margin: 0, color: "#4b6b50", fontSize: 15, maxWidth: 560 }}>
          Model architecture, training pipeline status, and technical specifications for KrishiLM.
          All values are placeholders — update as you implement each component.
        </p>
      </div>

      {/* Model Stats Grid */}
      <section aria-labelledby="model-stats-heading">
        <h2
          id="model-stats-heading"
          style={{ fontSize: 13, color: "#4b6b50", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}
        >
          Model Overview
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
            marginBottom: 40,
          }}
        >
          {MODEL_CARDS.map((card) => (
            <ModelStatusCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      {/* Architecture Diagram */}
      <section aria-labelledby="arch-heading" style={{ marginBottom: 40 }}>
        <h2
          id="arch-heading"
          style={{ fontSize: 13, color: "#4b6b50", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}
        >
          Architecture — Decoder-only Transformer
        </h2>
        <div className="glass-card" style={{ padding: "28px 32px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: "var(--font-mono)", fontSize: 13, color: "#6b8f72" }}>
            {[
              { label: "Input", note: "Token IDs from KrishiTokenizer",       color: "#6b8f72" },
              { label: "Token Embedding", note: "nn.Embedding(32000, d_model)", color: "#8aad8e" },
              { label: "Positional Encoding", note: "Sinusoidal PE",           color: "#8aad8e" },
              { label: "Transformer Block × N", note: "N = 6 (configurable)",  color: "#a3d9a5" },
              { label: "  └ LayerNorm + Multi-Head Self-Attention", note: "n_heads = 8", color: "#4ade80" },
              { label: "  └ LayerNorm + Feed-Forward Network",      note: "d_ff = 1024",  color: "#4ade80" },
              { label: "Final LayerNorm", note: "",                             color: "#8aad8e" },
              { label: "LM Head", note: "Linear(d_model, vocab_size)",         color: "#a3d9a5" },
              { label: "Output", note: "Logits → softmax → next token",        color: "#6b8f72" },
            ].map(({ label, note, color }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid rgba(34,197,94,0.05)" }}>
                <span style={{ color }}>{label}</span>
                {note && <span style={{ color: "#3a5c3e", fontSize: 11 }}>{note}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Training Roadmap */}
      <section aria-labelledby="roadmap-heading">
        <h2
          id="roadmap-heading"
          style={{ fontSize: 13, color: "#4b6b50", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}
        >
          Training Roadmap
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PIPELINE_STEPS.map(({ step, title, desc, done }) => (
            <div
              key={step}
              className="glass-card"
              style={{
                padding: "16px 20px",
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                borderColor: done ? "rgba(34,197,94,0.3)" : "rgba(34,197,94,0.08)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: done ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.05)",
                  border: `1px solid ${done ? "rgba(34,197,94,0.4)" : "rgba(34,197,94,0.1)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: done ? "#4ade80" : "#3a5c3e",
                  fontFamily: "var(--font-mono)",
                  flexShrink: 0,
                }}
              >
                {done ? "✓" : step}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#a3d9a5", marginBottom: 3 }}>
                  {title}
                </div>
                <div style={{ fontSize: 12, color: "#4b6b50" }}>{desc}</div>
              </div>
              <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                <span className="badge-not-started">
                  {done ? "Done" : "Pending"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
