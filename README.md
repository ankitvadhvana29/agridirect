# AgriDirect — SIH26033

AI-Enabled Direct Farmer-to-Consumer Marketplace. Working full-stack model:
farmers list produce, an AI pricing engine suggests a fair price, buyers
browse and order directly, and the whole thing runs as one responsive
website on any device (phone, tablet, desktop).

## Stack
- **Frontend:** Plain responsive HTML/CSS/JS (no build step — works everywhere, loads fast on low-end rural devices, mirrors the "React/Flutter for low-end device support" idea from the pitch deck without needing a build pipeline for this demo)
- **Backend:** Node.js + Express, REST API
- **Database:** SQLite (via `better-sqlite3`) — zero external setup; swap for Postgres later for production scale
- **Auth:** JWT + bcrypt password hashing
- **AI pricing engine:** `server/routes/predict.js` — a transparent formula (base mandi price × seasonal factor × bulk factor) standing in for the trained scikit-learn/TensorFlow model described in the proposal. Swap `getBasePrice()` in `server/data/agmarknet_mock.js` for a live Agmarknet/eNAM feed + trained model when you're ready.

## Project structure
```
agridirect/
├── server/
│   ├── server.js          # Express app entry point
│   ├── db.js               # SQLite schema + connection
│   ├── middleware/auth.js  # JWT auth guard
│   ├── data/agmarknet_mock.js
│   └── routes/
│       ├── auth.js
│       ├── products.js
│       ├── orders.js
│       └── predict.js
├── public/                 # Static responsive frontend
│   ├── index.html          # Login / Register
│   ├── farmer.html         # Farmer dashboard
│   ├── buyer.html          # Buyer marketplace
│   ├── css/style.css
│   └── js/
├── render.yaml
├── package.json
└── .gitignore
```

## Run locally
```bash
npm install
npm start
# visit http://localhost:5000
```
Register once as a **farmer** and once as a **buyer** (use two different phone numbers,
e.g. in two browser tabs) to try the full flow: list produce → get AI price → order → track status.

## Deploy on Render (free tier)
1. Push this repo to GitHub (see branching workflow below).
2. In Render: **New → Web Service** → connect your repo.
3. Render will auto-detect `render.yaml`. If not, set manually:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
4. Add a **Render Disk** (1 GB is plenty) mounted at `/data` so your SQLite
   database survives redeploys, and set env var `DB_PATH=/data/agridirect.db`.
   (`render.yaml` already does this for you.)
5. Deploy. Your app will be live at `https://<your-service-name>.onrender.com`
   and works on desktop, mobile and tablet browsers out of the box (it's a
   responsive static site + API on one Node service — no separate deploy needed).

> Note: Render's free tier spins down after inactivity and the first request
> after that will be slow ("cold start") — normal for the free plan.

## Suggested Git branch workflow
```bash
git init
git add .
git commit -m "Initial working model: AgriDirect MVP"

git branch backend      # for API/DB work
git branch frontend     # for UI work
git checkout -b feature/ai-pricing-v2   # example feature branch

# push to GitHub
git remote add origin <your-repo-url>
git push -u origin main
git push origin backend frontend
```
Merge feature branches into `main` via pull requests once tested.

## Where to extend for the full SIH vision
- Replace the mock pricing formula with a real regression model trained on
  Agmarknet/eNAM historical data + weather APIs.
- Add speech-to-text + regional-language voice guidance (Web Speech API or
  a cloud STT service) on top of the existing `public/js` files.
- Add a logistics-pooling service that batches nearby farmer orders by pin
  code before dispatch.
- Integrate UPI (e.g. Razorpay/Cashfree) in `server/routes/orders.js` for
  real escrow-style payments.
