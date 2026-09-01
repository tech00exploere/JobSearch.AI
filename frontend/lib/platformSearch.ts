/**
 * JobSearch.ai — Platform Search URL Builder
 * ============================================
 * Generates real job-platform search URLs from user criteria.
 * 100% client-side. No backend call. No API key. No scraping.
 *
 * These URLs open the platform's OWN search results page in a new tab.
 *
 * INVARIANTS:
 * - Never uses Google/Bing search as a fallback.
 * - Never invents job IDs or individual job posting URLs.
 * - Never stores these as individual job_url values.
 * - Clicking Browse NEVER changes application status.
 * - If a platform's real URL format is unknown, returns null (button disabled).
 */

export interface SearchCriteria {
  role: string;
  location: string;
  experience?: string;
  skills?: string[];
  remote?: boolean;
  internship?: boolean;
  fullTime?: boolean;
}

export interface PlatformSearchConfig {
  platform: string;
  displayName: string;
  icon: string;
  /**
   * Build the real search URL from user criteria.
   * Returns null if criteria cannot produce a valid known URL for this platform.
   */
  buildUrl: (criteria: SearchCriteria) => string | null;
}

/** URL-encodes a string safely. */
const enc = (s: string) => encodeURIComponent(s.trim());

/**
 * Platform search URL configurations.
 * Each entry uses the platform's documented public search URL format.
 */
export const PLATFORM_CONFIGS: PlatformSearchConfig[] = [
  {
    platform: "linkedin",
    displayName: "LinkedIn",
    icon: "💼",
    buildUrl: ({ role, location, remote }) => {
      if (!role) return null;
      const params = new URLSearchParams({ keywords: role, location: location || "" });
      if (remote) params.set("f_WT", "2"); // 2 = Remote filter
      return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
    },
  },
  {
    platform: "indeed",
    displayName: "Indeed",
    icon: "🔎",
    buildUrl: ({ role, location, remote }) => {
      if (!role) return null;
      const params = new URLSearchParams({ q: role, l: location || "" });
      if (remote) params.set("remotejob", "032b3046-06a3-4876-8dfd-474eb5e7ed11");
      // Use in.indeed.com for India, otherwise global
      const base =
        (location || "").toLowerCase().includes("india") || !location
          ? "https://in.indeed.com/jobs"
          : "https://www.indeed.com/jobs";
      return `${base}?${params.toString()}`;
    },
  },
  {
    platform: "naukri",
    displayName: "Naukri",
    icon: "🧑‍💻",
    buildUrl: ({ role, location }) => {
      if (!role) return null;
      // Naukri URL: /role-slug-jobs?k=role&l=location
      const roleSlug = role.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const params = new URLSearchParams({ k: role, l: location || "" });
      return `https://www.naukri.com/${roleSlug}-jobs?${params.toString()}`;
    },
  },
  {
    platform: "internshala",
    displayName: "Internshala",
    icon: "🎓",
    buildUrl: ({ role, internship }) => {
      if (!role) return null;
      const roleSlug = role.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      // Internshala uses /internships or /jobs depending on type
      if (internship) {
        return `https://internshala.com/internships/keywords-${enc(roleSlug)}/`;
      }
      return `https://internshala.com/jobs/keywords-${enc(roleSlug)}/`;
    },
  },
  {
    platform: "unstop",
    displayName: "Unstop",
    icon: "🏆",
    buildUrl: ({ role, location }) => {
      if (!role) return null;
      const params = new URLSearchParams({ search: role });
      if (location) params.set("location", location);
      return `https://unstop.com/jobs?${params.toString()}`;
    },
  },
  {
    platform: "foundit",
    displayName: "Foundit",
    icon: "🔍",
    buildUrl: ({ role, location }) => {
      if (!role) return null;
      const params = new URLSearchParams({
        searchType: "personalizedSearch",
        keyword: role,
        location: location || "",
      });
      return `https://www.foundit.in/search/jobs?${params.toString()}`;
    },
  },
  {
    platform: "monster",
    displayName: "Monster",
    icon: "👾",
    buildUrl: ({ role, location }) => {
      if (!role) return null;
      const params = new URLSearchParams({ query: role, locations: location || "" });
      return `https://www.monsterindia.com/srp/results?${params.toString()}`;
    },
  },
  {
    platform: "wellfound",
    displayName: "Wellfound",
    icon: "🚀",
    buildUrl: ({ role, location }) => {
      if (!role) return null;
      const params = new URLSearchParams({ role, location: location || "" });
      return `https://wellfound.com/jobs?${params.toString()}`;
    },
  },
  {
    platform: "glassdoor",
    displayName: "Glassdoor",
    icon: "🪟",
    buildUrl: ({ role, location }) => {
      if (!role) return null;
      // Glassdoor India
      const params = new URLSearchParams({ "sc.keyword": role });
      if (location) params.set("locT", "N");
      return `https://www.glassdoor.co.in/Job/jobs.htm?${params.toString()}`;
    },
  },
  {
    platform: "dice",
    displayName: "Dice",
    icon: "🎲",
    buildUrl: ({ role, location, remote }) => {
      if (!role) return null;
      const params = new URLSearchParams({ q: role });
      if (location) params.set("location", location);
      if (remote) params.set("filters.workplaceTypes", "Remote");
      return `https://www.dice.com/jobs?${params.toString()}`;
    },
  },
];

export interface PlatformLink {
  platform: string;
  displayName: string;
  icon: string;
  searchUrl: string | null;   // null = disabled (unknown URL format)
  available: boolean;
  label: string;              // "Browse LinkedIn Jobs"
}

/**
 * Generates platform search shortcut links from user criteria.
 * Pure client-side — no backend call, no API, no scraping.
 *
 * @returns Array of PlatformLink, available=false when URL cannot be determined.
 */
export function buildPlatformLinks(criteria: SearchCriteria): PlatformLink[] {
  return PLATFORM_CONFIGS.map((config) => {
    const url = config.buildUrl(criteria);
    return {
      platform: config.platform,
      displayName: config.displayName,
      icon: config.icon,
      searchUrl: url,
      available: url !== null,
      label: `Browse ${config.displayName} Jobs`,
    };
  });
}
