"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/career-intelligence");
    }
  }, [isAuthenticated, router]);

  // Initialize Google Identity Services (GSI) button exactly once
  useEffect(() => {
    if (typeof window === "undefined" || isAuthenticated) return;

    let isInitialized = false;

    const handleCredentialResponse = async (response: any) => {
      if (!response || !response.credential) {
        setError("No Google credential received.");
        return;
      }
      setIsLoggingIn(true);
      setError(null);
      try {
        await login(response.credential);
        router.push("/career-intelligence");
      } catch (err: any) {
        setError(err.message || "Google Sign-In failed. Please try again.");
      } finally {
        setIsLoggingIn(false);
      }
    };

    const initGsi = () => {
      if (isInitialized) return true;
      if ((window as any).google?.accounts?.id) {
        isInitialized = true;
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
        });

        const parent = document.getElementById("google-signin-button-container");
        if (parent) {
          parent.innerHTML = "";
          (window as any).google.accounts.id.renderButton(parent, {
            theme: "filled_blue",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            width: 320,
          });
        }
        return true;
      }
      return false;
    };

    // Try immediate initialization
    if (!initGsi()) {
      // Poll until script loads
      const timer = setInterval(() => {
        if (initGsi()) {
          clearInterval(timer);
        }
      }, 300);
      return () => clearInterval(timer);
    }
  }, [googleClientId, isAuthenticated, login, router]);

  return (
    <div style={{ minHeight: "85vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 16,
          padding: "40px 36px",
          maxWidth: 440,
          width: "100%",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          textAlign: "center",
        }}
      >
        {/* Logo & Header */}
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "center" }}>
          <img
            src="/logo.png"
            alt="JobSearch.ai"
            style={{ height: 48, borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
          />
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f8fafc", margin: "0 0 8px" }}>
          Welcome to JobSearch.ai
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 28px", lineHeight: 1.5 }}>
          Sign in with Google to access web-wide job discovery, candidate profile matching, and application tracking.
        </p>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#fca5a5",
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 20,
              textAlign: "left",
            }}
          >
            {error}
          </div>
        )}

        {/* Loading Spinner or Google Button Container */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, minHeight: 60 }}>
          {isLoggingIn ? (
            <div style={{ color: "#60a5fa", fontWeight: 600, padding: 12 }}>
              Authenticating candidate session...
            </div>
          ) : (
            <div id="google-signin-button-container" style={{ display: "flex", justifyContent: "center", width: "100%" }} />
          )}
        </div>

        {/* Direct Privacy Policy Link directly below Google Auth Button */}
        <div style={{ marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, color: "#94a3b8" }}>
          <span>🔒</span>
          <span>Read our</span>
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#60a5fa", fontWeight: 600, textDecoration: "underline" }}
          >
            Privacy Policy
          </Link>
        </div>

        {/* Client ID Warning Notice if default */}
        {googleClientId.includes("YOUR_GOOGLE_CLIENT_ID") && (
          <div
            style={{
              marginTop: 24,
              padding: 12,
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 8,
              color: "#fbbf24",
              fontSize: 12,
              textAlign: "left",
              lineHeight: 1.5,
            }}
          >
            <strong>Setup Notice:</strong> Set <code style={{ background: "#0f172a", padding: "2px 4px", borderRadius: 4 }}>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in Vercel to enable your custom Google OAuth app.
          </div>
        )}

        {/* Terms / Disclaimer */}
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 12, color: "#64748b" }}>
          By signing in, you confirm that you agree to JobSearch.ai&apos;s data handling practices as outlined in the{" "}
          <Link href="/privacy" style={{ color: "#93c5fd", textDecoration: "none", fontWeight: 500 }}>
            Privacy Policy
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
