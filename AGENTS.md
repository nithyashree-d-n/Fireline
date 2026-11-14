# AGENTS.md - Harmonized MODIS & VIIRS Burning Activity Calendar (NASA Space Apps 2026)

## Execution Workflow
1. Inspect `/data` and `/resources` first to verify exact schemas of the local NASA datasets.
2. Run `$nasa-firms-ingestion` and `$firms-harmonization-engine` to build and validate the Python/DuckDB harmonization pipeline. Verify overlap calibration metrics (2012-2023) before building the frontend.
3. Run `$accessible-fire-viz` to build the interactive web application with map AOI selection, multi-decade burning activity calendar, historical median anomaly comparison, colorblind-safe ramps, and CSV download.
4. Test the live application end-to-end using Playwright MCP (test map bounding box selection, calendar rendering, anomaly toggles, and CSV download) and fix any runtime/UI errors.
5. Run `$hackathon-manual-writer` to generate `MANUAL.md` and `README.md`.
