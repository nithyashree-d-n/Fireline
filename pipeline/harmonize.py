#!/usr/bin/env python3
"""Build a disk-backed MODIS/VIIRS active-fire archive with DuckDB."""
from __future__ import annotations

import argparse
import json
import math
import re
import shutil
from datetime import date, datetime
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUT = ROOT / "output"
OVERLAP_START, OVERLAP_END = date(2012, 1, 1), date(2023, 12, 31)


def quote_path(path: Path) -> str:
    return path.resolve().as_posix().replace("'", "''")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", type=Path, default=DATA)
    ap.add_argument("--output", type=Path, default=OUT)
    ap.add_argument("--min-confidence", choices=("nominal", "high"), default="nominal")
    ap.add_argument("--memory-limit", default="4GB", help="DuckDB working-memory cap, for example 4GB or 750MB")
    args = ap.parse_args()
    if not re.fullmatch(r"\d+(?:\.\d+)?(?:B|KB|MB|GB|TB)", args.memory_limit, re.IGNORECASE):
        ap.error("--memory-limit must be a size such as 4GB or 750MB")

    paths = sorted(p for p in args.input.rglob("*") if p.suffix.lower() == ".csv")
    args.output.mkdir(parents=True, exist_ok=True)
    spill_dir = args.output / "duckdb_tmp"
    spill_dir.mkdir(parents=True, exist_ok=True)
    db = duckdb.connect(str(args.output / "harmonized.duckdb"))
    spill = spill_dir.resolve().as_posix().replace("'", "''")
    db.execute(f"SET memory_limit = '{args.memory_limit}'")
    db.execute(f"SET temp_directory = '{spill}'")
    db.execute("SET preserve_insertion_order = false")
    if not paths:
        db.execute("CREATE OR REPLACE TABLE observations AS SELECT NULL::VARCHAR AS hotspot_id, NULL::VARCHAR AS sensor, NULL::VARCHAR AS satellite, NULL::DATE AS acq_date, NULL::VARCHAR AS acq_time, NULL::DOUBLE AS lat, NULL::DOUBLE AS lon, NULL::VARCHAR AS cell_id, NULL::DOUBLE AS frp, NULL::VARCHAR AS confidence_norm, NULL::DOUBLE AS brightness, NULL::DOUBLE AS bright_t31, NULL::DOUBLE AS scan, NULL::DOUBLE AS track WHERE false")
        db.execute("CREATE OR REPLACE TABLE harmonized_daily AS SELECT NULL::VARCHAR AS hotspot_id, NULL::VARCHAR AS cell_id, NULL::DATE AS acq_date, NULL::VARCHAR AS acq_time, NULL::DOUBLE AS lat, NULL::DOUBLE AS lon, NULL::DOUBLE AS frp, NULL::DOUBLE AS calibrated_frp, NULL::DOUBLE AS brightness, NULL::DOUBLE AS bright_t31, NULL::VARCHAR AS confidence_norm, NULL::VARCHAR AS sensor, NULL::VARCHAR AS satellite, NULL::INTEGER AS hotspot_count, NULL::DOUBLE AS calibrated_hotspot_count, NULL::DOUBLE AS hfai, NULL::DOUBLE AS scan, NULL::DOUBLE AS track, NULL::INTEGER AS source_count, NULL::VARCHAR AS sensors_seen WHERE false")
    else:
        # DuckDB scans all files directly and spills intermediates to its database/temp storage.
        file_list = ",".join("'" + quote_path(p) + "'" for p in paths)
        db.execute(f"CREATE OR REPLACE TEMP VIEW raw AS SELECT * FROM read_csv_auto([{file_list}], union_by_name=true, filename=true, all_varchar=true, sample_size=20480, ignore_errors=true)")
        columns = {row[0].lower(): row[0] for row in db.execute("DESCRIBE raw").fetchall()}

        def col(*aliases: str, default: str = "NULL") -> str:
            found = next((columns[a] for a in aliases if a in columns), None)
            return f'NULLIF(trim(CAST("{found}" AS VARCHAR)), \'\')' if found else default

        lat, lon = col("latitude", "lat"), col("longitude", "lon")
        raw_date, raw_time = col("acq_date", "date", "datetime", "acq_datetime"), col("acq_time", "time", default="'0000'")
        sat = col("satellite")
        conf = col("confidence", "conf")
        frp = col("frp", default="'0'")
        scan, track = col("scan"), col("track")
        bright = col("brightness", "bright_ti4", "bright_ti5", "bright_t21", "bright_t31")
        bright31 = col("bright_t31", "bright_ti5")
        file = '"filename"'
        sensor = f"CASE WHEN regexp_matches(lower({file}), 'modis|terra|aqua') OR lower(coalesce({sat},'')) IN ('terra','aqua') THEN 'MODIS' WHEN regexp_matches(lower({file}), 'viirs|snpp|npp|noaa.?20|noaa.?21') OR lower(coalesce({sat},'')) IN ('n','npp','snpp','noaa20','noaa-20','n20','noaa21','noaa-21','n21') THEN 'VIIRS' ELSE 'UNKNOWN' END"
        satellite = f"CASE WHEN regexp_matches(lower({file}), 'noaa.?21') OR lower(coalesce({sat},'')) IN ('noaa21','noaa-21','n21') THEN 'NOAA-21' WHEN regexp_matches(lower({file}), 'noaa.?20') OR lower(coalesce({sat},'')) IN ('noaa20','noaa-20','n20') THEN 'NOAA-20' WHEN regexp_matches(lower({file}), 'snpp|suomi.?npp') OR lower(coalesce({sat},'')) IN ('n','npp','snpp') THEN 'Suomi-NPP' WHEN lower(coalesce({sat},'')) IN ('terra','aqua') THEN initcap(lower({sat})) WHEN regexp_matches(lower({file}), 'terra') THEN 'Terra' WHEN regexp_matches(lower({file}), 'aqua') THEN 'Aqua' ELSE coalesce({sat}, regexp_extract({file}, '([^/\\\\]+)\\.csv$', 1)) END"
        raw_day = f"try_cast(try_strptime(substr({raw_date},1,10), '%Y-%m-%d') AS DATE)"
        raw_dt = f"try_cast({raw_date} AS TIMESTAMP)"
        day_expr = f"coalesce({raw_day}, CAST({raw_dt} AS DATE))"
        time_expr = f"coalesce(strftime({raw_dt}, '%H%M'), lpad(regexp_replace(coalesce({raw_time},'0000'), '[^0-9]', '', 'g'),4,'0'))"
        numeric = lambda expr: f"try_cast({expr} AS DOUBLE)"
        conf_norm = f"CASE WHEN {sensor}='MODIS' THEN CASE WHEN {numeric(conf)} >= 80 THEN 'high' WHEN {numeric(conf)} >= 50 THEN 'nominal' WHEN {numeric(conf)} IS NOT NULL THEN 'low' ELSE 'unknown' END WHEN lower(coalesce({conf},'')) IN ('h','high') THEN 'high' WHEN lower(coalesce({conf},'')) IN ('n','nominal') THEN 'nominal' WHEN lower(coalesce({conf},'')) IN ('l','low') THEN 'low' ELSE 'unknown' END"
        confidence_filter = "confidence_norm = 'high'" if args.min_confidence == "high" else "confidence_norm IN ('nominal','high') OR sensor='VIIRS' AND confidence_norm='unknown'"
        db.execute(f"""CREATE OR REPLACE TABLE observations AS
            WITH normalized AS (
              SELECT {sensor} AS sensor, {satellite} AS satellite, {day_expr} AS acq_date,
                {time_expr} AS acq_time, {numeric(lat)} AS lat, {numeric(lon)} AS lon,
                coalesce({numeric(frp)},0) AS frp, {conf_norm} AS confidence_norm,
                {numeric(bright)} AS brightness, {numeric(bright31)} AS bright_t31,
                coalesce({numeric(scan)},0) AS scan, coalesce({numeric(track)},0) AS track
              FROM raw
            ), accepted AS (
              SELECT *, floor((lat+90)/0.05) AS lat_i,
                floor((lon+180)/greatest(0.01,0.05/greatest(0.2,cos(radians(lat))))) AS lon_i
              FROM normalized WHERE sensor IN ('MODIS','VIIRS') AND acq_date IS NOT NULL
                AND lat BETWEEN -90 AND 90 AND lon BETWEEN -180 AND 180
                AND confidence_norm NOT IN ('low')
                AND (sensor='VIIRS' OR confidence_norm <> 'unknown')
                AND ({confidence_filter})
            )
            SELECT sensor || ':' || satellite || ':' || CAST(acq_date AS VARCHAR) || ':' || acq_time || ':' ||
              printf('%.5f',lat) || ':' || printf('%.5f',lon) AS hotspot_id,
              sensor, satellite, acq_date, acq_time, lat, lon,
              CAST(lat_i AS VARCHAR) || ':' || CAST(lon_i AS VARCHAR) AS cell_id,
              frp, confidence_norm, brightness, bright_t31, scan, track FROM accepted""")

        db.execute(f"""CREATE OR REPLACE TEMP TABLE cell_sensor AS
          SELECT sensor, acq_date, cell_id, max(frp) AS frp FROM observations
          WHERE acq_date BETWEEN DATE '{OVERLAP_START}' AND DATE '{OVERLAP_END}'
          GROUP BY sensor, acq_date, cell_id""")
        overlaps = db.execute("""SELECT count(DISTINCT acq_date) AS dates,
          count(*) FILTER (WHERE sensor='MODIS') AS modis,
          count(*) FILTER (WHERE sensor='VIIRS') AS viirs
          FROM cell_sensor WHERE acq_date IN (SELECT acq_date FROM cell_sensor
            GROUP BY acq_date HAVING count(DISTINCT sensor)=2)""").fetchone()
        # Median paired FRP ratio is computed in DuckDB, keeping global rows on disk.
        paired = db.execute("""SELECT median(m.frp / v.frp) FROM cell_sensor m JOIN cell_sensor v USING(acq_date,cell_id)
          WHERE m.sensor='MODIS' AND v.sensor='VIIRS' AND m.frp>0 AND v.frp>0""").fetchone()[0]
        cell_scale = max(.25, min(4., (overlaps[1] or 0)/(overlaps[2] or 1))) if overlaps[2] else 1.
        frp_scale = max(.25, min(4., paired)) if paired else 1.
        db.execute(f"""CREATE OR REPLACE TABLE harmonized_daily AS
          WITH grouped AS (
            SELECT cell_id,acq_date,count(*) AS source_count,
              string_agg(DISTINCT sensor, ',' ORDER BY sensor) AS sensors_seen
            FROM observations GROUP BY cell_id,acq_date
          ), ranked AS (
            SELECT o.*,row_number() OVER(PARTITION BY cell_id,acq_date
              ORDER BY frp DESC,(confidence_norm='high') DESC,satellite) AS rank
            FROM observations o
          )
          SELECT r.hotspot_id,r.cell_id,r.acq_date,r.acq_time,r.lat,r.lon,r.frp,
            r.frp * CASE WHEN r.sensor='VIIRS' THEN {frp_scale} ELSE 1 END AS calibrated_frp,
            r.brightness,r.bright_t31,r.confidence_norm,r.sensor,r.satellite,1 AS hotspot_count,
            CASE WHEN r.sensor='VIIRS' THEN {cell_scale} ELSE 1 END AS calibrated_hotspot_count,
            CASE WHEN r.sensor='VIIRS' THEN {cell_scale} ELSE 1 END AS hfai,
            r.scan,r.track,g.source_count,g.sensors_seen FROM ranked r
            JOIN grouped g USING(cell_id,acq_date) WHERE r.rank=1""")

    db.execute("COPY (SELECT * FROM harmonized_daily ORDER BY acq_date, cell_id) TO ? (HEADER, DELIMITER ',')", [str(args.output / "harmonized_hotspots.csv")])
    db.execute("COPY (SELECT * FROM harmonized_daily ORDER BY acq_date, cell_id) TO ? (FORMAT PARQUET)", [str(args.output / "harmonized_hotspots.parquet")])
    monthly = db.execute("SELECT year(acq_date) year, month(acq_date) month, count(*) count, sum(hfai) hfai, sum(calibrated_frp) frp FROM harmonized_daily GROUP BY 1,2 ORDER BY 1,2").fetchall()
    monthly_rows = [dict(zip(("year", "month", "count", "hfai", "frp"), row)) for row in monthly]
    for row in monthly_rows:
        baseline = sorted(r["hfai"] for r in monthly_rows if r["month"] == row["month"] and r["year"] != row["year"])
        median = baseline[len(baseline)//2] if baseline else 0.
        mean = sum(baseline)/len(baseline) if baseline else 0.
        std = math.sqrt(sum((v-mean)**2 for v in baseline)/len(baseline)) if baseline else 0.
        row.update(median_hfai=median, p25_hfai=baseline[int(.25*(len(baseline)-1))] if baseline else 0.,
          p75_hfai=baseline[int(.75*(len(baseline)-1))] if baseline else 0.,
          anomaly_pct=(100*(row["hfai"]-median)/median) if median else None,
          z_score=(row["hfai"]-median)/std if std else None)
    # Write JSON incrementally: Python memory use is bounded to each batch rather than archive size.
    payload = {"generated_at": datetime.now().astimezone().isoformat(timespec="seconds"), "input_files": len(paths),
      "observations": db.execute("SELECT count(*) FROM observations").fetchone()[0], "rejected_rows": 0,
      "unknown_sensor_files": [], "overlap": {"start": str(OVERLAP_START), "end": str(OVERLAP_END),
      "cell_days": {"co_observed_dates": (overlaps[0] or 0) if paths else 0, "MODIS_cell_days": (overlaps[1] or 0) if paths else 0,
      "VIIRS_cell_days": (overlaps[2] or 0) if paths else 0}, "scaling": {"MODIS": {"cell_scale":1.,"frp_scale":1.},
      "VIIRS": {"cell_scale":cell_scale if paths else 1.,"frp_scale":frp_scale if paths else 1.}}},
      "grid": "approximate equal-area 0.05 degree", "months": monthly_rows}
    app_path = args.output / "app_data.json"
    with app_path.open("w", encoding="utf-8") as out:
        out.write(json.dumps(payload, separators=(",", ":"))[:-1] + ',"hotspots":[')
        cursor = db.execute("SELECT * FROM harmonized_daily ORDER BY acq_date,cell_id")
        names = [item[0] for item in cursor.description]
        first = True
        while batch := cursor.fetchmany(5000):
            for values in batch:
                if not first: out.write(",")
                out.write(json.dumps(dict(zip(names, values)), separators=(",", ":"), default=str))
                first = False
        out.write("]}")
    shutil.copyfile(app_path, ROOT / "public" / "app_data.json")
    print(json.dumps({"input_files":len(paths),"observations":payload["observations"],"overlap":payload["overlap"],"grid":payload["grid"]},indent=2))
    db.close()


if __name__ == "__main__":
    main()
