import { type ChatResponse } from "@/lib/api";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  status?: ChatResponse["status"];
}

export function ChatMessage({ role, content, status }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className="animate-fade-in-up"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        gap: 4,
      }}
    >
      {/* Sender label */}
      <div
        style={{
          fontSize: 11,
          color: "#4b6b50",
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          padding: "0 4px",
        }}
      >
        {isUser ? "You" : "KrishiLM"}
      </div>

      {/* Bubble */}
      <div className={isUser ? "message-user" : "message-ai"}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: isUser ? "#d4edda" : "#c8deca" }}>
          {content}
        </p>
      </div>

      {/* Mock badge for AI messages */}
      {!isUser && status === "mock" && (
        <div style={{ padding: "0 4px" }}>
          <span className="badge-mock">Mock Response</span>
        </div>
      )}

    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
      <div style={{ fontSize: 11, color: "#4b6b50", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", padding: "0 4px" }}>
        KrishiLM
      </div>
      <div
        className="message-ai"
        style={{ display: "flex", alignItems: "center", gap: 5, padding: "14px 18px" }}
      >
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}
