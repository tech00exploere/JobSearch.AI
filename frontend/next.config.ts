import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained .next/standalone build ONLY for Docker environments.
  // This prevents Vercel deployments (which package serverless natively) from failing.
  output: process.env.OUTPUT_STANDALONE === "true" ? "standalone" : undefined,

  /**
   * API Proxy — rewrites /api/* to the FastAPI backend.
   *
   * Local dev:   BACKEND_URL is not set -> defaults to http://localhost:8000
   * Production:  Set BACKEND_URL=https://your-backend.railway.app in Vercel env vars
   *
   * This proxy is used by the frontend server-side (SSR/API routes).
   * Browser-side calls also use /api/* which Vercel routes through this rewrite.
   */
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
