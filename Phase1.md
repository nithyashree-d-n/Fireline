# Fireline Software Engineering Process Record

**Project:** Fireline — Harmonized MODIS and VIIRS Burning Activity Calendar  
**Record date:** 2026-11-14  
**Purpose:** Record the project process, implemented capabilities, documentation basis, and work still pending, as evidenced by the current repository.

## Record scope and evidence

This record is based on the files and Git state present in the workspace at the time it was written. Git contains one baseline commit (`337d3cd`, `initial commit`) and no earlier engineering history to reconstruct. The working tree has staged and unstaged changes, so the entries below describe the current project state rather than a verified chronological sequence of individual edits. No external service or NASA dataset was accessed to prepare this record.

## Project goal

Build a web application for exploring harmonized MODIS and VIIRS active-fire detections over a selected area and date range. The project follows the NASA Space Apps challenge prompt: normalize observations, reduce duplicate overpasses, compare historical burning activity, and let users explore and export results.

## Engineering process represented in the repository

1. **Define the problem and audience.** The challenge prompt in `resources/challenge_prompt.txt` describes the need for a consistent fire activity calendar and a user-selected area/date range, including historical comparisons and downloadable records.
2. **Inspect and prepare source data.** The documented input is local NASA FIRMS bulk data placed under `data/`. The pipeline reads files with DuckDB, normalizes known field aliases and sensor/platform identity, and applies confidence handling. Raw archive schemas and real coverage still need validation against actual files.
3. **Transform and harmonize.** The Python pipeline assigns observations to daily spatial cells, deduplicates observations per cell and UTC date, estimates VIIRS scale factors from MODIS/VIIRS overlap (documented window: 2012–2023), calculates monthly summaries, and writes DuckDB, CSV, Parquet, and JSON outputs.
4. **Build the user interface.** The React/Vite application presents a MapLibre map, area-of-interest selection, date filters, a year-by-month activity calendar, anomaly comparison, summary metrics, and filtered CSV export. When no real archive is available, it provides a clearly labeled synthetic demo preview.
5. **Document use and limitations.** `README.md` covers setup and operation; `MANUAL.md` describes architecture, processing assumptions, interpretation, and user tasks. `INTEGRATION_PLAN.md` proposes possible data services and deployment steps.
6. **Validate and release.** The repository's `AGENTS.md` calls for pipeline validation, browser end-to-end checks, and documentation. At the time of this record, no test or validation report is present in the inspected artifacts. Do not treat planned checks as completed work.

## Implemented capabilities visible in the current source

- DuckDB-backed batch processing in `pipeline/harmonize.py` and tabular/browser outputs under `output/` and `public/`.
- Shared MODIS/VIIRS sensor category with satellite/platform provenance.
- Daily spatial cell aggregation and overlap-period scaling metadata.
- React interface for map interaction, bounds/date filtering, monthly activity and anomaly display, and CSV download.
- Synthetic preview handling when real observations are absent.
- Setup, technical-method, and integration-planning documents.
- Environment-variable examples that distinguish a browser-visible Mapbox token from reserved server-side credentials.

These are source-level observations, not a claim that every path has passed runtime or scientific validation.

## Current data and repository state

- The checked output metadata reports `input_files: 0`, `observations: 0`, zero MODIS/VIIRS overlap cell-days, default scale factors of 1, and no monthly records. The generated browser data contains no hotspot records.
- Project documentation states that no raw satellite CSV archive is present and that the interface therefore shows synthetic preview points. Those points must not be cited as NASA observations.
- Git has one baseline commit and current staged/unstaged modifications across the pipeline, frontend, documentation, generated data/build outputs, and integration plan. This record does not assign those changes to particular people or dates because the repository does not provide that history.
- Generated files in `dist/`, `output/`, and `public/` reflect build or pipeline artifacts and should be regenerated from source inputs when the pipeline or frontend changes.

## Documentation and references used

The following in-repository materials were reviewed as the documentation basis for this record:

- `AGENTS.md` — repository workflow and expected validation steps.
- `resources/challenge_prompt.txt` — project requirements and challenge context.
- `README.md` — project overview, local setup, inputs, outputs, and configuration.
- `MANUAL.md` — technical architecture, harmonization assumptions, usage guidance, and limitations.
- `INTEGRATION_PLAN.md` — proposed integrations, rollout phases, operational safeguards, and linked external references.
- `package.json`, `pipeline/harmonize.py`, `src/main.jsx`, and generated `output/app_data.json` — implementation and current data-state evidence.

`INTEGRATION_PLAN.md` contains links to NASA FIRMS, Microsoft Planetary Computer, and NASA Space Apps materials. Those linked pages were not independently reviewed for this process record. There is also a documentation discrepancy to resolve: the integration plan's current-system section mentions optional FIRMS Area API fetching, while `README.md`, `MANUAL.md`, and the current source describe a local bulk-file pipeline with no FIRMS Area API request path. Confirm the actual intended behavior and align those descriptions before relying on them.

## Outstanding work

- Add representative NASA FIRMS source files and verify their headers, sensor/platform provenance, confidence conventions, and date coverage.
- Run the pipeline on real data; review rejected/unknown records, overlap counts, paired FRP coverage, scale factors, output consistency, and disk/memory use.
- Run and record the documented frontend build and end-to-end checks, including map bounds selection, date filtering, calendar/anomaly behavior, accessibility labels, and CSV export.
- Resolve the FIRMS Area API documentation discrepancy and update the integration plan to match implemented behavior.
- Review generated artifacts and Git staging before a release; keep credentials out of committed files and clearly label synthetic data.
- Record future work in dated entries or commits so later process reports can distinguish completed work from proposals.

## Status summary

Fireline has a documented prototype architecture and source code for a local-data harmonization pipeline and interactive calendar. The workspace currently demonstrates an empty-data run and synthetic UI preview; real-data calibration and end-to-end validation remain unverified. Integration and deployment ideas are proposals unless implemented and recorded separately.
