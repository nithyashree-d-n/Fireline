# NASA FIRMS Data Ingestion & Extraction Workflow

## 1. Overview

Fireline transforms multi-gigabyte raw satellite fire records from NASA FIRMS into fast, browser-ready spatial analytics. This document details how raw CSV datasets were acquired, normalized, extracted, and structured into the production system.

---

## 2. Satellite Sources & Sensors

The application leverages NASA active fire products:
- **VIIRS (Visible Infrared Imaging Radiometer Suite)**:
  - Satellites: Suomi-NPP, NOAA-20, NOAA-21
  - Spatial Resolution: 375 meters per pixel
  - Primary Channels: I-band (I4 3.74 um and I5 11.45 um)
- **MODIS (Moderate Resolution Imaging Spectroradiometer)**:
  - Satellites: Terra and Aqua
  - Spatial Resolution: 1 kilometer per pixel
  - Primary Channels: 4 um and 11 um thermal bands

---

## 3. Data Download & Extraction Strategy

### Step 1: Bulk CSV Retrieval
Raw active fire records were obtained from the NASA FIRMS download repository:
- Global archives downloaded by year (2018 through 2025).
- File archives include:
  - `viirs-jpss1_YYYY_all_countries.zip` (NOAA-20 VIIRS)
  - `viirs-snpp_YYYY_all_countries.zip` (Suomi-NPP VIIRS)
  - `modis_YYYY_all_countries.zip` (MODIS Terra/Aqua)

### Step 2: High-Performance DuckDB Extraction
Because raw global CSV datasets exceed multiple gigabytes per year, conventional in-memory tools (e.g., standard pandas `read_csv`) cause memory exhaustion. Fireline utilizes an out-of-core DuckDB processing pipeline in `pipeline/harmonize.py`:
- Streams CSV lines from disk without loading complete tables into RAM.
- Normalizes column names (`latitude` / `lat`, `longitude` / `lon`, `acq_date`, `confidence`, `frp`).
- Assigns spatial bounding boxes to Natural Earth ISO territorial codes and administrative subdivisions.
- Filters invalid or zero-energy detections and classifies confidence tiers.

### Step 3: Production Aggregation Output
The pipeline pre-aggregates historical metrics into `public/global_country_analytics.json`:
- **Annual fire volumes** (2018 to 2025) per country.
- **Monthly distribution matrices** (12 months x 8 years) per country.
- **Subdivision hotspot collections** filtered and clustered for regional navigation.
- **Fire Radiative Power (FRP)** breakdown:
  - Low Intensity (<25 MW): Agricultural burns, crop clearing.
  - Medium Intensity (25–100 MW): Brushfires, woodland burns.
  - High Intensity (>100 MW): Extreme wildfire outbreaks requiring emergency mobilization.

---

## 4. Dataset Security & Distribution Policy

- **No Raw CSV Commits**: Raw multi-GB CSV files and database spill directories are excluded via `.gitignore` to prevent repository bloat.
- **Compact Production JSON**: The resulting pre-aggregated JSON files (`global_country_analytics.json` and `country_subdivisions.json`) allow instant client-side rendering with sub-second page loads across all 200+ countries.
