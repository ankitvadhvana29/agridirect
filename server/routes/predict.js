const express = require("express");
const axios = require("axios");
const { getBasePrice, SEASONAL_FACTOR } = require("../data/agmarknet_mock");

const router = express.Router();

/**
 * Core AI pricing function.
 */
function predictPrice({ crop, quantityKg, qualityMultiplier = 1 }) {
  const basePrice = getBasePrice(crop);
  if (basePrice == null) {
    return { error: `No pricing data available for crop "${crop}" yet.` };
  }

  const month = new Date().getMonth() + 1;
  const seasonalFactor = SEASONAL_FACTOR[month] || 1;

  let bulkFactor = 1;
  if (quantityKg >= 500) bulkFactor = 0.94;
  else if (quantityKg >= 100) bulkFactor = 0.97;
  else if (quantityKg < 20) bulkFactor = 1.05;

  const suggested = basePrice * seasonalFactor * bulkFactor * qualityMultiplier;
  const low = suggested * 0.95;
  const high = suggested * 1.08;

  return {
    crop,
    basePricePerKg: round2(basePrice),
    seasonalFactor,
    bulkFactor,
    qualityMultiplier,
    suggestedPricePerKg: round2(suggested),
    fairRange: { low: round2(low), high: round2(high) },
    note: "Estimated from historical mandi trends, current season and photo quality rating."
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function ratingToMultiplier(rating) {
  if (rating >= 9) return 1.15;
  if (rating >= 8) return 1.08;
  if (rating >= 6) return 1.0;
  if (rating >= 4) return 0.85;
  return 0.65;
}

router.get("/", (req, res) => {
  const { crop, quantity } = req.query;
  if (!crop) return res.status(400).json({ error: "crop is required" });

  const result = predictPrice({ crop, quantityKg: Number(quantity) || 1 });
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

router.post("/photo", async (req, res) => {
  try {
    const { crop, quantityKg, photoBase64 } = req.body;
    if (!crop) return res.status(400).json({ error: "crop is required" });
    if (!photoBase64) return res.status(400).json({ error: "photo is required" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "AI service not configured" });

const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + apiKey;
    const geminiRes = await axios.post(url, {
      contents: [
        {
          parts: [
            {
              text: "You are an agricultural quality inspector. Look at this " + crop + " photo and rate its quality from 1 to 10 (10 = excellent, fresh, no defects; 1 = poor, damaged, rotten). Respond ONLY in this exact JSON format with no extra text: {\"rating\": <number>, \"reason\": \"<short reason, max 15 words>\"}"
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: photoBase64
              }
            }
          ]
        }
      ]
    });

    const rawText = geminiRes.data.candidates[0].content.parts[0].text;
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const aiData = JSON.parse(cleaned);

    const rating = Math.min(10, Math.max(1, Number(aiData.rating) || 5));
    const qualityMultiplier = ratingToMultiplier(rating);

    const priceResult = predictPrice({
      crop: crop,
      quantityKg: Number(quantityKg) || 1,
      qualityMultiplier: qualityMultiplier
    });

    if (priceResult.error) return res.status(404).json(priceResult);

    res.json({
      ...priceResult,
      qualityRating: rating,
      qualityReason: aiData.reason || ""
    });

  } catch (err) {
    console.error("Photo rating error:", err.response ? err.response.data : err.message);
    res.status(500).json({ error: "Could not analyze photo. Try again." });
  }
});

module.exports = { router, predictPrice };