# NASA Space Apps Challenge Submission Brief

## Project Title
**Fireline: Harmonized Satellite Wildfire Intelligence Platform**

---

## Challenge Summary
Wildfire management agencies, emergency responders, and environmental researchers require timely, high-fidelity satellite observation data to detect fire outbreaks, understand burning seasons, and allocate containment assets before blazes spread uncontrollably. 

Raw satellite fire archives from NASA FIRMS are distributed as massive multi-gigabyte CSV files spanning multiple instruments (MODIS and VIIRS). This volume makes direct exploration by field responders and local decision-makers difficult without specialized GIS infrastructure.

Fireline bridges this gap by harmonizing NASA FIRMS satellite data across 200+ countries and global territories for 2018 through 2025. It packages this intelligence into a responsive dual-map web application with on-the-fly analytics, trend forecasting, side-by-side fire comparison, and one-click printable PDF incident briefings.

---

## Data Sources & Tools

### Space Agency Data Used
- **NASA FIRMS (Fire Information for Resource Management System)**:
  - VIIRS 375m active fire data from Suomi-NPP, NOAA-20, and NOAA-21 satellites.
  - MODIS 1km active fire data from Terra and Aqua satellites.
  - Coverage: 2018–2025 worldwide.
- **Natural Earth**:
  - Global administrative country boundaries and subdivision territorial bounding boxes.

### Technology Stack
- **Data Engineering**: Python 3.10+, DuckDB (out-of-core streaming CSV ingestion).
- **Frontend & Visualization**: React 18, Vite, MapLibre GL JS, HTML5 WebGL Canvas.
- **Cartographic Tiles**: CartoDB Positron & Dark Matter basemaps.
- **Reporting Engine**: Dynamic HTML5 print/PDF generation with WebGL snapshot rasterization and vector fallback rendering.

---

## Key Innovations

1. **Decoupled Dual-Map Spatial Exploration**:
   - The primary map visualizes national fire trends across whole countries.
   - The secondary map focuses independently on specific states or provinces over custom date ranges without resetting national filters.

2. **On-the-Fly Wildfire Intelligence**:
   - **Burning Pattern Analysis**: Automatically isolates peak burning windows (e.g. 3-month concentration ratios) to help agencies schedule crew readiness.
   - **Multi-Year Sparklines**: Displays 8-year trajectories (2018–2025) with year-over-year escalation metrics.
   - **Radiative Energy Breakdown**: Classifies fire heat into agricultural burns, brushfires, and dangerous high-intensity wildfires (>100 MW).

3. **Field-Ready PDF Incident Briefing**:
   - One-click export that generates an official briefing containing live map captures, top fire listings with coordinates, operational guidance, and analytical summary cards.

4. **Zero-Latency Ingestion Engine**:
   - Ingests and extracts multi-gigabyte raw CSV archives into lightweight pre-aggregated indices, enabling instant client-side performance without continuous server backend overhead.

---

## How to Test and Run the Solution

1. Open a terminal in the project directory:
   ```bash
   cd Fireline
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the application:
   ```bash
   npm run dev
   ```
4. Access the interface in your browser at `http://localhost:5173`.
