const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

router.post("/register", (req, res) => {
  const { name, phone, password, role, location, language } = req.body;

  if (!name || !phone || !password || !role) {
    return res.status(400).json({ error: "name, phone, password and role are required" });
  }
  if (!["farmer", "buyer"].includes(role)) {
    return res.status(400).json({ error: "role must be 'farmer' or 'buyer'" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE phone = ?").get(phone);
  if (existing) {
    return res.status(409).json({ error: "An account with this phone number already exists" });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(
      `INSERT INTO users (name, phone, password_hash, role, location, language)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(name, phone, password_hash, role, location || "", language || "en");

  const user = { id: info.lastInsertRowid, name, role };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });

  res.status(201).json({ token, user });
});

router.post("/login", (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: "phone and password are required" });
  }

  const row = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: "Invalid phone number or password" });
  }

  const user = { id: row.id, name: row.name, role: row.role };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });

  res.json({ token, user: { ...user, location: row.location, language: row.language } });
});

module.exports = router;
