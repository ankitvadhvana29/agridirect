const path = require("path");
const Database = require("better-sqlite3");

// NOTE: On Render's free tier the filesystem is ephemeral on redeploys.
// For a persistent demo, attach a Render Disk mounted at /data and set
// DB_PATH=/data/agridirect.db as an environment variable. Locally this
// just creates agridirect.db in the project root.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "agridirect.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('farmer','buyer')),
  location TEXT,
  language TEXT DEFAULT 'en',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id INTEGER NOT NULL REFERENCES users(id),
  crop_name TEXT NOT NULL,
  quantity_kg REAL NOT NULL,
  base_price_per_kg REAL NOT NULL,
  ai_price_per_kg REAL NOT NULL,
  farmer_price_per_kg REAL NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','sold_out','removed')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  buyer_id INTEGER NOT NULL REFERENCES users(id),
  quantity_kg REAL NOT NULL,
  total_price REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'placed' CHECK(status IN ('placed','confirmed','out_for_delivery','delivered','cancelled')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`);

module.exports = db;
