# AgriQueue - Smart Crop Procurement & Mandi Queue Platform (SIH26032)

AgriQueue is a dedicated Farmer Procurement & Mandi Queue Management dashboard with **full offline multilingual voice assistance** and **real-time UI translation across 9 Indian languages**.

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

Open in your browser:
```text
http://localhost:3000/farmer_dashboard.html
```
or
```text
http://localhost:3000/index.html
```

---

## 🔊 Features & Voice Architecture

1. **Regional Language Selector**:
   - Switching the language dropdown in the header immediately translates all cards, labels, buttons, MSP tickers, queue trackers, and table receipts without page reload.
   - Automatically plays a spoken confirmation greeting in the chosen language.

2. **Field Voice Assistance**:
   - Click the 🔊 speaker button on any form input (Crop, Quantity, Hub, Slot, Vehicle, Moisture standards, DBT bank transfer) to hear clear localized audio guidance in your active language.
   - Uses pre-rendered high-quality audio files from [`public/voice-audio/`](public/voice-audio/).

3. **Digital Queue Token & Live Payout**:
   - Generates digital tokens (e.g., `TK-1042`) with real-time AI wait estimates.
   - Calculates Government MSP payout as per FCI moisture norms.
   - Spoken audio announcement upon token booking.
