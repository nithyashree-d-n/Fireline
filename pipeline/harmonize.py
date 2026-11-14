#!/usr/bin/env python3
"""Ingest NASA FIRMS CSV files and build a gridded MODIS/VIIRS activity archive."""
from __future__ import annotations

import argparse
import csv
import json
import math
import os
import re
import shutil
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUT = ROOT / "output"
OVERLAP_START, OVERLAP_END = date(2012, 1, 1), date(2023, 12, 31)

ALIASES = {
    "lat": ("latitude", "lat"), "lon": ("longitude", "lon"),
    "acq_date": ("acq_date", "date", "datetime", "acq_datetime"),
    "acq_time": ("acq_time", "time"), "satellite": ("satellite",),
    "confidence": ("confidence", "conf"), "frp": ("frp",),
    "scan": ("scan",), "track": ("track",), "brightness": ("brightness", "bright_ti4", "bright_ti5", "bright_t21", "bright_t31"),
    "bright_t31": ("bright_t31", "bright_ti5"),
}

def number(value, default=None):
    try:
        n = float(value)
        return n if math.isfinite(n) else default
    except (ValueError, TypeError):
        return default

def confidence(value, sensor):
    s = str(value or "").strip().lower()
    if sensor == "MODIS":
        n = number(s)
        return ("high" if n >= 80 else "nominal" if n >= 50 else "low") if n is not None else "unknown"
    return {"l": "low", "n": "nominal", "h": "high", "low": "low", "nominal": "nominal", "high": "high"}.get(s, "unknown")

def pick(row, key):
    lowered = {k.strip().lower(): v for k, v in row.items() if k}
    for alias in ALIASES[key]:
        if alias in lowered and lowered[alias] not in (None, ""):
            return lowered[alias]
    return None

def sensor_from(path, row):
    text = (path.name + " " + str(pick(row, "satellite") or "")).lower()
    if any(x in text for x in ("viirs", "snpp", "noaa20", "noaa21", "npp")):
        return "VIIRS"
    if any(x in text for x in ("modis", "terra", "aqua")):
        return "MODIS"
    return "UNKNOWN"

def date_and_time(row):
    raw = pick(row, "acq_date")
    t = str(pick(row, "acq_time") or "0000").strip()
    if raw is None:
        raise ValueError("missing acq_date/date")
    raw = str(raw).strip()
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if "T" in raw or " " in raw:
            return dt.date().isoformat(), dt.strftime("%H%M")
    except ValueError:
        pass
    d = date.fromisoformat(raw[:10])
    return d.isoformat(), re.sub(r"\D", "", t).zfill(4)[:4]

def load_rows(paths, min_confidence):
    records, rejected, unknown_files = [], 0, []
    for path in paths:
        if path.suffix.lower() == ".parquet":
            con = duckdb.connect()
            try:
                cursor = con.execute("SELECT * FROM read_parquet(?)", [str(path)])
                columns = [column[0] for column in cursor.description]
                source = [dict(zip(columns, row)) for row in cursor.fetchall()]
            except Exception as exc:
                print(f"Skipping unreadable Parquet {path.name}: {exc}")
                con.close()
                continue
            con.close()
            source_rows = source
        elif path.suffix.lower() == ".csv":
            f = path.open("r", newline="", encoding="utf-8-sig")
            source_rows = csv.DictReader(f)
            if not source_rows.fieldnames:
                f.close()
                continue
        else:
            continue
        try:
            for row in source_rows:
                try:
                    sensor = sensor_from(path, row)
                    if sensor == "UNKNOWN":
                        unknown_files.append(path.name)
                        continue
                    lat, lon = number(pick(row, "lat")), number(pick(row, "lon"))
                    if lat is None or lon is None or not (-90 <= lat <= 90 and -180 <= lon <= 180):
                        raise ValueError("invalid coordinates")
                    day, tm = date_and_time(row)
                    conf = confidence(pick(row, "confidence"), sensor)
                    if conf == "low" or (sensor == "MODIS" and conf == "unknown"):
                        continue
                    if min_confidence == "high" and conf != "high":
                        continue
                    satellite = str(pick(row, "satellite") or path.stem).strip()
                    frp = number(pick(row, "frp"), 0.0)
                    # 0.05-degree global grid. Longitude cell width is adjusted with latitude
                    # to keep approximate cell area comparable away from the equator.
                    lat_i = math.floor((lat + 90) / 0.05)
                    width = max(0.01, 0.05 / max(0.2, math.cos(math.radians(lat))))
                    lon_i = math.floor((lon + 180) / width)
                    cell = f"{lat_i}:{lon_i}"
                    records.append({"hotspot_id": f"{sensor}:{satellite}:{day}:{tm}:{lat:.5f}:{lon:.5f}",
                                    "sensor": sensor, "satellite": satellite, "acq_date": day,
                                    "acq_time": tm, "lat": lat, "lon": lon, "cell_id": cell,
                                    "frp": frp, "confidence_norm": conf,
                                    "brightness": number(pick(row, "brightness")),
                                    "bright_t31": number(pick(row, "bright_t31")),
                                    "scan": number(pick(row, "scan"), 0), "track": number(pick(row, "track"), 0)})
                except (ValueError, TypeError):
                    rejected += 1
        finally:
            if path.suffix.lower() == ".csv":
                f.close()
    return records, rejected, sorted(set(unknown_files))

def calibrate(records):
    """Fit bounded VIIRS-to-MODIS relative rates over calendar dates both observe."""
    active = defaultdict(lambda: defaultdict(dict))
    for r in records:
        d = date.fromisoformat(r["acq_date"])
        if OVERLAP_START <= d <= OVERLAP_END:
            bucket = active[r["sensor"]][r["acq_date"]]
            bucket[r["cell_id"]] = max(bucket.get(r["cell_id"], 0.0), r["frp"])
    days = set(active["MODIS"]) & set(active["VIIRS"])
    mod_cells = sum(len(active["MODIS"][d]) for d in days)
    vir_cells = sum(len(active["VIIRS"][d]) for d in days)
    cell_scale = max(0.25, min(4.0, mod_cells / vir_cells)) if vir_cells else 1.0
    paired_frp = [(active["MODIS"][d][c], active["VIIRS"][d][c]) for d in days
                  for c in (set(active["MODIS"][d]) & set(active["VIIRS"][d]))
                  if active["MODIS"][d][c] > 0 and active["VIIRS"][d][c] > 0]
    frp_scale = 1.0
    if paired_frp:
        ratios = sorted(m / v for m, v in paired_frp)
        frp_scale = max(0.25, min(4.0, ratios[len(ratios)//2]))
    return (
        {"MODIS": {"cell_scale": 1.0, "frp_scale": 1.0},
         "VIIRS": {"cell_scale": cell_scale, "frp_scale": frp_scale}},
        {"co_observed_dates": len(days), "MODIS_cell_days": mod_cells,
         "VIIRS_cell_days": vir_cells, "paired_frp_cell_days": len(paired_frp)},
    )

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", type=Path, default=DATA)
    ap.add_argument("--output", type=Path, default=OUT)
    ap.add_argument("--min-confidence", choices=("nominal", "high"), default="nominal")
    ap.add_argument("--fetch-source", choices=("MODIS_SP", "MODIS_NRT", "VIIRS_SNPP_SP", "VIIRS_NOAA20_SP", "VIIRS_NOAA21_SP"))
    ap.add_argument("--bbox", default="-180,-90,180,90", help="west,south,east,north")
    ap.add_argument("--day-range", type=int, default=1, choices=range(1, 11))
    ap.add_argument("--date", help="FIRMS end date YYYY-MM-DD; defaults to today UTC")
    args = ap.parse_args()
    if args.fetch_source:
        env_path = ROOT / ".env"
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                if line.strip() and not line.lstrip().startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip().strip("\"'"))
        key = os.environ.get("FIRMS_MAP_KEY")
        if not key:
            ap.error("--fetch-source requires FIRMS_MAP_KEY in the environment or .env file")
        try:
            bounds = [float(x) for x in args.bbox.split(",")]
            if len(bounds) != 4 or not (-180 <= bounds[0] < bounds[2] <= 180 and -90 <= bounds[1] < bounds[3] <= 90):
                raise ValueError
        except ValueError:
            ap.error("--bbox must be valid west,south,east,north bounds")
        end_date = args.date or datetime.now(timezone.utc).date().isoformat()
        try:
            end_date = date.fromisoformat(end_date).isoformat()
        except ValueError:
            ap.error("--date must use YYYY-MM-DD format")
        bbox = ",".join(str(x) for x in bounds)
        url = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/" + "/".join(map(urllib.parse.quote, [key, args.fetch_source, bbox, str(args.day_range), end_date]))
        req = urllib.request.Request(url, headers={"User-Agent": "FIRMS-Harmonizer/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                csv_text = response.read().decode("utf-8-sig")
        except Exception as exc:
            ap.error(f"FIRMS Area API request failed: {exc}")
        if not csv_text.strip() or "latitude" not in csv_text.splitlines()[0].lower() and "lat" not in csv_text.splitlines()[0].lower():
            ap.error("FIRMS response did not contain a hotspot CSV header")
        args.input.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        (args.input / f"{args.fetch_source}_{stamp}.csv").write_text(csv_text, encoding="utf-8")
    paths = sorted([*args.input.rglob("*.csv"), *args.input.rglob("*.parquet")])
    records, rejected, unknown = load_rows(paths, args.min_confidence)
    ratios, overlap_counts = calibrate(records)
    # One active fire per spatial cell per UTC date. Keep the strongest observation
    # to retain physically meaningful FRP without multiplying persistent overpasses.
    grouped = defaultdict(list)
    for r in records:
        grouped[(r["cell_id"], r["acq_date"])].append(r)
    daily = []
    for (cell, day), rows in grouped.items():
        best = max(rows, key=lambda r: (r["frp"], r["confidence_norm"] == "high"))
        scale = ratios.get(best["sensor"], {"cell_scale": 1.0, "frp_scale": 1.0})
        daily.append({**best, "hotspot_count": 1, "calibrated_hotspot_count": scale["cell_scale"],
                      "hfai": scale["cell_scale"], "calibrated_frp": best["frp"] * scale["frp_scale"],
                      "source_count": len(rows), "sensors_seen": ",".join(sorted({r["sensor"] for r in rows}))})
    args.output.mkdir(parents=True, exist_ok=True)
    db = duckdb.connect(str(args.output / "harmonized.duckdb"))
    db.execute("CREATE OR REPLACE TABLE observations(hotspot_id VARCHAR, sensor VARCHAR, satellite VARCHAR, acq_date DATE, acq_time VARCHAR, lat DOUBLE, lon DOUBLE, cell_id VARCHAR, frp DOUBLE, confidence_norm VARCHAR, brightness DOUBLE, bright_t31 DOUBLE, scan DOUBLE, track DOUBLE)")
    obs_cols = ("hotspot_id", "sensor", "satellite", "acq_date", "acq_time", "lat", "lon", "cell_id", "frp", "confidence_norm", "brightness", "bright_t31", "scan", "track")
    if records:
        marks = ",".join("?" for _ in obs_cols)
        db.executemany(f"INSERT INTO observations VALUES ({marks})", [tuple(r.get(k) for k in obs_cols) for r in records])
    db.execute("CREATE OR REPLACE TABLE harmonized_daily(hotspot_id VARCHAR, cell_id VARCHAR, acq_date DATE, acq_time VARCHAR, lat DOUBLE, lon DOUBLE, frp DOUBLE, calibrated_frp DOUBLE, brightness DOUBLE, bright_t31 DOUBLE, confidence_norm VARCHAR, sensor VARCHAR, satellite VARCHAR, hotspot_count INTEGER, calibrated_hotspot_count DOUBLE, hfai DOUBLE, scan DOUBLE, track DOUBLE, source_count INTEGER, sensors_seen VARCHAR)")
    daily_cols = ("hotspot_id", "cell_id", "acq_date", "acq_time", "lat", "lon", "frp", "calibrated_frp", "brightness", "bright_t31", "confidence_norm", "sensor", "satellite", "hotspot_count", "calibrated_hotspot_count", "hfai", "scan", "track", "source_count", "sensors_seen")
    if daily:
        marks = ",".join("?" for _ in daily_cols)
        db.executemany(f"INSERT INTO harmonized_daily VALUES ({marks})", [tuple(r.get(k) for k in daily_cols) for r in daily])
    db.execute("COPY (SELECT * FROM harmonized_daily ORDER BY acq_date, cell_id) TO ? (HEADER, DELIMITER ',')", [str(args.output / "harmonized_hotspots.csv")])
    db.execute("COPY (SELECT * FROM harmonized_daily ORDER BY acq_date, cell_id) TO ? (FORMAT PARQUET)", [str(args.output / "harmonized_hotspots.parquet")])
    db.close()
    # Aggregations consumed by the browser and the API. Historical baseline is computed
    # against all other years for the same calendar month.
    by_month = defaultdict(lambda: {"count": 0, "hfai": 0.0, "frp": 0.0})
    for r in daily:
        d = date.fromisoformat(r["acq_date"])
        a = by_month[(d.year, d.month)]
        a["count"] += 1; a["hfai"] += r["hfai"]; a["frp"] += r["calibrated_frp"]
    months = []
    for (year, month), vals in sorted(by_month.items()):
        baseline = [v["hfai"] for (y, m), v in by_month.items() if m == month and y != year]
        ordered = sorted(baseline)
        med = ordered[len(ordered)//2] if ordered else 0.0
        q25 = ordered[int(0.25 * (len(ordered)-1))] if ordered else 0.0
        q75 = ordered[int(0.75 * (len(ordered)-1))] if ordered else 0.0
        mean = sum(baseline) / len(baseline) if baseline else 0.0
        variance = sum((v-mean)**2 for v in baseline) / len(baseline) if baseline else 0.0
        std = math.sqrt(variance)
        dev = vals["hfai"] - med
        months.append({"year": year, "month": month, **vals, "median_hfai": med,
                       "p25_hfai": q25, "p75_hfai": q75,
                       "anomaly_pct": (100 * dev / med) if med else None,
                       "z_score": (dev / std) if std else None})
    payload = {"generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
               "input_files": len(paths), "observations": len(records), "rejected_rows": rejected,
               "unknown_sensor_files": unknown, "overlap": {"start": str(OVERLAP_START), "end": str(OVERLAP_END),
               "cell_days": overlap_counts, "scaling": ratios}, "grid": "approximate equal-area 0.05 degree", "months": months,
               "hotspots": daily}
    (args.output / "app_data.json").write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    public = ROOT / "public"
    public.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(args.output / "app_data.json", public / "app_data.json")
    print(json.dumps({k: payload[k] for k in ("input_files", "observations", "rejected_rows", "overlap", "grid")}, indent=2))

if __name__ == "__main__":
    main()
