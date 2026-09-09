require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const { router: predictRoutes } = require("./routes/predict");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- API routes ---
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/predict", predictRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true, service: "AgriDirect API" }));

// --- Static frontend (works on desktop, tablet and mobile browsers) ---
const PUBLIC_DIR = path.join(__dirname, "..", "public");
app.use(express.static(PUBLIC_DIR));

// SPA-style fallback so direct links to farmer.html / buyer.html etc. work
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`AgriDirect server running on port ${PORT}`);
});
