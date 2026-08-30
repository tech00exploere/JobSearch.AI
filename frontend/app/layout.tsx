import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "JobSearch.ai — Your AI Job Search & Application Agent",
  description:
    "An agentic AI platform that discovers jobs, analyzes job descriptions, " +
    "calculates deterministic resume match scores, generates tailored application materials via Resume RAG, " +
    "and prepares applications for human-approved submission.",
  keywords: ["JobSearch.ai", "Job Application Agent", "AI Resume Matcher", "RAG", "Job Search Automation"],
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Sidebar />
        <main className="main-content">{children}</main>
      </body>
    </html>
  );
}
