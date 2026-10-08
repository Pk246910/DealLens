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
  Croma: "#67B346",
  Reliance: "#0066CC",
  "Reliance Digital": "#0066CC",
  Vijay: "#E31E24",
  "Vijay Sales": "#E31E24",
  Snapdeal: "#E40046",
  Paytm: "#00BAF2",
  "Tata CLiQ": "#6A4C9C",
  JioMart: "#0066CC",
  AJIO: "#1A1A1A",
  BigBasket: "#84C225",
  Blinkit: "#FFE234",
  Swiggy: "#FC8019",
};

/** Returns the color for a given platform name, with a default fallback. */
export function getPlatformColor(platformName, fallback = "#6B7280") {
  if (!platformName) return fallback;
  if (PLATFORM_COLORS[platformName]) return PLATFORM_COLORS[platformName];
  const key = Object.keys(PLATFORM_COLORS).find((k) =>
    platformName.toLowerCase().includes(k.toLowerCase())
  );
  return key ? PLATFORM_COLORS[key] : fallback;
}
