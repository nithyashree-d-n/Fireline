---
name: nasa-firms-ingestion
description: Ingest and standardize NASA FIRMS MODIS and VIIRS active fire hotspot CSV/Parquet archives and Area API feeds into a unified schema. Use when inspecting /data or building ingestion pipelines.
---
# NASA FIRMS Ingestion Workflow
1. Inspect all CSV/Parquet files in `/data` and reference docs in `/resources` first.
2. Normalize differing sensor schemas into one unified DuckDB/Parquet table (`hotspot_id`, `sensor`, `satellite`, `acq_date`, `acq_time`, `lat`, `lon`, `frp`, `confidence_norm`, `scan`, `track`):
   - MODIS (`MODIS_SP`, `MODIS_NRT`): map `brightness` (Ch21/22), `bright_t31`, and numeric `confidence` (0-100; keep `>= 50` as nominal/high).
   - VIIRS (`VIIRS_SNPP_SP`, `VIIRS_NOAA20_SP`, `VIIRS_NOAA21_SP`): map `bright_ti4`, `bright_ti5`, and categorical `confidence` (`l` -> low, `n` -> nominal, `h` -> high; keep `n` and `h`).
3. Support optional NASA FIRMS Area API updates (`/api/area/csv/[MAP_KEY]/[SOURCE]/[west,south,east,north]/[DAY_RANGE]/[DATE]`) via `.env` (`FIRMS_MAP_KEY`) without hardcoding keys.
