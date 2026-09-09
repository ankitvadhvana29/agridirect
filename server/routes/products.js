const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { predictPrice } = require("./predict");

const router = express.Router();

// Farmer creates a new produce listing. AI price is computed server-side.
router.post("/", requireAuth, requireRole("farmer"), (req, res) => {
  const { cropName, quantityKg, farmerPricePerKg, location } = req.body;

  if (!cropName || !quantityKg) {
    return res.status(400).json({ error: "cropName and quantityKg are required" });
  }

  const prediction = predictPrice({ crop: cropName, quantityKg: Number(quantityKg) });
  if (prediction.error) return res.status(400).json(prediction);

  const finalFarmerPrice = farmerPricePerKg ? Number(farmerPricePerKg) : prediction.suggestedPricePerKg;

  const info = db
    .prepare(
      `INSERT INTO products (farmer_id, crop_name, quantity_kg, base_price_per_kg, ai_price_per_kg, farmer_price_per_kg, location)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.id,
      cropName.toLowerCase(),
      Number(quantityKg),
      prediction.basePricePerKg,
      prediction.suggestedPricePerKg,
      finalFarmerPrice,
      location || ""
    );

  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ product, aiPrediction: prediction });
});

// Buyer-facing marketplace: all available listings, newest first.
router.get("/", (req, res) => {
  const { crop, location } = req.query;
  let query = `
    SELECT p.*, u.name AS farmer_name, u.phone AS farmer_phone
    FROM products p JOIN users u ON u.id = p.farmer_id
    WHERE p.status = 'available'`;
  const params = [];

  if (crop) {
    query += " AND p.crop_name = ?";
    params.push(crop.toLowerCase());
  }
  if (location) {
    query += " AND p.location LIKE ?";
    params.push(`%${location}%`);
  }
  query += " ORDER BY p.created_at DESC";

  const rows = db.prepare(query).all(...params);
  res.json({ products: rows });
});

// Farmer's own listings
router.get("/mine", requireAuth, requireRole("farmer"), (req, res) => {
  const rows = db
    .prepare("SELECT * FROM products WHERE farmer_id = ? ORDER BY created_at DESC")
    .all(req.user.id);
  res.json({ products: rows });
});

router.patch("/:id/status", requireAuth, requireRole("farmer"), (req, res) => {
  const { status } = req.body;
  if (!["available", "sold_out", "removed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!product || product.farmer_id !== req.user.id) {
    return res.status(404).json({ error: "Product not found" });
  }
  db.prepare("UPDATE products SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
