/**
 * Shared Chart Utilities for DealLens
 * Provides robust dynamic Y-axis domain calculation and tick formatting for Recharts.
 */

/**
 * Format a price value for Y-axis ticks or chart annotations.
 * Ensures clean, non-repeating labels regardless of price bracket:
 *  - >= ₹1,00,00,000: e.g. "₹1.5Cr"
 *  - >= ₹1,00,000:    e.g. "₹1.2L"
 *  - < ₹10,000 OR price range < ₹3,000: e.g. "₹1,200", "₹1,250" (full rupee with commas, avoids repeating ₹1k/₹0k)
 *  - >= ₹10,000 with wide spread: e.g. "₹15k", "₹20k" (or "₹15.5k" if not integer)
 *
 * @param {number|string} value - The raw tick number
 * @param {number} [minVal] - Current minimum value of the active domain
 * @param {number} [maxVal] - Current maximum value of the active domain
 * @returns {string} Formatted label
 */
export const formatPriceTick = (value, minVal, maxVal) => {
  const v = Number(value);
  if (!Number.isFinite(v)) return "";

  // Crores (>= ₹1,00,00,000)
  if (v >= 10000000) {
    const cr = v / 10000000;
    return `₹${cr % 1 === 0 ? cr : cr.toFixed(2).replace(/\.?0+$/, "")}Cr`;
  }

  // Lakhs (>= ₹1,00,000)
  if (v >= 100000) {
    const inLakhs = v / 100000;
    return `₹${inLakhs % 1 === 0 ? inLakhs : inLakhs.toFixed(2).replace(/\.?0+$/, "")}L`;
  }

  const range =
    maxVal !== undefined && minVal !== undefined && Number.isFinite(maxVal) && Number.isFinite(minVal)
      ? maxVal - minVal
      : v;

  // For prices below ₹10,000 or when the price spread is tight (< ₹3,000),
  // output full localized rupee string (e.g. ₹1,200, ₹1,250) so ticks never duplicate or lose granularity.
  if (v < 10000 || range < 3000) {
    return `₹${Math.round(v).toLocaleString("en-IN")}`;
  }

  // Standard Thousands (₹10,000 to ₹99,999) with wider range
  const inK = v / 1000;
  if (inK % 1 === 0) {
    return `₹${inK}k`;
  }
  return `₹${inK.toFixed(1).replace(/\.0$/, "")}k`;
};

/**
 * Computes optimal dynamic Y-axis bounds [yMin, yMax] based on active price points.
 * Eliminates the bottom ₹0 dead-space, prevents lines from hitting chart borders,
 * and scales step size to price variation so curves occupy 60%-80% of vertical height.
 *
 * @param {number[]} prices - Array of active price numbers
 * @returns {[number, number]} [yMin, yMax]
 */
export const computeYDomain = (prices) => {
  const valid = (prices || [])
    .map(Number)
    .filter((p) => Number.isFinite(p) && p > 0);

  if (valid.length === 0) return [0, "auto"];

  const minVal = Math.min(...valid);
  const maxVal = Math.max(...valid);
  const diff = maxVal - minVal;

  // Determine breathing-room padding
  let padding;
  if (diff === 0) {
    // Flat single price: pad 5% (at least 20)
    padding = Math.max(20, Math.round(minVal * 0.05));
  } else {
    // Variable price: 15% of spread, at least 20 and at least 1.5% of min price
    padding = Math.max(20, Math.round(diff * 0.15), Math.round(minVal * 0.015));
  }

  // Determine rounding step based on min value and price diff
  let step = 100;
  if (minVal < 500) {
    step = diff <= 50 ? 10 : 25;
  } else if (minVal < 2000) {
    if (diff <= 100) step = 20;
    else if (diff <= 400) step = 50;
    else step = 100;
  } else if (minVal < 10000) {
    if (diff <= 500) step = 100;
    else if (diff <= 2000) step = 250;
    else step = 500;
  } else if (minVal < 50000) {
    if (diff <= 1000) step = 250;
    else if (diff <= 4000) step = 500;
    else if (diff <= 10000) step = 1000;
    else step = 2000;
  } else {
    // High-value products (>= ₹50,000)
    if (diff <= 2000) step = 500;
    else if (diff <= 10000) step = 1000;
    else if (diff <= 30000) step = 2500;
    else step = 5000;
  }

  const yMin = Math.max(0, Math.floor((minVal - padding) / step) * step);
  const yMax = Math.ceil((maxVal + padding) / step) * step;

  if (yMin === yMax) {
    return [Math.max(0, yMin - step), yMax + step];
  }

  return [yMin, yMax];
};
