# TradeSHIELD Next.js Frontend

TradeSHIELD is an institutional-grade FX Risk, Logistics Topology, and Trade Document Integrity platform built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Recharts**, and **@xyflow/react (React Flow v12)**.

---

## Architecture Overview

### 1. Recharts Implementations
- **USD/INR Spot History & 15-Day Forward Forecast (`src/components/forex/UsdInrForecastChart.tsx`)**:
  - Implemented using `ComposedChart`.
  - Primary Line for the median forecast trajectory.
  - Shaded Area representing the 90% confidence likely range.
  - Supports both **Stacked Area** (transparent base `lowerBand` + shaded `bandWidth`) and **Envelope Area** ([low, high] pairs).
  - Division line dividing historical spot prices from forward forecast horizon.
- **Forecast vs No-Change Baseline Comparison (`src/components/forex/BaselineComparisonChart.tsx`)**:
  - Compares model forecast trajectory against standard random-walk martingale no-change baseline (86.425).
  - Visualizes directional alpha (+14.4% accuracy edge, RMSE: ₹0.284).
- **Multi-Dimensional Risk Gauges (`src/components/forex/ForexRiskGauges.tsx`)**:
  - Semi-circular speedometer gauges for **FX Hedge Coverage Ratio**, **Logistics Congestion Index**, and **Document Integrity Score**.

### 2. React Flow Implementations (`@xyflow/react` v12)
- **Shipment Journey Topology (`src/components/shipments/ShipmentJourneyFlow.tsx`)**:
  - Visual route: Origin port (`Mundra`) → Transit Hubs (`Arabian Sea`, `Cape of Good Hope`, `Bay of Biscay`) → Destination (`Rotterdam`).
  - Risk-colored nodes (Green: Low, Amber: Moderate, Rose: Elevated/Critical).
  - **Custom Nodes**:
    - `PortCongestionNode`: Displays terminal dwell time (+1.9 days above baseline), gate congestion, and estimated demurrage risk.
    - `WeatherAlertNode`: Displays meteorological fronts (4.8m wave swell, 45 kts gale winds) and slow-steaming reroute advisories.
- **Contract Lifecycle State Machine (`src/components/contracts/ContractLifecycleFlow.tsx`)**:
  - Deterministic progression: `draft` → `hashed` → `signed` → `shipped` → `paid`.
  - Cryptographic SHA-256 digest anchor and RSA-4096 digital signatures from banks and corporate treasuries.
- **Document Traceability Graph (`src/components/contracts/DocumentTraceabilityGraph.tsx`)**:
  - Links Master Contract to Commercial Invoice, Packing List, Marine Insurance Certificate, Ocean Bill of Lading, and Certificate of Origin.
  - Highlights verified documents vs attention-needed tamper flags with interactive cryptographic verification inspector.

---

## Key Technical Setup Notes

1. **Packages**: Installed via `npm i recharts @xyflow/react swr lucide-react`.
2. **React Flow Stylesheet**: Imported in `src/app/globals.css`:
   ```css
   @import '@xyflow/react/dist/style.css';
   ```
3. **Explicit Container Heights**: Every React Flow canvas has an explicit height (`h-[540px] min-h-[500px]`, `h-[460px]`, `h-[520px]`) to ensure the canvas never renders blank.
4. **Server vs Client Separation**:
   - Page files (`src/app/page.tsx`, `src/app/forex/page.tsx`, `src/app/shipments/page.tsx`, `src/app/contracts/page.tsx`) are clean **Server Components**.
   - Interactive charts, flow topologies, and SWR data hooks are strictly isolated inside components marked `"use client"`.
5. **Client-Side SWR Data Fetching**:
   - Dashboards are behind authentication and driven by live feeds.
   - SWR hooks in `src/lib/api.ts` handle client-side caching, background revalidation, and graceful fallback to offline mock data when the backend is offline.
6. **FastAPI Backend Proxy**:
   - In `next.config.js`, `/api/:path*` rewrites to `process.env.FASTAPI_URL || 'http://localhost:8000/api/:path*'`.
   - Avoids browser CORS restrictions and keeps backend service endpoints secluded.

---

## Running the Application

### Development Server
```bash
cd frontend
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build & Run
```bash
cd frontend
npm run build
npm run start
```

