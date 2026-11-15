# Fireline System Architecture & Component Design

## 1. Architectural Highlights

Fireline is designed for fast, client-side exploratory analysis of global wildfire activity. It bridges large-scale Earth observation data with responsive map visualization and automated operational reporting.

---

## 2. Decoupled Dual-Map Engine

A central design requirement is complete decoupling between national-level monitoring and regional deep-dive exploration:

### Upper Map: National Exploration Hub
- **Scope**: Entire country boundary for selected nation (200+ countries).
- **Controls**:
  - Year filter (2018 through 2025 or All Years).
  - Month filter (January to December or All Months).
  - Sensor filter (All, MODIS, VIIRS).
- **Behavior**: Remains steady at the national scale; does not alter bounds when the user interacts with the regional hub below.

### Lower Map: Regional & Custom Timeframe Hub
- **Scope**: Dedicated administrative subdivision (state, province, department) or national subset.
- **Controls**:
  - State / Province dropdown with automatic camera flyTo and bounding box framing.
  - From and To month-year dropdown selectors spanning 2018 to 2025.
- **Behavior**: Only the lower map flies to the regional boundary and updates its hotspot GeoJSON layer (`regionalVisibleHotspots`), leaving the upper map undisturbed.

---

## 3. Real-Time Analytics Calculation Engine

Both hubs compute dynamic metrics directly from the active hotspot subset:

1. **Seasonal Burning Window**:
   - Aggregates monthly counts.
   - Calculates the top 3 peak burning months and computes the percentage share of annual fire volume compressed into that window.

2. **Multi-Year Sparklines & Trend Trajectory**:
   - Calculates annual fire totals for every year from 2018 through 2025 within the active spatial filter.
   - Computes year-over-year escalation (`+X.X% Increase` or `-X.X% Decrease`) compared to the prior year.
   - Renders visual micro-sparkline bars for quick trend evaluation.

3. **Radiative Heat Energy Breakdown**:
   - Classifies fires by Fire Radiative Power (MW).
   - Generates responsive horizontal energy spectrum bars indicating Small & Crop, Medium Brush, and Large Wildfire percentages.

---

## 4. PDF Incident Briefing & Snapshot Generator

The reporting module generates an official, printable two-section PDF incident report:

- **Section 1: National Wildfire Overview**:
  - Key performance indicator cards for national totals, timeline, and emergency blaze share.
  - Active Fire Map Snapshot captured from the main WebGL canvas.
  - Peak burning month rankings and 8-year annual comparison table.
  - National burning pattern, year trajectory, and fire intensity distribution cards.

- **Section 2: Regional Subdivision & Custom Timeframe Deep-Dive**:
  - Target subdivision KPI strip and custom timeframe metrics.
  - Regional Satellite Map Snapshot captured directly from the regional canvas with transparency verification.
  - Hottest Regional Wildfires table with dates, coordinates, heat output (MW), and sensor instruments.
  - Regional Operational Guidance briefing box styled in clean theme colors.
  - Regional Seasonal Burning Pattern, Multi-Year Sparkline, and Energy Tiers cards.

---

## 5. Map Rendering & Color Palette

- **Engine**: MapLibre GL JS with WebGL acceleration.
- **Basemaps**: CartoDB Positron (light mode) and CartoDB Dark Matter (dark mode).
- **Color Coding**: Strictly adheres to the physical combustion thermal spectrum:
  - Pale Lemon Yellow: Low intensity (<25 MW)
  - Amber Yellow: Moderate agricultural clearing (25–75 MW)
  - Amber Orange: Intense brush and woodland fire (75–200 MW)
  - Vivid Vermilion Red: Severe wildfire (200–600 MW)
  - Deep Crimson Red: Extreme blowup blaze (>600 MW)
