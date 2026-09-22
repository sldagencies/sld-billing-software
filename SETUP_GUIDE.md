# SLD Billing Software — Complete Setup Guide

## 📁 Project Structure
```
sld-billing-software/
├── backend/
│   ├── main.py              ← FastAPI backend
│   ├── requirements.txt     ← Python packages
│   ├── schema.sql           ← Database tables (run in Supabase)
│   └── .env.example         ← Environment variables template
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   ├── pages/           ← All 7 screen pages
    │   └── components/      ← Navbar, BillPrint
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## STEP 1 — Supabase Database Setup

1. Go to your Supabase project → SQL Editor
2. Paste the entire contents of `backend/schema.sql`
3. Click Run — all tables will be created ✅

---

## STEP 2 — Backend Setup (Railway)

1. Push entire project to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Select `sld-billing-software` repo
4. Set Root Directory to `backend`
5. Add these Environment Variables in Railway:

```
SUPABASE_URL=https://ihjihudsiczrxsxmzubz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GOOGLE_SHEET_ID=1vT6KEtygTZyQqSInNqzv0C1usm8g5iknafRaIkcnYzs
GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}  ← paste entire JSON as one line
JWT_SECRET=sld-billing-super-secret-2024
OWNER_PASSWORD=owner@sld2024
WORKER_PASSWORD=worker@sld2024
AISENSY_API_KEY=your_aisensy_key_here
SHOP_UPI_ID=your_upi_id@bank
SHOP_PHONE=918019093618
```

6. Railway will auto-deploy. Copy your Railway URL (e.g. https://sld-backend.railway.app)

---

## STEP 3 — Frontend Setup (Netlify)

1. In frontend folder, create `.env` file:
```
VITE_API_URL=https://sld-backend.railway.app
```

2. Push to GitHub
3. Go to Netlify → New Site → Import from GitHub
4. Set:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
5. Add environment variable: `VITE_API_URL` = your Railway URL
6. Deploy!

---

## STEP 4 — Google Sheets Setup

1. Open your price list Google Sheet
2. Add a new tab called `New Items` with headers:
   - A1: S. No | B1: Item | C1: Unit | D1: Price (₹)
3. Share the sheet with your service account email:
   `sld-billing@sld-billing-software.iam.gserviceaccount.com`
   Give Editor access

---

## LOGIN CREDENTIALS

| User | Username | Password |
|------|----------|----------|
| Owner (Dad) | `owner` | Set in OWNER_PASSWORD |
| Worker | `worker` | Set in WORKER_PASSWORD |

---

## FEATURES CHECKLIST ✅

- [x] Login (Owner + Worker roles)
- [x] Dashboard with pinned bills + today's stats
- [x] New Bill with product search from Google Sheets
- [x] Auto S.No + Enter key to add rows
- [x] Edit price per row (special rates)
- [x] GST toggle ON/OFF
- [x] Discount toggle with amount
- [x] Advance payment field
- [x] Print bill (exact layout - front + plain continuation pages)
- [x] Return bill feature
- [x] Bills History with search + filter
- [x] Mark bill as Paid
- [x] Customer Ledger
- [x] Credit/Pending screen
- [x] Reports (daily/weekly/monthly)
- [x] Settings with Price Adjustment
- [x] Add new item to "New Items" Google Sheets tab
- [x] Auto bill number (SLD + YYMM + sequential)
- [x] Indian number format (₹1,00,000)
- [x] 2-year bill data storage

## PENDING (needs AiSensy setup)
- [ ] WhatsApp auto reminders (needs AiSensy API key)
- [ ] Bill auto-share on WhatsApp after print
- [ ] UPI payment link in reminders
