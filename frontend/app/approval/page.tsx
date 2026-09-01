"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ApprovalQueueRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/career-intelligence");
  }, [router]);

  return (
    <div style={{ padding: 40, color: "#94a3b8", textAlign: "center" }}>
      Redirecting to AI Web-Wide Job Discovery Engine...
    </div>
  );
}
