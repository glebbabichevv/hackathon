# 📋 RiseOS — Full Project Documentation

> **AI-powered city management decision panel for Almaty, Kazakhstan**
> Hackathon Project · MVP · 2024
> Repository: https://github.com/glebbabichevv/hackathon

---

## 📌 Purpose

The **RiseOS** is a real-time analytical platform designed to monitor the state of the city and support executive decision-making. It aggregates data from **8+ live external sources** across **4 key sectors** — Transport, Ecology, Safety, and Utilities — and enriches it with AI-powered analysis, anomaly detection, forecasting, and cross-domain correlation.

### Three Core Questions It Answers:

| # | Question | How |
|---|----------|-----|
| 1 | **What is happening in the city right now?** | Real-time KPIs, live incident feed, interactive map |
| 2 | **How critical is it?** | Severity scoring, anomaly detection, city health index |
| 3 | **What actions should be taken?** | AI-generated recommendations, cross-sector correlations, predictions |

### Target Audience

- **Akim (Mayor) of Almaty** — full city overview
- **Head of Transport** — traffic, congestion, accidents
- **Head of Ecology** — air quality, emissions, weather impact
- **Head of Utilities (ЖКХ)** — electricity grid, water, heating
- **Head of Safety** — incidents, emergency response, crime

---

## 🛠️ Tech Stack

### Frontend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | React | 19.2.4 | UI rendering, component architecture |
| **Language** | TypeScript | ~5.9.3 | Type safety, interfaces, developer experience |
| **Build Tool** | Vite | 8.0.1 | Fast dev server, HMR, production builds |
| **Styling** | Tailwind CSS | 3.4.19 | Utility-first CSS, custom dark theme |
| **Charts** | Recharts | 3.8.1 | Area charts, radar charts, KPI history |
| **Maps** | Leaflet + react-leaflet | 1.9.4 / 5.0.0 | Interactive city map with CartoDB dark tiles |
| **2GIS Maps** | @2gis/mapgl + directions | 1.72.0 / 2.2.1 | Route traffic data visualization |
| **Animations** | Framer Motion | 12.38.0 | Page transitions, intro screen animations |
| **Icons** | Lucide React | 1.7.0 | Icon set for UI components |
| **3D Globe** | Cobe | 2.0.1 | Animated globe on intro/loading screen |
| **Utilities** | clsx | 2.1.1 | Conditional CSS class merging |
| **Typography** | Inter (Google Fonts) | 400–800 | Primary typeface |

### AI / ML Layer

| Technology | Type | Purpose |
|-----------|------|---------|
| **Ollama** (llama3.2, mistral, qwen2.5) | Local LLM | City analysis, chat, incident generation, RSS NLP — runs fully offline |
| **Claude API** (claude-haiku-4-5) | Cloud LLM | Cloud fallback for AI analysis and chat |
| **Anthropic SDK** | npm package | Streaming API client for Claude |
| **Z-score + IQR** | Custom algorithm | Anomaly detection on KPI history |
| **Linear Regression** | Custom algorithm | KPI forecasting (+1h, +2h, +4h) |
| **Correlation Engine** | Rule-based engine | 6 cross-domain rules detecting hidden patterns |

### Dev Tooling

| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| PostCSS + Autoprefixer | CSS processing |
| Vite Proxy | CORS bypass for RSS/news feeds |

---

## 🔗 Integrations (External Data Sources)

### ✅ Live / Real-Time APIs

| # | Source | Data Provided | Update Interval | API Key Required |
|---|--------|--------------|-----------------|-----------------|
| 1 | **Open-Meteo Weather** | Temperature, humidity, wind speed/direction, precipitation, weather code (WMO) | Every 2 min | ❌ No |
| 2 | **Open-Meteo CAMS** | PM2.5, PM10, NO₂, CO, Ozone, European AQI (satellite-based) | Every 5 min | ❌ No |
| 3 | **USGS GeoJSON Feed** | Earthquakes M≥2.5 in the Almaty region, magnitude, depth, distance | Every 10 min | ❌ No |
| 4 | **WAQI (aqicn.org)** | Ground-level AQI stations across Almaty districts | Every 10 min | ✅ `VITE_WAQI_TOKEN` |
| 5 | **HERE Traffic API v7** | Road incidents (accidents, closures), with coordinates | Every 2 min | ✅ `VITE_HERE_API_KEY` |
| 6 | **OpenWeatherMap** | AQI current + 6-hour air quality forecast | Every 30 min | ✅ `VITE_OWM_KEY` |
| 7 | **2GIS Routing API** | Route congestion on key Almaty roads | Every 10 min | ✅ `VITE_2GIS_KEY` |
| 8 | **Nominatim (OSM)** | Geocoding addresses → lat/lng coordinates | On-demand | ❌ No |
| 9 | **OpenSky Network** | Low-altitude aircraft (<1500m) over Almaty | Every 5 min | ❌ No |
| 10 | **RSS Feeds** (tengrinews.kz, zakon.kz, informburo.kz) | News headlines → Ollama classifies as city incidents | Every 15 min | ❌ No |
| 11 | **data.egov.kz** | Citizen complaints to Almaty Akimat, district stats | Daily | 🟡 Optional |

### 📊 Simulated / Mock Data

These KPIs have no publicly available APIs and are simulated with realistic time-of-day and weather-influenced patterns:

| KPI | Why Mocked | Simulation Method |
|-----|-----------|-------------------|
| Road congestion % | Yandex/2GIS live data is paid | Peaks at 08:00 & 18:00, weather coefficient |
| Average traffic speed | No open API | Inverse of congestion + weather factor |
| Bus punctuality | Almaty Transport — closed data | Time-of-day pattern |
| Water pressure | AlmatySu — no public API | Day/night pattern |
| Electricity grid load | AlmatyEnergo — closed | Real temperature → recalculation |
| Heating supply | KazMunaiGas — closed | Static high value (winter) |
| MVD incident count | MVD Kazakhstan — closed | Night peaks, weekends |
| Emergency response time (103/112) | Closed data | Peak during rush hours |
| CCTV coverage % | MVD — closed | Static value |
| Fire calls | Emergency Ministry — not real-time | Low random value |

> **Note:** The hackathon task explicitly allows mock data. All simulated KPIs follow real-world patterns (time-of-day, weather influence), not random noise.

---

## 🧠 AI Functionalities

### 1. AI City Analyst (`aiService.ts`)
- **Input:** All current KPIs + active incidents across 4 sectors
- **Output:** Structured JSON answering the 3 management questions + 3 predictions
- **Primary provider:** Claude Haiku 4.5 (streaming)
- **Fallback chain:** Claude → Ollama → Rule-based deterministic analysis
- **Streaming:** Real-time progress display as AI generates response

### 2. AI Chat (`chatService.ts` + `ChatPanel.tsx`)
- Free-form Q&A about the city state
- Context includes all live KPIs and active incidents
- Supports both Claude and Ollama backends
- User can switch AI provider and model in real-time

### 3. Anomaly Detector (`anomalyDetector.ts`)
- **Method:** Z-score > 2.0 against 24-hour KPI history
- **Secondary filter:** IQR (Interquartile Range) — robust against outliers
- **Output:** Anomaly flag with confidence level (high/medium/low) and direction (up/down)
- Visual highlight on KPI cards when anomaly is detected
- **Fully custom algorithm — no external API**

### 4. Prediction Engine (`predictionEngine.ts`)
- **Method:** Least squares linear regression on KPI history
- **Horizons:** +1 hour, +2 hours, +4 hours
- **Output:** Predicted values + R² quality score
- Alert: "Will reach critical threshold in ~X hours"
- **Dual forecast:** Custom algorithm predictions shown alongside OpenWeatherMap's 5-day AQI forecast

### 5. Correlation Engine (`correlationEngine.ts`)
Six cross-domain rules that detect hidden patterns between sectors:

| # | Rule | Trigger Conditions | Confidence |
|---|------|--------------------|-----------|
| 1 | **Cascade accident risk** | Rain + congestion > 65% + rush hour | 87% |
| 2 | **Morning road paralysis** | Snowfall at night → predict 08:00 gridlock | 82% |
| 3 | **AQI spike to morning** | AQI > 60 + wind < 8 km/h + night | 78% |
| 4 | **Grid cascade shutdown** | Electricity load > 88% | 91% |
| 5 | **Fog + rush hour risk** | Fog + rush hour | 73% |
| 6 | **Night incident surge** | Incidents > 15/hr + nighttime | 74% |

### 6. AI Incident Generator (`incidentGenerator.ts`)
- Ollama generates realistic city incidents every 60 seconds
- 3 incidents on app startup
- Incidents assigned to sectors with severity, location, coordinates

### 7. RSS → NLP Pipeline (`newsIncidentService.ts`)
- Fetches RSS from 3 Kazakh news sources (via Vite proxy)
- Ollama classifies each headline: is it a city incident?
- If yes: extracts sector, severity, location, recommendations
- Nominatim geocodes the address → coordinates → map marker
- **Fully local pipeline — no paid APIs**

---

## 🗺️ Interactive Map

Built with **Leaflet + react-leaflet** using **CartoDB Dark Matter** tiles.

| Marker Type | Color | Source | Live? |
|-------------|-------|--------|-------|
| Earthquake | 🔴 Red | USGS | ✅ Real |
| Traffic accident / road closure | 🔴/🟡 | HERE Traffic | ✅ Real |
| News incident | 🟠 Orange | RSS → Ollama | ✅ Real |
| AQI station | 🟢/🟡/🔴 | WAQI | ✅ Real |
| Emergency helicopter | 🔵 Blue | OpenSky | ✅ Real |
| AI correlation | 🟣 Purple | Custom algorithm | Prediction |
| Heatmap layer | Gradient | All incidents | Aggregation |

Features:
- Popup details on click (source, severity, time, description)
- Auto-updates as new incidents arrive
- Visual pulse/glow for new incidents

---

## 💻 UI Components (19 total)

| Component | File | Purpose |
|-----------|------|---------|
| `IntroScreen` | `IntroScreen.tsx` | Animated landing with Cobe globe and Framer Motion transitions |
| `RoleSelector` | `RoleSelector.tsx` | Role selection (Akim, Transport, Ecology, etc.) — KZ/RU |
| `CityHeader` | `CityHeader.tsx` | City health index, current weather, live clock |
| `LiveDataBar` | `LiveDataBar.tsx` | Scrolling ticker with real-time data (weather, AQI) |
| `KPICard` | `KPICard.tsx` | KPI card with trend, source badge, anomaly indicator |
| `SectorPanel` | `SectorPanel.tsx` | Sector panel with KPIs + history chart |
| `SectorChart` | `SectorChart.tsx` | Recharts area chart for KPI history |
| `CityMap` | `CityMap.tsx` | Full interactive Leaflet map with all marker types |
| `AlertPanel` | `AlertPanel.tsx` | Incident list with severity, source, timestamp |
| `AIAdvisor` | `AIAdvisor.tsx` | Three-question AI analysis panel + 🔊 voice readout |
| `CorrelationPanel` | `CorrelationPanel.tsx` | Cross-domain warnings with confidence % |
| `PredictionPanel` | `PredictionPanel.tsx` | Timeline of KPI predictions (+1h/+2h/+4h) |
| `ChatPanel` | `ChatPanel.tsx` | AI chat with full city context |
| `OverviewRadar` | `OverviewRadar.tsx` | Recharts radar chart across all sectors |
| `EcologyRealPanel` | `EcologyRealPanel.tsx` | Detailed real air quality data panel (CAMS + WAQI + OWM) |
| `AIProviderSelector` | `AIProviderSelector.tsx` | Toggle between Claude / Ollama + model picker |
| `ExportButton` | `ExportButton.tsx` | Export situational report as HTML (print/PDF) |
| `DataSourcesBadge` | `DataSourcesBadge.tsx` | Visual badges showing active data sources |
| `ToastContainer` | `ToastContainer.tsx` | Push notifications for new incidents |

---

## 🔧 Services Layer (15 modules)

| Service | File | Purpose |
|---------|------|---------|
| `realDataService` | `realDataService.ts` | Aggregates weather + AQI from OWM + Open-Meteo, applies to city state |
| `aiService` | `aiService.ts` | Claude/Ollama streaming city analysis with fallback chain |
| `chatService` | `chatService.ts` | AI chat with city context injection |
| `ollamaService` | `ollamaService.ts` | Ollama HTTP client (streaming) |
| `earthquakeService` | `earthquakeService.ts` | USGS GeoJSON feed + Haversine distance filter |
| `waqiService` | `waqiService.ts` | WAQI station data for Almaty districts |
| `hereService` | `hereService.ts` | HERE Traffic API v7 incident fetcher |
| `owmService` | `owmService.ts` | OpenWeatherMap current weather + AQI + 6h forecast |
| `twogisService` | `twogisService.ts` | 2GIS route congestion calculation |
| `openSkyService` | `openSkyService.ts` | OpenSky low-altitude aircraft detector |
| `newsIncidentService` | `newsIncidentService.ts` | RSS → Ollama NLP → Nominatim geocoding pipeline |
| `incidentGenerator` | `incidentGenerator.ts` | AI-powered incident generation (Ollama) |
| `correlationEngine` | `correlationEngine.ts` | 6-rule cross-domain correlation detector |
| `predictionEngine` | `predictionEngine.ts` | Linear regression KPI forecaster |
| `anomalyDetector` | `anomalyDetector.ts` | Z-score + IQR anomaly detector |

---

## 📁 Project Structure

```
hackathon/
├── index.html                  # Entry HTML with Inter font
├── package.json                # Dependencies & scripts
├── vite.config.ts              # Vite config with RSS proxy
├── tailwind.config.js          # Custom dark theme (city-* colors)
├── tsconfig.json               # TypeScript config
├── postcss.config.js           # PostCSS + Autoprefixer
├── eslint.config.js            # ESLint configuration
├── .env                        # API keys (WAQI, HERE, OWM, 2GIS, Claude)
├── .env.example                # Template for API keys
├── public/                     # Static assets
└── src/
    ├── main.tsx                # React entry point
    ├── App.tsx                 # Main app (598 lines) — state management, data fetching loops
    ├── App.css                 # Global styles
    ├── index.css               # Tailwind directives
    ├── components/             # 19 UI components
    ├── services/               # 15 service modules
    ├── data/
    │   └── mockData.ts         # Initial mock data & generators
    └── types/
        └── city.ts             # Core TypeScript interfaces (CityState, KPI, Alert, Sector)
```

---

## 🔄 Data Flow & Update Intervals

```
┌─────────────────────────────────────────────────┐
│                 External APIs                    │
│  Open-Meteo · USGS · WAQI · HERE · OWM · 2GIS  │
│  OpenSky · RSS feeds · Nominatim · data.egov    │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│        Services Layer            │
│  15 modules fetching & parsing   │
│  + AI analysis pipeline          │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│      App.tsx State Manager       │
│  CityState: {                    │
│    sectors: transport, ecology,  │
│              safety, utilities   │
│    overallScore, alerts, KPIs    │
│  }                               │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│       19 UI Components           │
│  Map, Charts, AI Panel, Chat,   │
│  Alerts, Export, Role Selector   │
└──────────────────────────────────┘
```

| Data Source | Interval |
|------------|----------|
| Weather + AQI (Open-Meteo, OWM) | 2 min |
| HERE Traffic incidents | 2 min |
| Earthquake + WAQI stations | 10 min |
| 2GIS route traffic | 10 min |
| RSS news → Ollama NLP | 15 min |
| OpenWeatherMap forecast | 30 min |
| OpenSky aircraft | 5 min |
| KPI mock fluctuations | 30 sec |
| AI incident generation | 60 sec |
| Correlation + prediction recompute | On data change |

---

## 🚀 Quick Start

```bash
# 1. Clone & install
git clone https://github.com/glebbabichevv/hackathon.git
cd hackathon
npm install

# 2. Set up API keys
cp .env.example .env
# Edit .env with your keys (WAQI, HERE, OWM, 2GIS, Anthropic)

# 3. Start dev server
npm run dev

# 4. (Optional) For local AI — install Ollama
ollama pull llama3.2
ollama serve
```

---

## 🔑 API Keys Required

| Service | Where to Get | Time | Required? |
|---------|-------------|------|-----------|
| WAQI | [aqicn.org/data-platform/token](https://aqicn.org/data-platform/token) | 2 min | ✅ Yes |
| OpenWeatherMap | [openweathermap.org](https://openweathermap.org) | 2 min | ✅ Yes |
| 2GIS | [dev.2gis.com](https://dev.2gis.com) | 5 min | ✅ Yes |
| HERE | [developer.here.com](https://developer.here.com) | 5 min | ✅ Yes |
| Anthropic (Claude) | [console.anthropic.com](https://console.anthropic.com) | 2 min | 🟡 Optional (for cloud AI) |
| USGS | — | — | ❌ Not needed |
| Open-Meteo | — | — | ❌ Not needed |
| Nominatim | — | — | ❌ Not needed |
| OpenSky | — | — | ❌ Not needed |
| Ollama | localhost | — | ❌ Not needed (runs locally) |

---

## 🎯 Key UX Features

- **Role-based entry** — Choose role (Akim, Transport, Ecology, etc.) to get a focused view
- **Interactive city map** — Real accidents (HERE), earthquakes (USGS), AQI stations (WAQI), helicopters (OpenSky), AI correlations
- **Live data ticker** — Scrolling bar with real-time weather & air quality data
- **Crisis simulation** — One button triggers 3 parallel incidents to stress-test the system
- **Voice readout** — Web Speech API reads AI analysis aloud in Russian
- **PDF export** — Download a full situational report for printing
- **AI provider switching** — Toggle between Claude (cloud) and Ollama (local) in real-time
- **Push notifications** — Toast alerts for new incidents
- **Dark premium UI** — Custom dark theme with cyan accents, glassmorphism, micro-animations

---

## 📐 Architecture Highlights

1. **Dual AI Strategy:** Claude (cloud, high quality) + Ollama (local, privacy, offline) with automatic fallback
2. **Real data priority:** OWM station data takes priority over Open-Meteo model data when available
3. **Cross-domain intelligence:** Correlation engine links weather → traffic → safety → utilities
4. **Three-tier AI:** LLM (analysis/chat) → Statistical algorithms (anomalies/predictions) → Rule engine (correlations)
5. **Resilient design:** Every API fetch has timeout, error handling, and graceful fallbacks
6. **Weather-influenced simulation:** Mock KPIs react to real weather (rain → traffic, cold → electricity)

---

*Last updated: April 3, 2026*
