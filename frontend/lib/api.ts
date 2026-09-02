/**
 * JobSearch.ai Client — API Abstraction Layer
 * ==========================================
 * All REST API calls from the Next.js frontend to the FastAPI backend.
 */

export interface ToolCallBadge {
  tool_name: string;
  action_summary: string;
  status: "executing" | "completed" | "failed";
  result_snippet?: string;
}

export interface ChatResponse {
  response: string;
  tool_calls?: ToolCallBadge[];
  model: string;
  status: "mock" | "real";
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  job_type: string;
  salary_range: string;
  posted_date: string;
  description: string;
  required_skills: string[];
  preferred_skills: string[];
  experience_required: string;
  responsibilities: string[];
}

export interface JobMatchResult {
  job_id: string;
  role_title: string;
  company: string;
  overall_match_score: number;
  skill_coverage_percent: number;
  matched_skills: string[];
  missing_skills: string[];
  experience_verdict: string;
  summary_reasoning: string;
}

export interface PreparedApplication {
  application_id: string;
  job_id: string;
  company: string;
  role_title: string;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  tailored_resume_summary: string;
  tailored_cover_letter: string;
  status: "DISCOVERED" | "VIEWED" | "SAVED" | "PREPARED" | "APPLYING" | "APPLIED" | "INTERVIEW" | "REJECTED" | "OFFER" | "Prepared" | "Approved" | "Submitted" | "Skipped" | "Handoff";
  created_at: string;
  job_url?: string;
  application_url?: string;
  career_page_url?: string;
  source?: string;
}

export interface ApplicationRecord {
  application_id: string;
  job_id: string;
  company: string;
  role_title: string;
  match_score: number;
  status: "DISCOVERED" | "VIEWED" | "SAVED" | "PREPARED" | "APPLYING" | "APPLIED" | "INTERVIEW" | "REJECTED" | "OFFER" | "Saved" | "Analyzed" | "Prepared" | "Approved" | "Submitted" | "Interview" | "Offer" | "Rejected" | "Skipped" | "Handoff";
  updated_at: string;
  cover_letter_snippet?: string;
  job_url?: string;
  application_url?: string;
  career_page_url?: string;
  source?: string;
}

export interface HealthResponse {
  status: "ok" | "degraded" | "down";
  service: string;
  version: string;
}

// In production: set NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
// In local dev: leave unset — requests go through Next.js /api proxy -> localhost:8000
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";


async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  let authHeader: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("jobsearch_session_token");
    if (token) {
      authHeader["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return response.json() as Promise<T>;
}

export async function checkHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}

export async function sendChatMessage(message: string): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function searchJobs(query: string = "", location: string = ""): Promise<JobListing[]> {
  const params = new URLSearchParams();
  if (query) params.append("query", query);
  if (location) params.append("location", location);
  return apiFetch<JobListing[]>(`/jobs/search?${params.toString()}`);
}

export async function getJobDetails(jobId: string): Promise<JobListing> {
  return apiFetch<JobListing>(`/jobs/${jobId}`);
}

export async function calculateMatch(jobId: string): Promise<JobMatchResult> {
  return apiFetch<JobMatchResult>(`/jobs/match?job_id=${encodeURIComponent(jobId)}`, {
    method: "POST",
  });
}

export async function prepareApplication(jobId: string): Promise<PreparedApplication> {
  return apiFetch<PreparedApplication>(`/jobs/prepare?job_id=${encodeURIComponent(jobId)}`, {
    method: "POST",
  });
}

export async function approveApplication(
  applicationId: string,
  action: "approved" | "skipped",
  notes?: string,
  mappedFields?: Record<string, string>
): Promise<any> {
  return apiFetch("/jobs/approve", {
    method: "POST",
    body: JSON.stringify({
      application_id: applicationId,
      action,
      notes,
      mapped_fields: mappedFields
    }),
  });
}

export async function getApplicationForm(appId: string): Promise<any> {
  return apiFetch<any>(`/applications/${appId}/form`);
}

export async function getApplications(): Promise<ApplicationRecord[]> {
  return apiFetch<ApplicationRecord[]>("/applications");
}

export async function deleteApplication(appId: string): Promise<{ status: string; application_id: string }> {
  return apiFetch(`/applications/${encodeURIComponent(appId)}`, { method: "DELETE" });
}

export async function clearApplications(): Promise<{ status: string; message: string }> {
  return apiFetch("/applications", { method: "DELETE" });
}


export async function getMasterResume(): Promise<Record<string, any>> {
  return apiFetch<Record<string, any>>("/resume");
}

export async function updateMasterResume(resumeData: Record<string, any>): Promise<any> {
  return apiFetch<any>("/resume", {
    method: "PUT",
    body: JSON.stringify(resumeData),
  });
}

export async function uploadResumeFile(file: File): Promise<any> {
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("jobsearch_session_token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/resume/upload`, {
    method: "POST",
    credentials: "include",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/** Returns the direct URL for viewing/downloading the stored resume PDF */
export function getResumePdfUrl(): string {
  return `${API_BASE}/resume/pdf`;
}

export interface SourceDiagnostic {
  name: string;
  status: "ok" | "warning" | "error" | "unavailable";
  capability: string;
  jobs_retrieved: number;
  error_message?: string;
}

export interface DiscoveryDiagnostics {
  total_discovered: number;
  after_deduplication: number;
  sources: SourceDiagnostic[];
}

export interface DiscoveredJob {
  id: string;
  external_id?: string;
  company: string;
  title: string;
  location: string;
  description: string;
  job_url?: string;
  application_url?: string;
  source_url?: string;
  career_page_url?: string;
  source: string;
  source_type?: string;
  sources?: string[];
  remote?: boolean;
  employment_type?: string;
  experience_level?: string;
  posted_at?: string;
  discovered_at?: string;
  fingerprint?: string;
  skills?: string[];
  match_score?: number;
  status?: string;
}

export async function searchDiscoveredJobs(criteria: Record<string, any>): Promise<{
  status: string;
  count: number;
  jobs: DiscoveredJob[];
  diagnostics?: DiscoveryDiagnostics;
  source?: string;
}> {
  return apiFetch("/job-discovery/search", {
    method: "POST",
    body: JSON.stringify(criteria),
  });
}

export async function getDiscoveredJobs(params?: { role?: string; location?: string; remote?: boolean }): Promise<{ count: number; jobs: DiscoveredJob[]; source: string }> {
  const query = new URLSearchParams();
  if (params?.role) query.append("role", params.role);
  if (params?.location) query.append("location", params.location);
  if (params?.remote !== undefined) query.append("remote", String(params.remote));
  return apiFetch(`/discovered-jobs?${query.toString()}`);
}

export async function matchDiscoveredJob(id: string): Promise<any> {
  return apiFetch(`/discovered-jobs/${encodeURIComponent(id)}/match`, { method: "POST" });
}

export async function analyzeDiscoveredJob(id: string): Promise<any> {
  return apiFetch(`/discovered-jobs/${encodeURIComponent(id)}/analyze`, { method: "POST" });
}

export async function saveDiscoveredJob(id: string): Promise<{ status: string; application: any }> {
  return apiFetch(`/discovered-jobs/${encodeURIComponent(id)}/save`, { method: "POST" });
}

export async function markJobApplied(id: string, notes?: string): Promise<any> {
  return apiFetch(`/discovered-jobs/${encodeURIComponent(id)}/mark-applied`, {
    method: "POST",
    body: JSON.stringify(notes || ""),
  });
}

export async function markJobNotApplied(id: string, reason?: string): Promise<any> {
  return apiFetch(`/discovered-jobs/${encodeURIComponent(id)}/mark-not-applied`, {
    method: "POST",
    body: JSON.stringify({ reason: reason || "Not interested" }),
  });
}

export async function removeDiscoveredJob(id: string): Promise<any> {
  return apiFetch(`/discovered-jobs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/**
 * Platform Search Link — NOT an individual job listing.
 * A real URL to the platform's own job-search results page.
 * Opening this URL DOES NOT change any application status.
 */
export interface PlatformSearchLink {
  platform: string;
  display_name: string;
  icon: string;
  search_url: string;       // Real platform search URL
  label: string;            // e.g. "Browse LinkedIn Jobs"
  search_query: string;     // The role the user searched
  location: string;
}

export async function getPlatformLinks(criteria: Record<string, any>): Promise<{
  status: string;
  role: string;
  location: string;
  platform_links: PlatformSearchLink[];
  note: string;
}> {
  return apiFetch("/job-discovery/platform-links", {
    method: "POST",
    body: JSON.stringify(criteria),
  });
}

/**
 * Authentication & Candidate User Schemas
 */
export interface AuthUser {
  id: string;
  google_id: string;
  email: string;
  name: string;
  picture?: string;
  session_token?: string;
}

export async function loginWithGoogle(credential: string): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}

export async function getAuthMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me");
}

export async function logoutUser(): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>("/auth/logout", {
    method: "POST",
  });
}


