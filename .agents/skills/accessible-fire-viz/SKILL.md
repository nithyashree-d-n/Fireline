---
name: accessible-fire-viz
description: Build the interactive Burning Activity Calendar web application with map AOI selection, colorblind-safe ramps, anomaly metrics, and CSV export. Use when building the frontend UI.
---
# Accessible Burning Activity Calendar UI
1. Build a responsive web app (Vite + React + Tailwind + MapLibre GL + ECharts/Recharts) backed by pre-aggregated DuckDB/Parquet or lightweight API endpoints.
2. Map & AOI Selection: allow users to draw a polygon/bounding box directly on the map OR enter numeric `[west, south, east, north]` coordinates and date range (`2001-01-01` to present).
3. Burning Activity Calendar: render a Year x Month (and daily drill-down) heatmap showing:
   - Harmonized Hotspot Count & HFAI
   - Comparison of selected period against historical multi-year median (% anomaly and Z-score)
   - Peak fire months and top anomalous years summary cards.
4. Accessibility: strictly use colorblind-safe, perceptually uniform color ramps (**Cividis** or **YlOrRd** for intensity; **PuOr** or **RdYlBu** diverging scale for anomaly departure) with clear legends and keyboard/screen-reader labels.
5. Export: provide a 1-click **Download Harmonized CSV** button exporting all filtered harmonized records and summary statistics for the active AOI and date range.
