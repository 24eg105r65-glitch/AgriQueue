# AgriQueue - Smart Crop Procurement & Mandi Queue Platform (SIH26032)

AgriQueue is an end-to-end multi-stakeholder Farmer Crop Procurement, Digital Weighbridge, Quality Testing, and Mandi Queue Optimization ecosystem with **full offline multilingual voice assistance** and **real-time UI translation across 9 Indian languages**.

---

## 🏛️ Stakeholder Portals & Modules

1. **🧑‍🌾 Module 1: Farmer Portal** (`farmer_dashboard.html` / `index.html`)
   - 9-language instant translation (`hi`, `te`, `ta`, `pa`, `mr`, `kn`, `bn`, `gu`, `en`).
   - Voice-guided form filling (210+ pre-rendered localized MP3 audio voice packs).
   - Dynamic MSP payout calculation & Digital Queue Token generation (`TK-XXXX`).
   - Real-time queue tracker & AI wait time estimator.

2. **🚪 Module 2: Gate & Weighbridge Operator** (`gate_operator.html`)
   - Token / vehicle / farmer lookup & simulated QR intake scanner; farmer bookings appear automatically.
   - Check-in with the vehicle number saved at booking, entry-gate choice & least-loaded open weighbridge lane (lanes closed by the Mandi Secretary are disabled).
   - Quality Lab gating (weighbridge blocked until moisture analysis passes; rejected lots can never be weighed).
   - Electronic Gross & Tare scale capture, Net weight calculation, and Electronic Weighment Slip printing.

3. **🔬 Module 3: Quality Lab & Moisture Testing** (`quality_inspector.html`)
   - Arrived trolley queue & digital moisture analyzer simulator.
   - Grain grading against official FCI standards (Paddy $\le 14\%$, Wheat $\le 12\%$, Maize $\le 14\%$, Chana $\le 12\%$, Mustard $\le 8\%$).
   - Automated grade decisions: Grade A (Full MSP), Grade B (Moisture deduction), or Safe Storage Rejection.
   - Official cryptographic Quality Inspection Certificate issuance.

4. **🏛️ Module 4: Mandi Secretary & District Admin** (`admin_dashboard.html`)
   - Multi-center Live Mandi Heatmap & yard congestion tracking.
   - Dynamic counter management (open/close lab counters & weighbridge lanes) with live wait time recalculation.
   - Real-time procurement quotas vs actuals progress per crop.
   - M/M/c Erlang-C congestion alert system & arrival surge simulation.

5. **🏦 Module 5: FCI & Government DBT Settlement** (`dbt_portal.html`)
   - Batch J-Form approval with a pre-approval checklist (weighment, quality, bank account, hold) and per-token skip reasons.
   - Simulated PFMS banking engine: batches, UTR numbers and automatic Dispatched → In Transit → Settled tracking (settlement ticks the farmer's *DBT Paid* step).
   - Holds, an audit log of every action, printable J-Forms, and procurement-register export to CSV (Excel) and PDF.

**Farmer Auth & KYC** (`login.html` / `signup.html`)
   - 1-click demo logins (`Ramesh Chand`, `Sukhwinder Singh`, `Venkat Rao`).
   - Aadhaar, landholding & DBT bank account capture (the bank account is what Module 5 pays into).

---

## 🌾 Supported Languages
Every language supports **instant UI translation** and **crystal-clear pre-recorded MP3 audio playback**:
1. **हिन्दी (Hindi)** - `hi`
2. **తెలుగు (Telugu)** - `te`
3. **தமிழ் (Tamil)** - `ta`
4. **ਪੰਜਾਬੀ (Punjabi)** - `pa`
5. **मराठी (Marathi)** - `mr`
6. **ಕನ್ನಡ (Kannada)** - `kn`
7. **বাংলা (Bengali)** - `bn`
8. **ગુજરાતી (Gujarati)** - `gu`
9. **English** - `en`

---

## 🚀 How to Run Locally

Start a local server:
```bash
python -m http.server 3000 --directory public
```

Access the stakeholder portals:
- **Farmer Portal**: `http://localhost:3000/farmer_dashboard.html`
- **Gate & Weighbridge**: `http://localhost:3000/gate_operator.html`
- **Quality Lab**: `http://localhost:3000/quality_inspector.html`
- **Mandi Admin**: `http://localhost:3000/admin_dashboard.html`
- **DBT Settlement**: `http://localhost:3000/dbt_portal.html`
- **Farmer Login**: `http://localhost:3000/login.html`

