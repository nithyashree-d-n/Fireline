# Fireline Project Overview for AI Analysis & Presentation Creation

## 1. Executive Summary
Fireline is an open-source, satellite-driven wildfire intelligence platform created for the NASA Space Apps Challenge 2026. It normalizes and aggregates 8 years of Earth observation data (2018 through 2025) from NASA FIRMS (MODIS Terra/Aqua and VIIRS Suomi-NPP / NOAA-20 / NOAA-21) covering 200+ countries and global administrative subdivisions.

---

## 2. The Core Problem
- **Massive File Sizes**: Raw satellite fire archives from NASA FIRMS are distributed as multi-gigabyte CSV spreadsheets. Standard laptops and field devices freeze when attempting to filter or open them.
- **Complex GIS Hurdles**: Traditional desktop software (QGIS, ArcGIS) requires heavy installations, licensing, and GIS training that first responders, park rangers, and local fire crews do not have time for.
- **Mismatched Instruments**: MODIS records at a 1 km pixel scale, whereas VIIRS detects smaller fires at 375 m. Without cross-sensor normalization, multi-year comparisons produce distorted numbers.

---

## 3. How Fireline Solves This
1. **Out-of-Core DuckDB Ingestion**: An automated Python pipeline streams multi-gigabyte CSV files directly off disk, matching coordinates to administrative boundaries without exhausting computer memory.
2. **Compact Global Index**: Pre-aggregates annual fire volumes, monthly matrices, and fire radiative power distributions into a lightweight JSON index, giving instant sub-second browser loads across 200+ countries.
3. **Decoupled Dual-Map Spatial Exploration**:
   - **Upper National Map**: Focuses on national trends across all years (2018-2025), months, and sensors.
   - **Lower Regional Deep-Dive Map**: Operates completely independently, allowing users to zoom into an individual state or province over a custom date range without altering the national map.
4. **Physical Combustion Radiance Colors**:
   - Pale Lemon Yellow: Low intensity (<25 MW, smoldering agricultural clears).
   - Amber Orange: Moderate brush and woodland burns (25-100 MW).
   - Deep Crimson Red: Severe blowup wildfires (>100 MW).
5. **Real-Time On-The-Fly Metrics**:
   - **Seasonal Burning Window**: Identifies top 3 peak burning months and calculates what percentage of annual fires occur in that window.
   - **Multi-Year Sparklines**: 8-year trend bars with year-over-year escalation percentages (+X% or -X%).
   - **Energy Strength Spectrum**: Stacked percentage bars dividing fires into small, medium, and emergency categories.
6. **Field-Ready PDF Incident Briefings**:
   - One-click export producing clean, printable A4/Letter incident briefings with live satellite map captures, hottest fire coordinates, and operational forestry guidance.

---

## 4. Key Files Included in This Package
- `src/main.jsx`: The complete React 18 application containing MapLibre GL map setup, state management, calculation engines, and HTML/PDF export generator.
- `src/style.css`: Clean responsive theme styling with support for both dark and light modes.
- `pipeline/harmonize.py`: Python DuckDB pipeline script for streaming and harmonizing raw NASA FIRMS CSV archives.
- `public/country_subdivisions.json`: Complete territorial bounding boxes and state administrative polygons.
- `public/analytics_data.json`: Pre-computed national aggregate metrics.
- `public/sample_global_country_analytics.json`: Sampled lightweight dataset preserving full statistical structures, annual totals, and subdivision metrics for all 200+ countries.
- `README.md`, `ARCHITECTURE.md`, `DATA_PROCESSING.md`, `SUBMISSION.md`: Full architectural, data processing, and competition documentation.
- `Fireline_Project_Demonstration_NASA_Space_Apps.pptx`: The 7-slide presentation in professional light mode (>=16pt font size).
