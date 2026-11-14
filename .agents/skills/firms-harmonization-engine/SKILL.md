---
name: firms-harmonization-engine
description: Harmonize 1km MODIS and 375m VIIRS active fire detections onto a common spatial-temporal grid with overlap-period calibration and overpass deduplication. Use when building the harmonization math or backend aggregation.
---
# MODIS-VIIRS Harmonization Engine
1. Project all filtered hotspots onto a uniform spatial grid (Uber H3 Resolution 5 or 6, or 0.05-degree equal-area cells) and daily (`YYYY-MM-DD`) buckets so 375m VIIRS pixels do not artificially inflate counts relative to 1km MODIS pixels.
2. Deduplicate multi-satellite overpasses (Terra, Aqua, Suomi-NPP, NOAA-20, NOAA-21) occurring within the same grid cell and UTC date so a single persistent fire is counted once per cell-day.
3. Calibrate sensor sensitivity using the 2012-2023 MODIS+VIIRS co-observation overlap window: compute sensor-specific scaling ratios for active cell counts and Fire Radiative Power (`frp`) to output a sensor-agnostic **Harmonized Fire Activity Index (HFAI)** alongside calibrated hotspot counts.
4. Compute multi-year historical baselines (monthly/dekadal median, 25th-75th IQR, and anomaly Z-score / % departure from median) from 2001 to present.
