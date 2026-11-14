# Fireline: Harmonized MODIS + VIIRS Hot Spots

Fireline harmonizes NASA FIRMS active-fire detections into daily spatial cell-days and an interactive historical activity calendar. The Python pipeline scans global bulk CSV archives directly from disk with DuckDB, filters and aggregates out of core, and writes a DuckDB archive plus CSV, Parquet, and browser JSON outputs.

> **Data status:** This workspace has no raw satellite CSV files in `data/`; the app therefore displays a clearly labeled synthetic preview. Preview points are not NASA observations.

## Run locally

```powershell
cd D:\harmonization_nasa
.\.venv\Scripts\Activate.ps1
python pipeline\harmonize.py
npm run dev
```

Place FIRMS bulk CSV files in `data/` (subfolders are scanned). Name them with their sensor and platform when possible, for example `MODIS_SP_2012.csv`, `VIIRS_SNPP_2020.csv`, `VIIRS_NOAA20_2022.csv`, or `VIIRS_NOAA21_2025.csv`. `VIIRS_SNPP`, `VIIRS_NOAA20`, and `VIIRS_NOAA21` all normalize to the common `VIIRS` sensor category; the `satellite` column retains `Suomi-NPP`, `NOAA-20`, or `NOAA-21` provenance. The overlap calibration uses the available MODIS and VIIRS records from 2012–2023; Suomi-NPP ending its mission on Nov 2, 2026 does not end the VIIRS series, since NOAA-20 and NOAA-21 remain in the same sensor stream.

```powershell
python pipeline\harmonize.py
python pipeline\harmonize.py --input data --output output --min-confidence high
```

DuckDB's CSV reader uses schema union and disk-backed relations. It does not load the source files into Python lists; only each 5,000-row JSON output batch is held in Python memory. Provide sufficient disk space for the database, temporary spill files, and exported artifacts. Source CSV columns may use FIRMS aliases such as `latitude`/`lat`, `longitude`/`lon`, `acq_date`, `confidence`, and `frp`.

## Optional Global Offers

Copy `.env.example` to `.env` and populate only the integrations you choose. Never commit `.env`.

```powershell
Copy-Item .env.example .env
```

- `VITE_MAPBOX_ACCESS_TOKEN` enables the optional Mapbox dark basemap style through MapLibre. It is a **public browser token**, not a secret; restrict it to your approved origins/styles in Mapbox. If it is blank, Fireline uses its built-in MapLibre map and local land outline.
- `WEATHER_API_KEY` is reserved for a server-side weather-data integration. It is intentionally not read by the browser; secrets must not use the `VITE_` prefix because Vite embeds those values in frontend assets.
- `FIRMS_MAP_KEY` is reserved for a separate server-side integration. `pipeline/harmonize.py` performs no FIRMS Area API requests and consumes local bulk CSV files only.

Restart Vite after changing `.env`. Do not put private weather/API credentials in `VITE_*` variables.

## Outputs

- `output/harmonized.duckdb`: normalized `observations` and deduplicated `harmonized_daily` tables, with sensor and satellite provenance.
- `output/harmonized_hotspots.csv` and `.parquet`: harmonized cell-day archive.
- `output/app_data.json` and `public/app_data.json`: metadata, monthly summaries, and map records consumed by Vite.

See [MANUAL.md](MANUAL.md) for the calibration method, map use, confidence handling, and limitations.
