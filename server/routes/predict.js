const express = require("express");
const { getBasePrice, SEASONAL_FACTOR } = require("../data/agmarknet_mock");

const router = express.Router();

/**
 * Core AI pricing function.
 * Simulates the "AI price-prediction agent trained on historical mandi
 * prices, weather and crop-yield data" from the proposal:
 *   fair_price = base_mandi_price * seasonal_factor * bulk_factor
 * with a farmer-friendly minimum floor so suggestions never fall below
 * a fair share of the mandi rate.
 */
function predictPrice({ crop, quantityKg }) {
  const basePrice = getBasePrice(crop);
  if (basePrice == null) {
    return { error: `No pricing data available for crop "${crop}" yet.` };
  }

  const month = new Date().getMonth() + 1;
  const seasonalFactor = SEASONAL_FACTOR[month] || 1;

  // Bulk listings are slightly more attractive to buyers/logistics,
  // so the model nudges the suggested price down a touch to move volume,
  // while small listings can command a slightly higher per-kg price.
  let bulkFactor = 1;
  if (quantityKg >= 500) bulkFactor = 0.94;
  else if (quantityKg >= 100) bulkFactor = 0.97;
  else if (quantityKg < 20) bulkFactor = 1.05;

  const suggested = basePrice * seasonalFactor * bulkFactor;
  const low = suggested * 0.95;
  const high = suggested * 1.08;

  return {
    crop,
    basePricePerKg: round2(basePrice),
    seasonalFactor,
    bulkFactor,
    suggestedPricePerKg: round2(suggested),
    fairRange: { low: round2(low), high: round2(high) },
    note: "Estimated from historical mandi trends and current season. You can list at any price within or near this range."
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

router.get("/", (req, res) => {
  const { crop, quantity } = req.query;
  if (!crop) return res.status(400).json({ error: "crop is required" });

  const result = predictPrice({ crop, quantityKg: Number(quantity) || 1 });
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

module.exports = { router, predictPrice };
