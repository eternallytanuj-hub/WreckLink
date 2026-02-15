# Wreck Link (Sky Watcher)

**Aviation crash detection & monitoring platform**

## Project info

A 3D Night Sky Earth interface with flight tracking, anomaly detection, and satellite imagery analysis.

## 🚀 Unique Selling Points (USP)

WreckLink is not just a flight tracker; it is an **AI-powered Crash Prediction & Recovery System**.

### 1. Hybrid Intelligence Agent (Physics + GenAI)
Unlike standard trackers that just show "Last Known Location", WreckLink uses a **LangChain ReAct Agent** (`Llama-3-70b`) that combines:
- **EKF-Lite Physics Model**: Calculates trajectory drift based on wind vectors and ocean currents.
- **Probabilistic ML**: Uses historical data to predict debris accumulation zones.

### 2. Live Physics Simulation Engine
Includes an interactive "War Room" mode where operators can simulate crash scenarios.
- **Real-time Telemetry**: Visualizes signal loss, altitude decay, and impact velocity.
- **Transparent Math**: A **Physics HUD** overlays the map, showing the actual Kalman Filter equations and confidence decay in real-time.

### 3. Risk-Aware Analytics
Instead of passive traversing, the system proactively identifies **High Risk Zones** based on:
- Historical crash density (from 1908-2024 data).
- Current weather anomalies.
- Flight path deviations.

## Technologies

- **Frontend**: Vite, React, TypeScript, Leaflet (Custom Panes), Tailwind CSS
- **Backend**: Python (FastAPI)
- **AI/ML**: LangChain, Groq (Llama-3), NumPy (Physics)

## 💼 Commercialization & Business Model

WreckLink is designed with a **B2B SaaS** architecture in mind, targeting high-value aviation sectors.

| Tier | Target Audience | Features |
| :--- | :--- | :--- |
| **Analyst** | Aviation Enthusiasts | Live Tracking, Basic Risk Maps |
| **Airline** | Flight Operations | **AI Crash Prediction**, **Physics HUD**, Global Fleet Monitoring |
| **Insurer** | Risk Assessors | **Historical Risk API**, Anomaly Detection Alerts |

*See `brain/business_model.md` for full strategy.*

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Run the development server:
   ```bash
   bun dev
   ```
