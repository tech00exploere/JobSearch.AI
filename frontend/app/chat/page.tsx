"use client";

import { useState, useRef, useEffect, useId } from "react";
import Link from "next/link";
import { sendChatMessage, type ChatResponse, type ToolCallBadge } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallBadge[];
}

const SUGGESTED_QUESTIONS = [
  "Find me React and Node.js internships in India",
  "Find Software Engineer roles requiring Python and FastAPI",
  "Track my active job applications",
  "Show me jobs with 85%+ match for my profile",
];

export default function ChatPage() {
  const uid = useId();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: `${uid}-welcome`,
      role: "assistant",
      content:
        "**Namaste! I am JobSearch.ai**, your dedicated Job Search & Application Agent.\n\n" +
        "I discover relevant jobs, analyze job descriptions, calculate deterministic fit scores against your master resume, " +
        "generate non-hallucinated tailored application materials, and prepare applications for your **Human Approval**.",
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/health")
      .then((r) => r.ok)
      .then(setBackendOk)
      .catch(() => setBackendOk(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function handleSend(text?: string) {
    const messageText = (text ?? input).trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: `${uid}-user-${Date.now()}`,
      role: "user",
      content: messageText,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await sendChatMessage(messageText);
      const assistantMessage: Message = {
        id: `${uid}-ai-${Date.now()}`,
        role: "assistant",
        content: response.response,
        toolCalls: response.tool_calls,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${uid}-err-${Date.now()}`,
          role: "assistant",
          content:
            "Could not reach the JobSearch.ai backend. Make sure FastAPI is running at http://localhost:8000.",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0b0f19" }}>
      {/* Header */}
      <header
        style={{
          padding: "16px 28px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#0f172a",
          flexShrink: 0,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
            JobSearch.ai Assistant
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
            Conversational Job Search & Application Agent
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link
            href="/approval"
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              background: "rgba(59,130,246,0.2)",
              border: "1px solid rgba(59,130,246,0.4)",
              color: "#60a5fa",
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            HITL Queue
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: backendOk === null ? "#94a3b8" : backendOk ? "#22c55e" : "#ef4444",
                boxShadow: backendOk ? "0 0 8px rgba(34,197,94,0.6)" : "none",
              }}
            />
            <span style={{ fontSize: 12, color: "#64748b" }}>
              {backendOk === null ? "Connecting..." : backendOk ? "Backend Online" : "Backend Offline"}
            </span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {/* Tool Badges */}
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                {msg.toolCalls.map((t, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: "rgba(30, 41, 59, 0.8)",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      color: "#93c5fd",
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    ⚙️ <strong>{t.tool_name}()</strong>: {t.action_summary}
                  </span>
                ))}
              </div>
            )}

            {/* Message Bubble */}
            <div
              style={{
                maxWidth: "85%",
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                background: msg.role === "user" ? "#1d4ed8" : "#1e293b",
                color: "#f8fafc",
                padding: "14px 18px",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                fontSize: 14,
                lineHeight: 1.6,
                border: msg.role === "user" ? "none" : "1px solid rgba(255,255,255,0.08)",
                whiteSpace: "pre-wrap",
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ color: "#60a5fa", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="spinner">⚙️</span> JobSearch.ai Agent is searching jobs & calculating fit...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length <= 1 && !isLoading && (
        <div style={{ padding: "0 28px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleSend(q)}
              style={{
                padding: "6px 14px",
                background: "rgba(30, 41, 59, 0.6)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: 8,
                color: "#93c5fd",
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div
        style={{
          padding: "16px 28px 24px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          background: "#0f172a",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about software jobs, match score, or application status..."
            rows={2}
            disabled={isLoading}
            style={{
              flex: 1,
              background: "#1e293b",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "12px 16px",
              color: "#f8fafc",
              fontSize: 14,
              resize: "none",
              outline: "none",
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            style={{
              padding: "14px 22px",
              background: "#2563eb",
              border: "none",
              borderRadius: 10,
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: !input.trim() || isLoading ? "not-allowed" : "pointer",
              opacity: !input.trim() || isLoading ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
