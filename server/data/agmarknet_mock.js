/**
 * Mock "Agmarknet-style" base mandi price data (₹ per kg).
 * In production this would be replaced by a live feed / periodic scrape
 * from https://agmarknet.gov.in and https://www.enam.gov.in, combined with
 * a trained regression model (scikit-learn / TensorFlow) using weather &
 * yield history as described in the SIH proposal.
 *
 * For this working model we simulate that trained model with a transparent,
 * explainable formula so the demo is fully functional offline.
 */

const BASE_PRICES = {
  wheat: 24,
  rice: 32,
  maize: 20,
  onion: 18,
  potato: 15,
  tomato: 22,
  soybean: 45,
  cotton: 65,
  sugarcane: 3.5,
  groundnut: 58,
  mustard: 52,
  chana: 68,
  banana: 20,
  mango: 55,
  brinjal: 16,
  cabbage: 12,
  cauliflower: 18,
  spinach: 14,
  chilli: 80,
  garlic: 90
};

// Simple seasonal multiplier per month (1-12), simulating demand swings.
const SEASONAL_FACTOR = {
  1: 1.02, 2: 1.0, 3: 0.97, 4: 0.95, 5: 0.96, 6: 1.0,
  7: 1.05, 8: 1.08, 9: 1.1, 10: 1.06, 11: 1.03, 12: 1.01
};

function getBasePrice(cropNameRaw) {
  const cropName = (cropNameRaw || "").trim().toLowerCase();
  return BASE_PRICES[cropName] ?? null;
}

module.exports = { BASE_PRICES, SEASONAL_FACTOR, getBasePrice };
