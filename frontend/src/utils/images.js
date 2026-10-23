const CURATED_PHOTOS = {
  apple_iphone: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80",
  apple_macbook: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80",
  apple_ipad: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80",
  apple_airpods: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop&q=80",
  apple_watch: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80",
  samsung_galaxy: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80",
  google_pixel: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80",
  smart_glasses: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop&q=80",
  sony_headphones: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
  sony_camera: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80",
  nike_shoes: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80",
  puma_shoes: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&auto=format&fit=crop&q=80",
  levis_jeans: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80",
  casual_shirt: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
  backpack: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80",
  refrigerator: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80",
  kitchen_mixer: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=800&auto=format&fit=crop&q=80",
  kitchen_appliance: "https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&auto=format&fit=crop&q=80",
  water_purifier: "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800&auto=format&fit=crop&q=80",
  Smartphones: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80",
  Laptops: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=80",
  Tablets: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80",
  Headphones: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
  Earbuds: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80",
  Watches: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
  Televisions: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80",
  Cameras: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80",
  Footwear: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80",
  Fashion: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
  Appliances: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80",
  Speakers: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80",
};

export function getCuratedProductPhoto(title = "", brand = "", category = "") {
  const t = `${brand || ""} ${title || ""}`.toLowerCase();

  if (/meta|ray-ban|rayban|smart glasses|wayfarer|transitions/.test(t)) {
    return CURATED_PHOTOS.smart_glasses;
  }
  if (/iphone/.test(t) || (/apple/.test(t) && /phone/.test(t))) {
    return CURATED_PHOTOS.apple_iphone;
  }
  if (/macbook/.test(t) || (/apple/.test(t) && /laptop/.test(t))) {
    return CURATED_PHOTOS.apple_macbook;
  }
  if (/ipad/.test(t)) {
    return CURATED_PHOTOS.apple_ipad;
  }
  if (/airpods/.test(t)) {
    return CURATED_PHOTOS.apple_airpods;
  }
  if (/apple watch/.test(t)) {
    return CURATED_PHOTOS.apple_watch;
  }
  if (/pixel/.test(t)) {
    return CURATED_PHOTOS.google_pixel;
  }
  if (/galaxy/.test(t) || (/samsung/.test(t) && /s24|s23|s22|s21|ultra|plus|phone|mobile/.test(t))) {
    return CURATED_PHOTOS.samsung_galaxy;
  }
  if (/earbuds|buds|airdopes|tws|in-ear/.test(t)) {
    return CURATED_PHOTOS.Earbuds;
  }
  if (/headphone|wh-1000|rockerz|quietcomfort|over-ear/.test(t)) {
    return CURATED_PHOTOS.Headphones;
  }
  if (/smartwatch|watch|colorfit|fitbit/.test(t)) {
    return CURATED_PHOTOS.Watches;
  }
  if (/laptop|thinkpad|vivobook|zenbook|pavilion|inspiron|legion|notebook/.test(t)) {
    return CURATED_PHOTOS.Laptops;
  }
  if (/tablet|tab/.test(t)) {
    return CURATED_PHOTOS.Tablets;
  }
  if (/\btv\b|television|bravia|oled|qled|monitor/.test(t)) {
    return CURATED_PHOTOS.Televisions;
  }
  if (/camera|mirrorless|dslr|gopro|eos|alpha/.test(t)) {
    return CURATED_PHOTOS.Cameras;
  }
  if (/shoe|sneaker|running|nike|puma|adidas|reebok|air max|dunk/.test(t)) {
    return CURATED_PHOTOS.Footwear;
  }
  if (/jean|denim|511|512|levis|levi's/.test(t)) {
    return CURATED_PHOTOS.levis_jeans;
  }
  if (/shirt|polo|t-shirt|kurta|jacket|apparel/.test(t)) {
    return CURATED_PHOTOS.casual_shirt;
  }
  if (/backpack|bag|rucksack|wildcraft/.test(t)) {
    return CURATED_PHOTOS.backpack;
  }
  if (/refrigerator|fridge|single door|double door/.test(t)) {
    return CURATED_PHOTOS.refrigerator;
  }
  if (/mixer|grinder|blender|juicer/.test(t)) {
    return CURATED_PHOTOS.kitchen_mixer;
  }
  if (/kettle|fryer|air fryer|cooktop/.test(t)) {
    return CURATED_PHOTOS.kitchen_appliance;
  }
  if (/purifier|aquaguard|aquasaver|water filter/.test(t)) {
    return CURATED_PHOTOS.water_purifier;
  }

  const themeKey = inferThemeKey(category, title);
  return CURATED_PHOTOS[themeKey] || CURATED_PHOTOS.Smartphones;
}

const CATEGORY_THEMES = {
  Smartphones: {
    color: "#06b6d4",
    badge: "SMARTPHONES",
    icon: '<rect x="148" y="80" width="104" height="180" rx="16" fill="none" stroke="#06b6d4" stroke-width="4"/><rect x="156" y="96" width="88" height="140" rx="4" fill="#06b6d4" opacity="0.15"/><circle cx="200" cy="248" r="8" fill="none" stroke="#06b6d4" stroke-width="2"/><rect x="180" y="86" width="40" height="4" rx="2" fill="#06b6d4" opacity="0.5"/>',
  },
  Laptops: {
    color: "#10b981",
    badge: "LAPTOPS",
    icon: '<rect x="110" y="100" width="180" height="110" rx="8" fill="none" stroke="#10b981" stroke-width="4"/><rect x="118" y="108" width="164" height="86" rx="4" fill="#10b981" opacity="0.15"/><path d="M90 210 L110 210 L290 210 L310 210 L300 220 L100 220 Z" fill="none" stroke="#10b981" stroke-width="3"/>',
  },
  Tablets: {
    color: "#06b6d4",
    badge: "TABLETS",
    icon: '<rect x="130" y="80" width="140" height="180" rx="14" fill="none" stroke="#06b6d4" stroke-width="4"/><rect x="140" y="94" width="120" height="148" rx="4" fill="#06b6d4" opacity="0.15"/><circle cx="200" cy="250" r="5" fill="#06b6d4" opacity="0.5"/>',
  },
  Headphones: {
    color: "#8b5cf6",
    badge: "HEADPHONES",
    icon: '<path d="M140 180 Q140 110 200 110 Q260 110 260 180" fill="none" stroke="#8b5cf6" stroke-width="6" stroke-linecap="round"/><rect x="124" y="170" width="32" height="50" rx="10" fill="#8b5cf6" opacity="0.3" stroke="#8b5cf6" stroke-width="3"/><rect x="244" y="170" width="32" height="50" rx="10" fill="#8b5cf6" opacity="0.3" stroke="#8b5cf6" stroke-width="3"/>',
  },
  Earbuds: {
    color: "#f43f5e",
    badge: "EARBUDS",
    icon: '<ellipse cx="170" cy="180" rx="28" ry="30" fill="#f43f5e" opacity="0.2" stroke="#f43f5e" stroke-width="3"/><ellipse cx="230" cy="180" rx="28" ry="30" fill="#f43f5e" opacity="0.2" stroke="#f43f5e" stroke-width="3"/><circle cx="170" cy="178" r="8" fill="#f43f5e" opacity="0.5"/><circle cx="230" cy="178" r="8" fill="#f43f5e" opacity="0.5"/>',
  },
  Watches: {
    color: "#ec4899",
    badge: "WATCHES",
    icon: '<circle cx="200" cy="175" r="55" fill="none" stroke="#ec4899" stroke-width="4"/><circle cx="200" cy="175" r="45" fill="#ec4899" opacity="0.1"/><line x1="200" y1="175" x2="200" y2="145" stroke="#ec4899" stroke-width="3" stroke-linecap="round"/><line x1="200" y1="175" x2="222" y2="185" stroke="#ec4899" stroke-width="2" stroke-linecap="round"/><rect x="190" y="108" width="20" height="12" rx="3" fill="none" stroke="#ec4899" stroke-width="2"/><rect x="190" y="230" width="20" height="12" rx="3" fill="none" stroke="#ec4899" stroke-width="2"/>',
  },
  TVs: {
    color: "#06b6d4",
    badge: "TELEVISIONS",
    icon: '<rect x="90" y="100" width="220" height="130" rx="8" fill="none" stroke="#06b6d4" stroke-width="4"/><rect x="98" y="108" width="204" height="110" rx="4" fill="#06b6d4" opacity="0.12"/><line x1="200" y1="230" x2="200" y2="250" stroke="#06b6d4" stroke-width="4"/><line x1="160" y1="250" x2="240" y2="250" stroke="#06b6d4" stroke-width="4" stroke-linecap="round"/>',
  },
  Cameras: {
    color: "#f97316",
    badge: "CAMERAS",
    icon: '<rect x="120" y="110" width="160" height="110" rx="10" fill="none" stroke="#f97316" stroke-width="4"/><circle cx="200" cy="165" r="35" fill="#f97316" opacity="0.12" stroke="#f97316" stroke-width="3"/><circle cx="200" cy="165" r="22" fill="none" stroke="#f97316" stroke-width="2"/><circle cx="200" cy="165" r="10" fill="#f97316" opacity="0.3"/>',
  },
  Footwear: {
    color: "#f59e0b",
    badge: "FOOTWEAR",
    icon: '<path d="M110 200 Q110 170 140 160 L260 155 Q290 153 295 170 L300 195 Q302 210 290 215 L120 220 Q110 220 110 200Z" fill="#f59e0b" opacity="0.15" stroke="#f59e0b" stroke-width="3"/><circle cx="250" cy="185" r="15" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0.3"/>',
  },
  Fashion: {
    color: "#6366f1",
    badge: "FASHION",
    icon: '<path d="M160 120 L200 100 L240 120 L260 140 L240 150 L235 260 L165 260 L160 150 L140 140 Z" fill="#6366f1" opacity="0.12" stroke="#6366f1" stroke-width="3"/><path d="M160 120 L200 140 L240 120" fill="none" stroke="#6366f1" stroke-width="2" opacity="0.5"/>',
  },
  Appliances: {
    color: "#10b981",
    badge: "APPLIANCES",
    icon: '<rect x="155" y="100" width="90" height="130" rx="10" fill="none" stroke="#10b981" stroke-width="4"/><rect x="140" y="230" width="120" height="20" rx="6" fill="none" stroke="#10b981" stroke-width="3"/><rect x="175" y="80" width="50" height="20" rx="4" fill="none" stroke="#10b981" stroke-width="2"/>',
  },
};

function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function inferThemeKey(category = "", title = "") {
  const c = String(category || "").trim();
  if (CATEGORY_THEMES[c]) return c;
  if (c === "Mobile Phones") return "Smartphones";
  if (c === "Smartwatches") return "Watches";
  if (c === "Televisions") return "TVs";
  if (c === "Kitchen Appliances" || c === "Home Appliances") return "Appliances";

  const t = String(title || "").toLowerCase();
  if (/phone|galaxy|iphone|pixel|oneplus|redmi|realme|vivo|oppo|xiaomi|moto|nothing/.test(t)) return "Smartphones";
  if (/laptop|macbook|thinkpad|vivobook|zenbook|pavilion|victus|legion|inspiron/.test(t)) return "Laptops";
  if (/airpods|earbuds|buds|airdopes|tws/.test(t)) return "Earbuds";
  if (/headphone|rockerz|wh-|quietcomfort|over-ear|on-ear|headset/.test(t)) return "Headphones";
  if (/watch|smartwatch|colorfit|band/.test(t)) return "Watches";
  if (/\btv\b|television|bravia|qled|oled/.test(t)) return "TVs";
  if (/camera|mirrorless|dslr|gopro|eos/.test(t)) return "Cameras";
  if (/ipad|tablet|galaxy tab|\btab\b/.test(t)) return "Tablets";
  if (/shoe|sneaker|running|boot|sandal/.test(t)) return "Footwear";
  if (/shirt|jeans|polo|t-shirt|jacket|kurta|dress|backpack/.test(t)) return "Fashion";
  if (/mixer|grinder|fryer|kettle|refrigerator|purifier|washing|fridge|aquaguard/.test(t)) return "Appliances";
  return "Smartphones";
}

export function buildDynamicProductSvg(meta = {}) {
  const obj = typeof meta === "string" ? { title: meta } : meta || {};
  const rawTitle = String(obj.title || "DealLens Product").trim();
  const rawBrand = String(obj.brand || "").trim();
  const rawCategory = String(obj.category || "").trim();

  const themeKey = inferThemeKey(rawCategory, rawTitle);
  const theme = CATEGORY_THEMES[themeKey] || CATEGORY_THEMES.Smartphones;

  const brandLabel = escapeXml(
    (rawBrand && rawBrand.toLowerCase() !== "unknown"
      ? rawBrand
      : rawTitle.split(/\s+/)[0] || "DEALLENS"
    )
      .toUpperCase()
      .slice(0, 18)
  );

  const shortTitle = escapeXml(
    rawTitle
      .split(/\s+/)
      .slice(0, 4)
      .join(" ")
      .slice(0, 28) || "DealLens Product"
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 350" width="400" height="350">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${theme.color};stop-opacity:0.08"/>
      <stop offset="100%" style="stop-color:${theme.color};stop-opacity:0.02"/>
    </linearGradient>
  </defs>
  <rect width="400" height="350" rx="12" fill="url(#bg)"/>
  <rect width="400" height="350" rx="12" fill="url(#glow)"/>
  <g>${theme.icon}</g>
  <text x="200" y="50" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="${theme.color}" letter-spacing="3" opacity="0.9">${brandLabel}</text>
  <text x="200" y="300" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="500" fill="#94a3b8" opacity="0.8">${shortTitle}</text>
  <rect x="140" y="318" width="120" height="20" rx="10" fill="${theme.color}" opacity="0.1"/>
  <text x="200" y="332" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="600" fill="${theme.color}" opacity="0.7">${theme.badge}</text>
  <text x="200" y="22" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="400" fill="#475569" opacity="0.4">DEALLENS</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getProductImage(imageUrl, meta = {}) {
  const cleaned = typeof imageUrl === "string" ? imageUrl.trim() : "";
  const title = typeof meta === "string" ? meta : meta?.title || meta?.product_title || "";
  const brand = typeof meta === "object" ? meta?.brand || meta?.product_brand || "" : "";
  const category = typeof meta === "object" ? meta?.category || meta?.product_category || "" : "";

  // Valid remote URL or inline data URI
  if (
    cleaned &&
    (cleaned.startsWith("http://") || cleaned.startsWith("https://") || cleaned.startsWith("data:image/")) &&
    !cleaned.includes("placehold.co") &&
    !cleaned.includes("product-placeholder.svg")
  ) {
    return cleaned;
  }

  // Pre-existing local SVG path from public/products/ (e.g. established seeds)
  if (cleaned && cleaned.startsWith("/products/") && !cleaned.includes("product-placeholder.svg")) {
    return cleaned;
  }

  // Fall back to curated real product photo
  return getCuratedProductPhoto(title, brand, category);
}

export function handleImageError(e) {
  if (!e || !e.target) return;
  const currentStep = e.target.dataset.fallbackStep || "";
  const title = e.target.alt || e.target.dataset.title || "DealLens Product";
  const brand = e.target.dataset.brand || "";
  const category = e.target.dataset.category || "";

  // Always ensure referrerPolicy is stripped
  e.target.referrerPolicy = "no-referrer";

  if (!currentStep) {
    // Step 1: Fall back to curated real product photograph
    e.target.dataset.fallbackStep = "photo";
    const photo = getCuratedProductPhoto(title, brand, category);
    if (photo && photo !== e.target.src) {
      e.target.src = photo;
      return;
    }
  }

  if (currentStep === "photo") {
    // Step 2: Fall back to inline SVG vector data URI (cannot fail over network)
    e.target.dataset.fallbackStep = "svg";
    e.target.src = buildDynamicProductSvg({ title, brand, category });
    return;
  }

  // Final stop: Avoid infinite onError loops
  e.target.dataset.fallbackStep = "done";
}
