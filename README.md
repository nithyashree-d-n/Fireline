# Fireline: Harmonized MODIS + VIIRS Burning Activity Calendar

Fireline turns NASA FIRMS active fire detections into a common daily spatial grid and an interactive historical activity calendar. The browser app includes an AOI map, monthly activity heatmap, median anomaly view, summary metrics, and filtered CSV export.

> **Data status:** This workspace currently has no raw satellite files in `data/`. The app therefore displays a clearly labeled synthetic preview. It is not NASA observations. Place FIRMS CSV or Parquet archives in `data/` and run the pipeline to publish a real-data archive to `output/` and the app's `public/app_data.json`.

## Start here (Windows PowerShell)

```powershell
cd D:\harmonization_nasa
.\.venv\Scripts\Activate.ps1
python pipeline\harmonize.py
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). To create a production build, run `npm run build`.

## Add FIRMS data

Copy downloaded FIRMS `MODIS_SP`, `MODIS_NRT`, and VIIRS `*_SP` CSV/Parquet files into `data/` (subfolders are scanned). Keep each file's source or sensor in its filename so the reader can distinguish MODIS from VIIRS. The reader maps FIRMS coordinate, acquisition date/time, confidence, FRP, scan/track, and thermal brightness fields into the normalized table. MODIS numeric confidence below 50 and VIIRS low (`l`) confidence are excluded by default. Use `--min-confidence high` for a stricter subset.

```powershell
python pipeline\harmonize.py
python pipeline\harmonize.py --input data --output output --min-confidence high
```

Optional Area API updates use a NASA FIRMS map key provided through `FIRMS_MAP_KEY` in `.env` or the shell. Do not commit `.env`.

```powershell
Copy-Item .env.example .env   # then add your own map key
python pipeline\harmonize.py --fetch-source VIIRS_SNPP_SP --bbox -125,24,-66,50 --day-range 2
```

## Outputs

- `output/harmonized.duckdb`: normalized `observations` and deduplicated `harmonized_daily` tables.
- `output/harmonized_hotspots.csv` and `.parquet`: harmonized cell-day rows.
- `output/app_data.json` and `public/app_data.json`: calendar and map input consumed by Vite.

See [MANUAL.md](MANUAL.md) for methodology, formulas, the interface guide, limitations, and detailed setup. The input area is empty in this checkout, so an actual overlap fit and observation schema check require your MODIS/VIIRS archives.
