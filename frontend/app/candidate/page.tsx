"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CandidatePageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/profile");
  }, [router]);

  return (
    <div style={{ padding: 40, color: "#94a3b8", textAlign: "center" }}>
      Loading candidate profile...
    </div>
  );
}
