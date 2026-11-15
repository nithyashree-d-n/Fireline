# Fireline: Global NASA Wildfire Intelligence System

Fireline is a satellite observation and wildfire intelligence system developed for the NASA Space Apps Challenge. The platform processes multi-sensor active fire detections from NASA FIRMS (MODIS Terra/Aqua and VIIRS Suomi-NPP / NOAA-20 / NOAA-21), harmonizing raw satellite observations into structured, high-performance spatial analytics covering 200+ countries and global territories across 2018–2025.

---

## Key Features

- **Decoupled Dual-Map Architecture**:
  - **Upper National Map**: Dedicated nationwide overview with Year (2018–2025), Month, and Sensor filters.
  - **Lower Regional Deep-Dive Map**: Independent regional viewport filtered by state/subdivision and custom start/end month-year date ranges.
- **True Combustion Thermal Color Spectrum**: Thermal dots mapped along physics-based combustion temperatures (pale lemon yellow to amber, orange, vermilion, and deep crimson red for severe wildfires exceeding 100 MW).
- **In-Depth Analytical Cards**:
  - **Seasonal Burning Pattern**: Calculates peak fire windows and fire volume concentration across top burning months.
  - **Multi-Year Trend & Trajectory**: 8-year annual comparison (2018–2025) with dynamic micro-sparklines and year-over-year escalation percentages.
  - **Thermal Fire Strength**: FRP tier classification (Small & Agricultural Crop Clears, Medium Brushfires, and Large Emergency Wildfires).
- **Side-by-Side Fire Comparison Tray**: Inspect and compare up to 4 selected fires with exact coordinates, dates, instruments, and radiative power.
- **Reporting & Data Export**:
  - Export filtered national and regional datasets to CSV.
  - Export Comprehensive Printable Incident Briefings with synchronized satellite map snapshots, key metric cards, operational forestry guidance, and top fire listings.

---

## Project Structure & Architecture

```
Fireline/
├── public/
│   ├── global_country_analytics.json   # Pre-aggregated 8-year global intelligence dataset (200+ countries)
│   ├── country_subdivisions.json       # Administrative boundaries and bounding boxes
│   ├── analytics_data.json             # Core aggregated indices
│   └── favicon.svg                     # Application branding icon
├── src/
│   ├── main.jsx                        # Complete React + MapLibre GL UI, analytics engine, and export pipeline
│   └── style.css                       # Responsive theme styles (Dark / Light mode)
├── pipeline/
│   └── harmonize.py                    # DuckDB pipeline for ingesting and harmonizing bulk CSV datasets
├── DATA_PROCESSING.md                  # Comprehensive guide on raw CSV ingestion and data extraction
├── ARCHITECTURE.md                     # Technical architecture, dual-map decoupling, and export engine
├── SUBMISSION.md                       # NASA Space Apps submission brief, challenge details, and methodology
├── MANUAL.md                           # Operational and analytical manual
└── README.md                           # Primary repository overview
```

---

## Data Pipeline: CSV Ingestion & Extraction

Fireline ingests raw bulk CSV archives provided by NASA FIRMS (Fire Information for Resource Management System):
1. **Bulk Download**: VIIRS (375m) and MODIS (1km) CSV archives covering global fire activity from 2018 through 2025.
2. **DuckDB Extraction & Filtering**: Multi-gigabyte CSV records are scanned using DuckDB out-of-core streaming without exhausting system memory.
3. **Aggregation & Normalization**: Detections are assigned to country ISO codes and administrative boundaries, pre-aggregating monthly counts, radiative power distributions, and severe fire coordinates into `global_country_analytics.json`.
4. Raw multi-gigabyte CSVs are never bundled in git to maintain repository security and performance.

For complete data ingestion commands and extraction details, see [DATA_PROCESSING.md](DATA_PROCESSING.md).

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.10+ (for data ingestion pipeline)

### Installation & Run

1. Clone the repository and navigate to Fireline:
   ```bash
   git clone https://github.com/nithyashree-d-n/Fireline.git
   cd Fireline
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

---

## Strict Directives & Policies
- **Strict Zero Emoji Policy**: All documentation, code comments, and user interfaces adhere strictly to plain professional language without emojis.
- **Coverage**: 2018–2025 across 200+ countries.
- **Cartography**: Open basemaps powered by MapLibre GL and CartoDB (Dark Matter & Positron).
