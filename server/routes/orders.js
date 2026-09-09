const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Buyer places an order against a product listing.
router.post("/", requireAuth, requireRole("buyer"), (req, res) => {
  const { productId, quantityKg } = req.body;
  if (!productId || !quantityKg) {
    return res.status(400).json({ error: "productId and quantityKg are required" });
  }

  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId);
  if (!product || product.status !== "available") {
    return res.status(404).json({ error: "Product not available" });
  }
  if (Number(quantityKg) > product.quantity_kg) {
    return res.status(400).json({ error: "Requested quantity exceeds available stock" });
  }

  const totalPrice = Number(quantityKg) * product.farmer_price_per_kg;

  const info = db
    .prepare(
      `INSERT INTO orders (product_id, buyer_id, quantity_kg, total_price)
       VALUES (?, ?, ?, ?)`
    )
    .run(productId, req.user.id, Number(quantityKg), totalPrice);

  const remaining = product.quantity_kg - Number(quantityKg);
  db.prepare("UPDATE products SET quantity_kg = ?, status = ? WHERE id = ?").run(
    remaining,
    remaining <= 0 ? "sold_out" : "available",
    productId
  );

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ order });
});

// Buyer's own order history
router.get("/mine", requireAuth, requireRole("buyer"), (req, res) => {
  const rows = db
    .prepare(
      `SELECT o.*, p.crop_name, p.location, u.name AS farmer_name
       FROM orders o
       JOIN products p ON p.id = o.product_id
       JOIN users u ON u.id = p.farmer_id
       WHERE o.buyer_id = ?
       ORDER BY o.created_at DESC`
    )
    .all(req.user.id);
  res.json({ orders: rows });
});

// Farmer: orders placed against their products
router.get("/received", requireAuth, requireRole("farmer"), (req, res) => {
  const rows = db
    .prepare(
      `SELECT o.*, p.crop_name, u.name AS buyer_name, u.phone AS buyer_phone
       FROM orders o
       JOIN products p ON p.id = o.product_id
       JOIN users u ON u.id = o.buyer_id
       WHERE p.farmer_id = ?
       ORDER BY o.created_at DESC`
    )
    .all(req.user.id);
  res.json({ orders: rows });
});

router.patch("/:id/status", requireAuth, requireRole("farmer"), (req, res) => {
  const { status } = req.body;
  const allowed = ["placed", "confirmed", "out_for_delivery", "delivered", "cancelled"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const order = db
    .prepare(
      `SELECT o.* FROM orders o JOIN products p ON p.id = o.product_id WHERE o.id = ? AND p.farmer_id = ?`
    )
    .get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: "Order not found" });

  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
