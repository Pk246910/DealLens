/**
 * Shared platform color mappings used across the app.
 * Import from here instead of defining locally in each component.
 */

export const PLATFORM_COLORS = {
  Amazon: "#FF9900",
  Flipkart: "#2874F0",
  Meesho: "#F43397",
  Myntra: "#FF3F6C",
  Nykaa: "#FC2779",
  Croma: "#10B981",
  Reliance: "#0066CC",
  "Reliance Digital": "#0066CC",
  Vijay: "#E31E24",
  "Vijay Sales": "#E31E24",
  Snapdeal: "#E40046",
  Paytm: "#00BAF2",
  "Tata CLiQ": "#8B5CF6",
  JioMart: "#0284C7",
  AJIO: "#F59E0B",
  BigBasket: "#84C225",
  Blinkit: "#FFE234",
  Swiggy: "#FC8019",
  Poorvika: "#F97316",
  boAt: "#EF4444",
  "Samsung Shop": "#3B82F6",
  "Apple Store": "#06B6D4",
  "OnePlus Store": "#F43F5E",
  "Xiaomi Store": "#FF6900",
  "Realme Store": "#EAB308",
  Lenskart: "#14B8A6",
  Decathlon: "#2563EB",
  Pepperfry: "#EA580C",
  FirstCry: "#EC4899",
};

export const ALL_CHECKED_PLATFORMS = [
  "Amazon",
  "Flipkart",
  "Croma",
  "Reliance Digital",
  "Tata CLiQ",
  "Myntra",
  "AJIO",
  "Meesho",
];

const UNIVERSAL_PALETTE = [
  "#06B6D4",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#3B82F6",
  "#14B8A6",
  "#F97316",
];

/** Returns the color for a given platform name, with a deterministic color fallback for universal stores. */
export function getPlatformColor(platformName, fallback = "#06B6D4") {
  if (!platformName) return fallback;
  if (PLATFORM_COLORS[platformName]) return PLATFORM_COLORS[platformName];
  const key = Object.keys(PLATFORM_COLORS).find((k) =>
    platformName.toLowerCase().includes(k.toLowerCase())
  );
  if (key) return PLATFORM_COLORS[key];
  let hash = 0;
  for (let i = 0; i < platformName.length; i += 1) {
    hash = (hash * 31 + platformName.charCodeAt(i)) % 997;
  }
  return UNIVERSAL_PALETTE[hash % UNIVERSAL_PALETTE.length] || fallback;
}

/**
 * Official website configuration for all supported marketplaces.
 */
export const PLATFORM_OFFICIAL_SITES = {
  Amazon: {
    domain: "amazon.in",
    home: "https://www.amazon.in",
    search: (q) => `https://www.amazon.in/s?k=${q}`,
  },
  Flipkart: {
    domain: "flipkart.com",
    home: "https://www.flipkart.com",
    search: (q) => `https://www.flipkart.com/search?q=${q}`,
  },
  Croma: {
    domain: "croma.com",
    home: "https://www.croma.com",
    search: (q) => `https://www.croma.com/searchB?q=${q}%3Arelevance`,
  },
  "Reliance Digital": {
    domain: "reliancedigital.in",
    home: "https://www.reliancedigital.in",
    search: (q) => `https://www.reliancedigital.in/search?q=${q}:relevance`,
  },
  Reliance: {
    domain: "reliancedigital.in",
    home: "https://www.reliancedigital.in",
    search: (q) => `https://www.reliancedigital.in/search?q=${q}:relevance`,
  },
  "Tata CLiQ": {
    domain: "tatacliq.com",
    home: "https://www.tatacliq.com",
    search: (q) => `https://www.tatacliq.com/search/?searchCategory=all&text=${q}`,
  },
  Myntra: {
    domain: "myntra.com",
    home: "https://www.myntra.com",
    search: (q, slug) => `https://www.myntra.com/${slug || "shop"}?rawQuery=${q}`,
  },
  AJIO: {
    domain: "ajio.com",
    home: "https://www.ajio.com",
    search: (q) => `https://www.ajio.com/search/?text=${q}`,
  },
  Meesho: {
    domain: "meesho.com",
    home: "https://www.meesho.com",
    search: (q) => `https://www.meesho.com/search?q=${q}`,
  },
  Nykaa: {
    domain: "nykaa.com",
    home: "https://www.nykaa.com",
    search: (q) => `https://www.nykaa.com/search/result/?q=${q}`,
  },
  JioMart: {
    domain: "jiomart.com",
    home: "https://www.jiomart.com",
    search: (q) => `https://www.jiomart.com/search/${q}`,
  },
  Snapdeal: {
    domain: "snapdeal.com",
    home: "https://www.snapdeal.com",
    search: (q) => `https://www.snapdeal.com/search?keyword=${q}`,
  },
  "Vijay Sales": {
    domain: "vijaysales.com",
    home: "https://www.vijaysales.com",
    search: (q) => `https://www.vijaysales.com/search/${q}`,
  },
  Poorvika: {
    domain: "poorvika.com",
    home: "https://www.poorvika.com",
    search: (q) => `https://www.poorvika.com/s?q=${q}`,
  },
  "Samsung Shop": {
    domain: "samsung.com/in",
    home: "https://www.samsung.com/in",
    search: (q) => `https://www.samsung.com/in/search/?searchvalue=${q}`,
  },
  "Apple Store": {
    domain: "apple.com/in",
    home: "https://www.apple.com/in",
    search: (q) => `https://www.apple.com/in/us/search/${q}?src=globalnav`,
  },
};

function findPlatformSiteConfig(platformName) {
  if (!platformName) return null;
  if (PLATFORM_OFFICIAL_SITES[platformName]) {
    return PLATFORM_OFFICIAL_SITES[platformName];
  }
  const lower = platformName.toLowerCase();
  const matchedKey = Object.keys(PLATFORM_OFFICIAL_SITES).find(
    (k) => lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)
  );
  return matchedKey ? PLATFORM_OFFICIAL_SITES[matchedKey] : null;
}

/**
 * Returns the readable official domain name for a marketplace (e.g., "reliancedigital.in").
 */
export function getOfficialDomainLabel(platformName) {
  const cfg = findPlatformSiteConfig(platformName);
  if (cfg) return cfg.domain;
  if (!platformName) return "official store";
  return `${platformName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
}

/**
 * Resolves a reliable, official marketplace URL for any platform and product.
 * - If `isSource` is true and `rawUrl` is a real product URL on that platform, preserves `rawUrl`.
 * - Otherwise constructs the official website product search URL (or homepage) for that platform
 *   so clicking "Visit Store" / "Buy on [Platform]" always redirects to the official website.
 */
export function getOfficialStoreUrl(platformName, productTitle = "", rawUrl = "", isSource = false) {
  const cfg = findPlatformSiteConfig(platformName);
  const cleanTitle = String(productTitle || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 75);

  const encodedQuery = encodeURIComponent(cleanTitle || platformName || "deals");
  const slugQuery = cleanTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // If this is the user's pasted source URL and it's a valid http(s) URL, use it directly
  if (isSource && rawUrl && /^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  // If we have an official site config for this platform, prefer its official search URL
  // unless rawUrl is already a real URL on that exact official domain (and not a synthetic seed link)
  if (cfg) {
    if (
      rawUrl &&
      /^https?:\/\//i.test(rawUrl) &&
      rawUrl.toLowerCase().includes(cfg.domain.split("/")[0].toLowerCase()) &&
      !rawUrl.includes("/example") &&
      !rawUrl.includes("itm123") &&
      !rawUrl.includes("placeholder")
    ) {
      return rawUrl;
    }
    return cleanTitle ? cfg.search(encodedQuery, slugQuery) : cfg.home;
  }

  if (rawUrl && /^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(
    `${platformName || ""} ${cleanTitle}`.trim()
  )}`;
}

