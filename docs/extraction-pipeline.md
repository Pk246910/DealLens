# DealLens Real-Data Extraction Pipeline

Layered pipeline in `backend/products/services/extract/`. No technique is
trusted alone; nothing is ever fabricated — unverifiable fields are `None`.

## Levels (first usable result wins)

| Level | Module | Notes |
|---|---|---|
| L1 Official API | per-adapter `official_api()` | Only with env credentials (below). Amazon PA-API 5.0 (SigV4, stdlib) and Flipkart Affiliate API are implemented; the other six platforms expose no public affiliate API, so their hook is a documented no-op. Missing creds/packages → skip, never fail. |
| L2 HTTP fetch | `http.py` | `requests`, Chrome UA, 15s timeout, ≤3 redirects, SSRF guard, single attempt. 403/404/429/503 mapped to reasons. |
| L3 Structured data | `structured.py` | JSON-LD Product/Offer/AggregateRating first, OG/meta tags second. Preferred over selectors. |
| Selectors | `adapters/*.py` | Per-platform CSS selectors fill gaps only. |
| L4 Browser | `browser.py` | Headless Chromium, only when plain HTTP yields no product name. **STOP** on CAPTCHA, access-denied, login walls, 403/404/429 — never bypassed. |
| L6 Graceful failure | — | `{success: false, reason}` — DB fallback and rule-based scoring continue. |

## Per-platform report (measured, Sept 2026)

| Platform | HTTP | JSON-LD/meta | Browser | Result |
|---|---|---|---|---|
| Amazon | page served, often bot-walled | sometimes present | allowed, usually empty | works when Amazon serves HTML; otherwise graceful fallback |
| Flipkart | 200 empty shell / 403 API | absent | blocked (shell only) | graceful fallback |
| Myntra / AJIO / Meesho / Croma / Reliance / Tata CLiQ | JS shells or blocks | mostly absent | blocked or empty | graceful fallback |

The goal is not 8/8 live scraping — it is honest extraction with graceful fallback.

## Confidence

- `high` — official API, or JSON-LD with name + price
- `medium` — metadata/selectors/browser with name + price
- `low` — name only / weak metadata
- `failed` — no product name

## Validation (`base.py`)

Price/original-price must be numeric > 0 (mrp ≥ price), rating 0–5,
review count integer ≥ 0, URLs must be valid http(s), name non-empty.
Invalid → `None`. The legacy dict boundary maps `None` → `0` for the
existing scoring code, which already treats 0 as missing.

## Variant separation

`comparison_engine` refuses to match when both sides state storage and it
differs (256GB vs 128GB). Storage parsing ignores RAM tokens
("8GB, 256GB" → storage 256GB).

## Caching

Django cache, key `extract:<sha256(platform|url)>`.
`PRODUCT_DATA_CACHE_MINUTES` (default 30); failures cached 5 min.
`POST /api/analyze-url/?refresh=1` bypasses the cache.

## API surface (all inside the existing `/api/analyze-url/` response)

`extraction_status` (live/database/url_guess), `extraction_notice`,
`extraction_method` (official_api/json_ld/metadata/css_selector/browser/none),
`extraction_confidence`, `extraction_updated`, `extraction_fields`.

## Credentials (backend/.env only, never frontend)

```ini
# Amazon PA-API 5.0 — https://affiliate-program.amazon.in/
# AMAZON_PAAPI_ACCESS_KEY=
# AMAZON_PAAPI_SECRET_KEY=
# AMAZON_PARTNER_TAG=
# Flipkart Affiliate API — https://affiliate.flipkart.com/
# FLIPKART_AFFILIATE_ID=
# FLIPKART_AFFILIATE_TOKEN=
```

Without these, L1 is skipped and the pipeline proceeds to HTTP extraction.
L1 code paths are verified with mocked tests only (no live calls without
your keys) — add keys, then paste a real product URL to verify live.

## Adding a platform

1. Add domains to `PLATFORM_DOMAINS` in `services/url_analyzer.py`.
2. Create `services/extract/adapters/<name>.py` with `SELECTORS`,
   `ID_PATTERNS`, `WAIT_SELECTOR` (see `amazon.py`).
3. Register in `registry._adapter_classes()`.
4. Add mocked tests in `products/test_extraction.py`. No other changes needed.

## Tests

`python manage.py test products.test_extraction` — 24 mocked tests
(detection, 8 adapters, JSON-LD, metadata, browser STOP, validation,
variants, fallback, scoring determinism). No live websites touched.
