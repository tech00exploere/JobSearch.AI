interface ModelStatusCardProps {
  label: string;
  value: string;
  icon?: string;
  description?: string;
  highlight?: boolean;
}

export function ModelStatusCard({
  label,
  value,
  icon,
  description,
  highlight = false,
}: ModelStatusCardProps) {
  return (
    <div
      className="stat-card"
      style={{
        borderColor: highlight ? "rgba(34,197,94,0.25)" : undefined,
        background: highlight ? "rgba(17,28,21,0.9)" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        {icon && (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(34,197,94,0.08)",
              border: "1px solid rgba(34,197,94,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            {icon}
          </div>
        )}
        <span className="badge-not-started">Scaffold</span>
      </div>


      <div style={{ fontSize: 12, color: "#4b6b50", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#a3d9a5", marginBottom: description ? 8 : 0 }}>
        {value}
      </div>
      {description && (
        <div style={{ fontSize: 12, color: "#4b6b50", lineHeight: 1.5 }}>
          {description}
        </div>
      )}
    </div>
  );
}
