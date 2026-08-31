# AgriPredict AI 🌾

> **Smart Market Intelligence and Price Discovery Platform for Farmers**  
> **SIH Problem Statement 26132**: Strengthening market linkages and price discovery for farmers.

---

## 🚀 Quick Start Guide

You can run AgriPredict AI in two convenient ways:

### Option 1: Live FastAPI Python Backend (Recommended)
Run the backend server which serves the API and the web application:
```powershell
cd C:\Users\dell\.gemini\antigravity\scratch\agripredict-ai
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
Then open your web browser at:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

### Option 2: Standalone Browser Launch (Zero-Setup)
Simply double-click or open `index.html` directly in any web browser (Chrome, Edge, Firefox, Safari). The built-in client-side simulation engine will handle all calculations offline without needing a server!

---

## 🌟 Core Features & User Flow

### 1. Landing Page
- Problem Statement 26132 overview
- Live Mandi commodity ticker with 8+ major crops (Onion, Tomato, Cotton, Potato, Wheat, Soybean, Paddy, Chilli)
- Quick produce selector and instant navigation

### 2. Produce Analysis Input Page
- Step-by-step produce profile:
  - **Commodity Selection** with visual icon cards
  - **Quantity Input** (in Quintals / 100 kg bags)
  - **Quality Grade** (Grade A Premium, Grade B Standard, Grade C Fair)
  - **Farm Location** (District / Nearest Hub)
  - **Storage Facility Availability** toggle

### 3. AI Analysis Loading Animation
- Animated real-time step-by-step progress:
  1. Mandi spot price retrieval
  2. 30-day historical trend & arrival volume analysis
  3. Multi-mandi logistics & net return equation solving
  4. Verified buyer demand matching

### 4. Market Intelligence Dashboard
- **Current Market Price**: Live Agmarknet/APMC spot benchmark
- **Predicted Price**: Multi-day ML forecasted price (e.g., +10.3% in 5 days)
- **Best Market**: Identified highest-paying APMC mandi after deducting freight
- **Estimated Net Return**: Calculated via $\text{Net Return} = (\text{Price} \times \text{Quantity}) - \text{Transport} - \text{Storage}$
- **AI Action Verdict**: Prominent action badge (`WAIT FOR 5 DAYS`, `SELL NOW`, `SELL AT BEST MANDI`)
- **Price Trend Chart**: Interactive Chart.js graph with 30-day history + 7-day forecast + confidence interval bands
- **Multi-Mandi Logistics Grid**: Detailed mandi-by-mandi comparison table with e-NAM status and facilities

### 5. AI Recommendation & Explainability ("Why this recommendation?")
- **Farmer-Friendly Explanation**: Simple non-technical summary
- **5-Factor Impact Breakdown**:
  1. Historical Price Momentum
  2. Mandi Inflow & Arrivals
  3. Buyer Demand Pressure
  4. Storage Cost Viability
  5. Logistics & Distance Tradeoff
- **Audio Voice Explainer**: Text-to-Speech narration via Web Speech API
- **Interactive "What-If" Scenario Simulator**: Sliders for storage duration and transport rates with instant net return updates

### 6. Buyer Matching Page
- Lot profile header with matched institutional buyers (BigBasket, Reliance Retail, ITC Agri Business, Local Wholesalers, FPOs)
- Match Scores (95%, 92%, 89%), offer prices, distance, reliability ratings
- Direct Call & WhatsApp buttons
- **Digital Deal Slip Generator**: Generates a printable purchase confirmation slip with Reference ID and net return calculation

---

## 🛠️ Tech Stack
- **Frontend**: HTML5, Tailwind CSS, Lucide / FontAwesome 6, Chart.js 4.4, Modern ES Modules
- **Backend API**: Python 3.14, FastAPI, Uvicorn, Pydantic
- **Design**: Agricultural theme (Emerald, Amber, Slate), mobile-responsive, dark/light mode, multilingual (English, Hindi, Telugu)
- **Zero Authentication Friction**: Direct access designed specifically for hackathon judging and farmer accessibility.
