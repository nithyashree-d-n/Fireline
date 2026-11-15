import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Map as MapLibreMap, NavigationControl, AttributionControl, Popup, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PRIORITY_COUNTRIES = [
  { code: 'United_Kingdom', name: 'United Kingdom (UK)' },
  { code: 'India', name: 'India' },
  { code: 'United_States', name: 'United States (USA)' },
  { code: 'Australia', name: 'Australia' },
  { code: 'Canada', name: 'Canada' },
  { code: 'Brazil', name: 'Brazil' },
  { code: 'Spain', name: 'Spain' }
];

const YLORRD_RAMP = ['#ffffcc', '#fed976', '#feb24c', '#fd8d3c', '#f03b20', '#bd0026', '#67001f'];

// Reverse geocoding helper using OpenStreetMap Nominatim with local memory caching
const geoCache = new Map();
async function fetchLocationName(lat, lon, fallbackCountry = '') {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (geoCache.has(key)) return geoCache.get(key);

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
      headers: { 'User-Agent': 'FirelineNasaHarmonizationApp/1.0' }
    });
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const parts = [
        addr.state_district || addr.county || addr.city || addr.town || addr.village,
        addr.state,
        addr.country || fallbackCountry
      ].filter(Boolean);

      const locName = parts.length > 0 ? parts.join(', ') : (data.display_name?.split(',').slice(0, 3).join(',') || fallbackCountry || 'Regional Area');
      geoCache.set(key, locName);
      return locName;
    }
  } catch (err) {
    console.warn('Geocoding notice:', err);
  }
  return fallbackCountry || 'Regional Wildfire Zone';
}

function App() {
  setWorkerUrl(workerUrl);

  const [theme, setTheme] = useState('dark');
  const [globalData, setGlobalData] = useState(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState('India');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedSensor, setSelectedSensor] = useState('ALL');
  
  // Side Drawer & Comparison States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pinnedFires, setPinnedFires] = useState([]);
  const [toastMessage, setToastMessage] = useState('');

  const mapContainer = useRef(null);
  const mapInstance = useRef(null);

  // Apply Light/Dark Mode attribute to <html> root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load complete 200-country analytics dataset
  useEffect(() => {
    fetch('/global_country_analytics.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setGlobalData(data);
      })
      .catch(err => console.error('Failed to load country data', err));
  }, []);

  const countryData = globalData?.[selectedCountryCode] || {
    name: 'India',
    center: [78.96, 20.59],
    zoom: 4.4,
    total_fires: 4493996,
    years: [2022, 2023, 2024, 2025],
    annual_totals: { '2022': 1279974, '2023': 1050421, '2024': 993540, '2025': 1170061 },
    calendar_matrix: [
      { year: 2022, month: 1, count: 44824 }, { year: 2022, month: 2, count: 74270 }, { year: 2022, month: 3, count: 364722 },
      { year: 2022, month: 4, count: 311674 }, { year: 2022, month: 5, count: 120250 }, { year: 2022, month: 6, count: 30676 },
      { year: 2022, month: 7, count: 5608 }, { year: 2022, month: 8, count: 4866 }, { year: 2022, month: 9, count: 8067 },
      { year: 2022, month: 10, count: 67607 }, { year: 2022, month: 11, count: 160460 }, { year: 2022, month: 12, count: 86950 },
      { year: 2023, month: 1, count: 72834 }, { year: 2023, month: 2, count: 147181 }, { year: 2023, month: 3, count: 216718 },
      { year: 2023, month: 4, count: 212141 }, { year: 2023, month: 5, count: 94499 }, { year: 2023, month: 6, count: 33772 },
      { year: 2023, month: 7, count: 6851 }, { year: 2023, month: 8, count: 7060 }, { year: 2023, month: 9, count: 7042 },
      { year: 2023, month: 10, count: 55240 }, { year: 2023, month: 11, count: 124047 }, { year: 2023, month: 12, count: 73036 },
      { year: 2024, month: 1, count: 66574 }, { year: 2024, month: 2, count: 77491 }, { year: 2024, month: 3, count: 171826 },
      { year: 2024, month: 4, count: 250801 }, { year: 2024, month: 5, count: 140926 }, { year: 2024, month: 6, count: 33079 },
      { year: 2024, month: 7, count: 4068 }, { year: 2024, month: 8, count: 3720 }, { year: 2024, month: 9, count: 9661 },
      { year: 2024, month: 10, count: 34233 }, { year: 2024, month: 11, count: 109687 }, { year: 2024, month: 12, count: 91474 },
      { year: 2025, month: 1, count: 79960 }, { year: 2025, month: 2, count: 120169 }, { year: 2025, month: 3, count: 366665 },
      { year: 2025, month: 4, count: 217048 }, { year: 2025, month: 5, count: 92671 }, { year: 2025, month: 6, count: 16901 },
      { year: 2025, month: 7, count: 3995 }, { year: 2025, month: 8, count: 4819 }, { year: 2025, month: 9, count: 8416 },
      { year: 2025, month: 10, count: 28484 }, { year: 2025, month: 11, count: 110557 }, { year: 2025, month: 12, count: 120376 }
    ],
    daynight: { day: 2200000, night: 1014022 },
    intensity_tiers: { low: 2100000, moderate: 850000, high: 264022 },
    hotspots: [
      { date: "2025-03-25", yr: 2025, mo: 3, lat: 23.4615, lon: 92.2956, frp: 2338.5, sensor: "MODIS" },
      { date: "2025-03-08", yr: 2025, mo: 3, lat: 24.1214, lon: 92.4329, frp: 2056.4, sensor: "MODIS" },
      { date: "2025-04-02", yr: 2025, mo: 4, lat: 25.4762, lon: 93.4795, frp: 2022.5, sensor: "MODIS" },
      { date: "2025-03-29", yr: 2025, mo: 3, lat: 25.5373, lon: 92.9988, frp: 1930.3, sensor: "MODIS" },
      { date: "2025-03-10", yr: 2025, mo: 3, lat: 23.1238, lon: 92.8675, frp: 1909.2, sensor: "MODIS" },
      { date: "2025-03-05", yr: 2025, mo: 3, lat: 22.9639, lon: 92.824, frp: 1884.8, sensor: "MODIS" },
      { date: "2025-03-10", yr: 2025, mo: 3, lat: 24.471, lon: 93.2979, frp: 1817.9, sensor: "MODIS" },
      { date: "2025-03-11", yr: 2025, mo: 3, lat: 23.3507, lon: 93.1554, frp: 1775.1, sensor: "MODIS" },
      { date: "2025-03-25", yr: 2025, mo: 3, lat: 23.249, lon: 92.3919, frp: 1644.2, sensor: "MODIS" },
      { date: "2025-03-25", yr: 2025, mo: 3, lat: 23.2507, lon: 92.3961, frp: 1389.4, sensor: "MODIS" },
      { date: "2025-04-25", yr: 2025, mo: 4, lat: 25.5219, lon: 77.8362, frp: 1281.1, sensor: "MODIS" },
      { date: "2025-04-02", yr: 2025, mo: 4, lat: 25.4783, lon: 93.4915, frp: 1276.8, sensor: "MODIS" },
      { date: "2025-03-10", yr: 2025, mo: 3, lat: 24.9891, lon: 93.1605, frp: 1236.4, sensor: "MODIS" },
      { date: "2025-03-29", yr: 2025, mo: 3, lat: 25.5289, lon: 92.9186, frp: 1200.1, sensor: "MODIS" },
      { date: "2025-03-14", yr: 2025, mo: 3, lat: 25.2987, lon: 93.6311, frp: 1112.0, sensor: "MODIS" },
      { date: "2025-03-25", yr: 2025, mo: 3, lat: 24.901, lon: 93.6014, frp: 1105.5, sensor: "MODIS" },
      { date: "2025-03-08", yr: 2025, mo: 3, lat: 24.1118, lon: 92.4349, frp: 1064.8, sensor: "MODIS" },
      { date: "2025-03-29", yr: 2025, mo: 3, lat: 25.5415, lon: 92.9911, frp: 1017.9, sensor: "MODIS" },
      { date: "2025-03-28", yr: 2025, mo: 3, lat: 24.8576, lon: 94.3732, frp: 1014.4, sensor: "MODIS" },
      { date: "2025-03-08", yr: 2025, mo: 3, lat: 24.0951, lon: 92.5134, frp: 1012.1, sensor: "MODIS" },
      { date: "2025-03-11", yr: 2025, mo: 3, lat: 23.4071, lon: 93.2368, frp: 993.2, sensor: "MODIS" },
      { date: "2025-03-13", yr: 2025, mo: 3, lat: 24.2248, lon: 93.3136, frp: 969.0, sensor: "MODIS" },
      { date: "2025-03-26", yr: 2025, mo: 3, lat: 24.2273, lon: 93.5164, frp: 968.0, sensor: "MODIS" },
      { date: "2025-03-10", yr: 2025, mo: 3, lat: 22.748, lon: 92.8471, frp: 964.8, sensor: "MODIS" },
      { date: "2025-03-10", yr: 2025, mo: 3, lat: 24.9924, lon: 93.1762, frp: 952.0, sensor: "MODIS" },
      { date: "2025-03-15", yr: 2025, mo: 3, lat: 22.3755, lon: 92.8273, frp: 938.9, sensor: "MODIS" },
      { date: "2025-03-29", yr: 2025, mo: 3, lat: 25.6645, lon: 93.0715, frp: 936.6, sensor: "MODIS" },
      { date: "2025-03-25", yr: 2025, mo: 3, lat: 24.9045, lon: 93.6082, frp: 899.5, sensor: "MODIS" },
      { date: "2025-03-17", yr: 2025, mo: 3, lat: 25.4828, lon: 90.8714, frp: 897.4, sensor: "MODIS" },
      { date: "2025-03-10", yr: 2025, mo: 3, lat: 23.1102, lon: 92.8706, frp: 896.6, sensor: "MODIS" }
    ]
  };

  // Filter hotspots for current map view
  const visibleHotspots = useMemo(() => {
    if (!countryData.hotspots) return [];
    return countryData.hotspots.filter(h => {
      const matchSensor = selectedSensor === 'ALL' || h.sensor === selectedSensor;
      const matchYear = selectedYear === 'ALL' || Number(h.yr) === Number(selectedYear);
      const matchMonth = selectedMonth === 'ALL' || Number(h.mo) === Number(selectedMonth);
      return matchSensor && matchYear && matchMonth;
    });
  }, [countryData.hotspots, selectedSensor, selectedYear, selectedMonth]);

  // Max count for heat matrix color scaling
  const matrixMaxCount = useMemo(() => {
    if (!countryData.calendar_matrix?.length) return 1;
    return Math.max(1, ...countryData.calendar_matrix.map(c => c.count));
  }, [countryData.calendar_matrix]);

  // Derived Year-Wise Data Analytics & Dynamic Inferences (no hardcoding)
  const analyticsInsights = useMemo(() => {
    const isAllYears = selectedYear === 'ALL';
    const currentYearNum = isAllYears ? null : Number(selectedYear);

    // 1. Seasonal Concentration: Dynamic for selected year or multi-year aggregate
    let monthlyTotals = {};
    if (isAllYears) {
      (countryData.calendar_matrix || []).forEach(entry => {
        const m = Number(entry.month);
        monthlyTotals[m] = (monthlyTotals[m] || 0) + Number(entry.count);
      });
    } else {
      (countryData.calendar_matrix || [])
        .filter(entry => Number(entry.year) === currentYearNum)
        .forEach(entry => {
          const m = Number(entry.month);
          monthlyTotals[m] = Number(entry.count);
        });
    }

    const sortedMonths = Object.entries(monthlyTotals)
      .map(([m, cnt]) => ({ month: Number(m), count: cnt }))
      .sort((a, b) => b.count - a.count);

    const top3Months = sortedMonths.slice(0, 3);
    const top3Count = top3Months.reduce((sum, item) => sum + item.count, 0);
    const yearVolume = isAllYears
      ? (countryData.total_fires || 1)
      : (countryData.annual_totals?.[selectedYear] || 1);
    const concentrationPct = Math.round((top3Count / yearVolume) * 100);
    const top3Names = top3Months.map(item => MONTH_NAMES[item.month - 1]).join(', ');

    // 2. Comparative Trajectory against immediate prior year (or multi-year baseline for earliest year)
    let curVol = 0;
    let baselineVol = 0;
    let baselineLabel = '';
    let yoyPercent = 0;
    let isEscalating = false;

    if (isAllYears) {
      curVol = countryData.annual_totals?.['2025'] || 0;
      baselineVol = countryData.annual_totals?.['2024'] || 0;
      baselineLabel = 'vs 2024';
      const diff = curVol - baselineVol;
      yoyPercent = baselineVol > 0 ? ((diff / baselineVol) * 100).toFixed(1) : 0;
      isEscalating = diff > 0;
    } else {
      curVol = countryData.annual_totals?.[selectedYear] || 0;
      const prevYearStr = String(currentYearNum - 1);
      if (countryData.annual_totals?.[prevYearStr]) {
        baselineVol = countryData.annual_totals[prevYearStr];
        baselineLabel = `vs ${prevYearStr}`;
        const diff = curVol - baselineVol;
        yoyPercent = baselineVol > 0 ? ((diff / baselineVol) * 100).toFixed(1) : 0;
        isEscalating = diff > 0;
      } else {
        // For earliest year (2018), compare against 8-year annual average
        const annuals = Object.values(countryData.annual_totals || {});
        baselineVol = annuals.length > 0 ? Math.round(annuals.reduce((a, b) => a + b, 0) / annuals.length) : curVol;
        baselineLabel = 'vs 8-year mean';
        const diff = curVol - baselineVol;
        yoyPercent = baselineVol > 0 ? ((diff / baselineVol) * 100).toFixed(1) : 0;
        isEscalating = diff > 0;
      }
    }

    // 3. Energy Spectrum & Emergency Wildfire Surge (High > 100 MW)
    let severeCount = 0;
    let modCount = 0;
    let lowCount = 0;
    if (!isAllYears && countryData.annual_intensity_tiers?.[selectedYear]) {
      const yrTiers = countryData.annual_intensity_tiers[selectedYear];
      severeCount = yrTiers.high || 0;
      modCount = yrTiers.moderate || 0;
      lowCount = yrTiers.low || 0;
    } else {
      severeCount = countryData.intensity_tiers?.high || 0;
      modCount = countryData.intensity_tiers?.moderate || 0;
      lowCount = countryData.intensity_tiers?.low || 0;
    }
    const tierTotal = (lowCount + modCount + severeCount) || 1;
    const severePct = ((severeCount / tierTotal) * 100).toFixed(1);
    const modPct = ((modCount / tierTotal) * 100).toFixed(1);
    const lowPct = ((lowCount / tierTotal) * 100).toFixed(1);

    // 8-year history sparkline data (2018-2025)
    const availableYears = countryData.years ? countryData.years.map(String) : ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'];
    const sparklineData = availableYears.map(yr => ({
      year: yr,
      count: countryData.annual_totals?.[yr] || 0
    }));
    const maxSpark = Math.max(1, ...sparklineData.map(s => s.count));

    return {
      isAllYears,
      selectedYear,
      concentrationPct,
      top3Names,
      top3Count,
      yearVolume,
      curVol,
      baselineVol,
      baselineLabel,
      yoyPercent,
      isEscalating,
      severeCount,
      severePct,
      modCount,
      modPct,
      lowCount,
      lowPct,
      sparklineData,
      maxSpark
    };
  }, [countryData, selectedYear]);

  // Color generator for Thermal Heat (YlOrRd)
  const getCellColor = (count) => {
    if (!count) return 'var(--cell-bg-empty)';
    const t = Math.max(0, Math.min(1, count / matrixMaxCount));
    const q = t * (YLORRD_RAMP.length - 1);
    const i = Math.min(YLORRD_RAMP.length - 2, Math.floor(q));
    const f = q - i;

    const c1 = YLORRD_RAMP[i].replace('#', '');
    const c2 = YLORRD_RAMP[i + 1].replace('#', '');
    const r1 = parseInt(c1.substring(0, 2), 16), g1 = parseInt(c1.substring(2, 4), 16), b1 = parseInt(c1.substring(4, 6), 16);
    const r2 = parseInt(c2.substring(0, 2), 16), g2 = parseInt(c2.substring(2, 4), 16), b2 = parseInt(c2.substring(4, 6), 16);

    const r = Math.round(r1 + (r2 - r1) * f);
    const g = Math.round(g1 + (g2 - g1) * f);
    const b = Math.round(b1 + (b2 - b1) * f);

    return `rgb(${r}, ${g}, ${b})`;
  };

  // Function to pin fire, fetch real location name, and open drawer
  const handlePinFire = async (fireObj) => {
    setToastMessage(`Locating and adding fire to comparison...`);
    setIsDrawerOpen(true);

    const locationName = await fetchLocationName(fireObj.lat, fireObj.lon, fireObj.country);
    const enrichedFire = { ...fireObj, locationName };

    setPinnedFires(prev => {
      const exists = prev.some(f => Math.abs(f.lat - fireObj.lat) < 0.001 && Math.abs(f.lon - fireObj.lon) < 0.001 && f.date === fireObj.date);
      if (exists) return prev;
      return [enrichedFire, ...prev.slice(0, 4)];
    });

    setToastMessage(`Added fire from ${locationName} to comparison window`);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Keep a stable ref to handlePinFire for popup DOM event listener
  const handlePinFireRef = useRef(handlePinFire);
  useEffect(() => {
    handlePinFireRef.current = handlePinFire;
  });

  // Current active popup ref to close on selection
  const activePopupRef = useRef(null);

  // Add fire layer with vivid glowing thermal dots
  const addFireLayers = (map) => {
    if (map.getSource('fires')) return;

    map.addSource('fires', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });

    map.addLayer({
      id: 'fire-dots',
      type: 'circle',
      source: 'fires',
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          2, 3.5,
          6, 6.5,
          10, 13
        ],
        'circle-color': [
          'interpolate', ['linear'], ['get', 'frp'],
          0, '#fff475',      // Pale Lemon Yellow (low / smoldering fire)
          25, '#ffd600',     // Bright Golden Yellow (moderate agricultural clearing)
          75, '#ff8f00',     // Deep Amber Orange (intense brush / woodland burn)
          200, '#ff3d00',    // Vivid Vermilion Red (severe crown fire)
          600, '#b71c1c'     // Deep Crimson Red (extreme blowup wildfire)
        ],
        'circle-opacity': 0.95,
        'circle-stroke-width': 1.0,
        'circle-stroke-color': '#ffffff'
      }
    });

    map.on('click', 'fire-dots', (e) => {
      const p = e.features?.[0]?.properties;
      if (!p) return;

      const fireObj = {
        date: p.date,
        frp: p.frp,
        lat: Number(p.lat),
        lon: Number(p.lon),
        sensor: p.sensor,
        country: countryData.name
      };

      if (activePopupRef.current) {
        activePopupRef.current.remove();
      }

      // Build popup DOM container with direct click listener
      const popupNode = document.createElement('div');
      popupNode.style.fontFamily = 'sans-serif';
      popupNode.style.color = '#182623';
      popupNode.style.padding = '4px';
      popupNode.style.fontSize = '13px';
      popupNode.innerHTML = `
        <b style="color: #2a574d; font-size: 14px;">NASA Active Fire Detection</b>
        <p style="margin: 3px 0 1px;">Date: <b>${p.date}</b></p>
        <p style="margin: 2px 0;">Fire Heat Output: <b>${p.frp} MW</b></p>
        <p style="margin: 2px 0; color: #4a5e57; font-size: 11px;">Sensor: ${p.sensor}</p>
        <button type="button" class="compare-fire-trigger-btn" style="margin-top: 8px; width: 100%; background: #2a574d; color: #fff; border: 0; padding: 7px 10px; border-radius: 3px; font-size: 11px; font-weight: 600; cursor: pointer;">
          Compare Fire
        </button>
      `;

      const compareBtn = popupNode.querySelector('.compare-fire-trigger-btn');
      if (compareBtn) {
        compareBtn.addEventListener('click', (evt) => {
          evt.stopPropagation();
          evt.preventDefault();
          if (handlePinFireRef.current) {
            handlePinFireRef.current(fireObj);
          }
          if (activePopupRef.current) {
            activePopupRef.current.remove();
          }
        });
      }

      const popup = new Popup({ closeButton: true })
        .setLngLat(e.lngLat)
        .setDOMContent(popupNode)
        .addTo(map);

      activePopupRef.current = popup;
    });

    map.on('mouseenter', 'fire-dots', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'fire-dots', () => { map.getCanvas().style.cursor = ''; });
  };

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const styleUrl = theme === 'dark'
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

    const map = new MapLibreMap({
      container: mapContainer.current,
      style: styleUrl,
      center: [78.96, 20.59],
      zoom: 4.4,
      minZoom: 1,
      maxZoom: 15,
      attributionControl: false
    });

    map.addControl(new NavigationControl({ showCompass: true }), 'top-right');
    map.addControl(new AttributionControl({ compact: true }), 'bottom-right');

    map.on('load', () => {
      addFireLayers(map);
      if (map.getSource('fires')) {
        map.getSource('fires').setData({
          type: 'FeatureCollection',
          features: visibleHotspots.map(h => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [h.lon, h.lat] },
            properties: { date: h.date, frp: h.frp, sensor: h.sensor, lat: h.lat, lon: h.lon }
          }))
        });
      }
    });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update map style when theme changes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    const styleUrl = theme === 'dark'
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

    map.setStyle(styleUrl);
    map.once('style.load', () => {
      addFireLayers(map);
      if (map.getSource('fires')) {
        map.getSource('fires').setData({
          type: 'FeatureCollection',
          features: visibleHotspots.map(h => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [h.lon, h.lat] },
            properties: { date: h.date, frp: h.frp, sensor: h.sensor, lat: h.lat, lon: h.lon }
          }))
        });
      }
    });
  }, [theme]);

  // Update GeoJSON source whenever visibleHotspots changes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !map.getSource('fires')) return;

    map.getSource('fires').setData({
      type: 'FeatureCollection',
      features: visibleHotspots.map(h => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [h.lon, h.lat] },
        properties: {
          date: h.date,
          frp: h.frp,
          sensor: h.sensor,
          lat: h.lat,
          lon: h.lon
        }
      }))
    });
  }, [visibleHotspots]);

  // Handle Country selection
  const handleCountrySelect = (code) => {
    setSelectedCountryCode(code);
    setSelectedYear('ALL');
    setSelectedMonth('ALL');
    const target = globalData?.[code];
    if (target && mapInstance.current) {
      mapInstance.current.flyTo({
        center: target.center,
        zoom: target.zoom,
        duration: 900
      });
    }
  };

  // Matrix cell click
  const handleCellClick = (year, month) => {
    if (Number(selectedYear) === Number(year) && Number(selectedMonth) === Number(month)) {
      setSelectedYear('ALL');
      setSelectedMonth('ALL');
    } else {
      setSelectedYear(String(year));
      setSelectedMonth(Number(month));
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!visibleHotspots.length) return;
    const header = ['Date', 'Year', 'Month', 'Latitude', 'Longitude', 'Fire_Radiative_Power_MW', 'Sensor'];
    const rows = visibleHotspots.map(h => [h.date, h.yr, h.mo, h.lat, h.lon, h.frp, h.sensor]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nasa_fireline_${selectedCountryCode}_${selectedYear}_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export 1-Page Printable PDF Incident Briefing Report
  const handleExportPDF = () => {
    let mapDataUrl = '';
    try {
      if (map.current) {
        mapDataUrl = map.current.getCanvas().toDataURL('image/png');
      }
    } catch {
      mapDataUrl = '';
    }

    const yearLabel = selectedYear === 'ALL' ? 'All Recorded Years (2018–2025)' : `Year ${selectedYear}`;
    const monthLabel = selectedMonth === 'ALL' ? 'All Months' : MONTH_NAMES[Number(selectedMonth) - 1];
    const totalCountryFires = (selectedYear === 'ALL'
      ? (countryData.total_fires || 0)
      : (countryData.annual_totals?.[selectedYear] || 0)
    ).toLocaleString();

    const topMonthsList = topPeakMonths.slice(0, 5).map((m, idx) =>
      `<tr><td style="padding:4px 8px;border-bottom:1px solid #e2e8f0;font-weight:600;">#${idx + 1} ${m.month}</td><td style="padding:4px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;">${m.count.toLocaleString()} fires</td></tr>`
    ).join('');

    const annualRows = (countryData.years || ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025']).map(yr => {
      const cnt = countryData.annual_totals?.[String(yr)] || 0;
      const isSel = selectedYear === String(yr);
      return `<tr style="${isSel ? 'background:#fef3c7;font-weight:700;' : ''}"><td style="padding:4px 8px;border-bottom:1px solid #e2e8f0;">${yr}</td><td style="padding:4px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;">${cnt.toLocaleString()}</td></tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Fireline Incident Briefing Report - ${countryData.name}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; background: #fff; font-size: 11px; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2a574d; padding-bottom: 8px; margin-bottom: 12px; }
    .title h1 { margin: 0; font-size: 18px; color: #1e293b; font-weight: 800; letter-spacing: -0.01em; }
    .title p { margin: 2px 0 0; color: #64748b; font-size: 10px; }
    .badge { background: #2a574d; color: #fff; padding: 4px 8px; border-radius: 3px; font-weight: 700; font-size: 10px; font-family: monospace; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 10px; }
    .card-lbl { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px; }
    .card-val { font-size: 16px; font-weight: 800; color: #0f172a; font-family: monospace; }
    .card-sub { font-size: 9px; color: #475569; margin-top: 2px; }
    .main-section { display: grid; grid-template-columns: 1.3fr 1fr; gap: 12px; margin-bottom: 12px; }
    .map-box { border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; background: #0f172a; text-align: center; }
    .map-box img { width: 100%; height: 210px; object-fit: cover; display: block; }
    .table-box { border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px; background: #fff; }
    .table-box h3 { margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #334155; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    .inferences { background: #f1f5f9; border-left: 3px solid #2a574d; border-radius: 0 4px 4px 0; padding: 8px 12px; margin-bottom: 10px; }
    .inferences h4 { margin: 0 0 4px; font-size: 11px; font-weight: 700; color: #1e293b; }
    .inferences p { margin: 0; color: #334155; font-size: 10px; line-height: 1.45; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 6px; display: flex; justify-content: space-between; color: #94a3b8; font-size: 8.5px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">
      <h1>FIRELINE INCIDENT & BRIEFING REPORT</h1>
      <p>Harmonized NASA MODIS & VIIRS Earth Observation Intelligence</p>
    </div>
    <div class="badge">OFFICIAL BRIEFING</div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-lbl">Country / Region</div>
      <div class="card-val">${countryData.name}</div>
      <div class="card-sub">Region Code: ${countryData.code || selectedCountryCode}</div>
    </div>
    <div class="card">
      <div class="card-lbl">Filter Timeframe</div>
      <div class="card-val" style="font-size:13px;">${yearLabel}</div>
      <div class="card-sub">${monthLabel}</div>
    </div>
    <div class="card">
      <div class="card-lbl">Total Recorded Fires</div>
      <div class="card-val" style="color:#2a574d;">${totalCountryFires}</div>
      <div class="card-sub">${filteredFiresCount.toLocaleString()} in current filter</div>
    </div>
    <div class="card">
      <div class="card-lbl">Emergency Wildfires (>100 MW)</div>
      <div class="card-val" style="color:#b91c1c;">${emergencyWildfires.count.toLocaleString()}</div>
      <div class="card-sub">${emergencyWildfires.pct}% of total fires</div>
    </div>
  </div>

  <div class="main-section">
    <div class="map-box">
      ${mapDataUrl ? `<img src="${mapDataUrl}" alt="Satellite Fire Map" />` : '<div style="color:#cbd5e1;padding:80px 10px;font-size:11px;">Satellite Map Observation Capture</div>'}
      <div style="padding:4px 6px;background:#0f172a;color:#94a3b8;font-size:8.5px;text-align:left;">
        Displaying ${visibleHotspots.length.toLocaleString()} verified thermal hotspot coordinates across ${countryData.name}.
      </div>
    </div>

    <div>
      <div class="table-box" style="margin-bottom:8px;">
        <h3>Peak Fire Outbreak Months</h3>
        <table>
          <tbody>
            ${topMonthsList}
          </tbody>
        </table>
      </div>

      <div class="table-box">
        <h3>Annual Burning History (2018-2025)</h3>
        <table>
          <tbody>
            ${annualRows}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="inferences">
    <h4>Key Actionable Briefing for Emergency Response</h4>
    <p>
      In ${countryData.name}, ${emergencyWildfires.count.toLocaleString()} high-intensity emergency blazes (>100 MW) were observed, representing ${emergencyWildfires.pct}% of active burning.
      Peak burning seasons cluster primarily around <b>${topPeakMonths.slice(0, 3).map(m => m.month).join(', ')}</b>. 
      Fire departments and forestry agencies should prioritize aerial suppression and preventative fuel breaks prior to these key months.
    </p>
  </div>

  <div class="footer">
    <span>Report Generated: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC</span>
    <span>Photo credit: CONAE • Data courtesy of NASA FIRMS • Fireline Operational Intelligence</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`;

    const printWin = window.open('', '_blank', 'width=900,height=750');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
    }
  };

  // Top 5 peak burning months - dynamically reactive to selectedYear
  const topPeakMonths = useMemo(() => {
    const monthlySums = MONTH_NAMES.map((name, idx) => {
      const mNum = idx + 1;
      let count = 0;
      if (selectedYear === 'ALL') {
        count = countryData.calendar_matrix
          ?.filter(c => Number(c.month) === Number(mNum))
          ?.reduce((sum, c) => sum + Number(c.count), 0) || 0;
      } else {
        const entry = countryData.calendar_matrix
          ?.find(c => Number(c.year) === Number(selectedYear) && Number(c.month) === Number(mNum));
        count = entry ? Number(entry.count) : 0;
      }
      return { name, count, mNum };
    });
    return monthlySums.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [countryData.calendar_matrix, selectedYear]);

  // Filtered fire count matching current user selections (year, month, sensor)
  const filteredFireCount = useMemo(() => {
    if (selectedYear === 'ALL' && selectedMonth === 'ALL') {
      return countryData.total_fires || 0;
    }
    if (selectedYear !== 'ALL' && selectedMonth === 'ALL') {
      return countryData.annual_totals?.[selectedYear] || 0;
    }
    if (selectedYear === 'ALL' && selectedMonth !== 'ALL') {
      return countryData.calendar_matrix
        ?.filter(c => Number(c.month) === Number(selectedMonth))
        ?.reduce((sum, c) => sum + Number(c.count), 0) || 0;
    }
    // Specific year and specific month
    const match = countryData.calendar_matrix?.find(
      c => Number(c.year) === Number(selectedYear) && Number(c.month) === Number(selectedMonth)
    );
    return match ? match.count : 0;
  }, [countryData, selectedYear, selectedMonth]);

  // High-intensity (>100 MW) emergency wildfires - dynamically reactive to selectedYear
  const severeFireMetrics = useMemo(() => {
    if (selectedYear !== 'ALL' && countryData.annual_intensity_tiers?.[selectedYear]) {
      const yrTier = countryData.annual_intensity_tiers[selectedYear];
      const count = yrTier.high || 0;
      const yrTotal = countryData.annual_totals?.[selectedYear] || (yrTier.low + yrTier.moderate + count) || 1;
      const pct = ((count / yrTotal) * 100).toFixed(1);
      return { count, pct, label: `in ${selectedYear}` };
    }
    // All years cumulative
    const count = countryData.intensity_tiers?.high || 0;
    const total = countryData.total_fires || 1;
    const pct = ((count / total) * 100).toFixed(1);
    return { count, pct, label: 'across 2018-2025' };
  }, [countryData, selectedYear]);

  // Sorted list of all countries for dropdown
  const allCountryList = useMemo(() => {
    if (!globalData) return [];
    return Object.entries(globalData)
      .map(([code, item]) => ({ code, name: item.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [globalData]);

  return (
    <div className="app-root">
      {/* Top Navbar */}
      <header className="app-header">
        <div className="brand-wrapper">
          <img src="/favicon.svg" alt="Fireline Logo" className="brand-logo-img" />
          <div className="brand-info">
            <h1>FIRELINE · EARTH OBSERVATION</h1>
            <p>Harmonized Multi-Year MODIS & VIIRS Wildfire Analytics</p>
          </div>
        </div>

        <div className="header-right">
          {/* Comparison Side Window Trigger Button */}
          <button
            className="compare-toggle-header-btn"
            onClick={() => setIsDrawerOpen(prev => !prev)}
            title="Open side comparison window"
          >
            <span>Compare Fires</span>
            <span className="compare-count-pill">{pinnedFires.length}</span>
          </button>

          <button
            className="theme-toggle-btn"
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            title="Toggle Light / Dark mode"
          >
            {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
          </button>
        </div>
      </header>

      <main className="app-container">
        {/* Universal Country Navigation Bar */}
        <div className="country-nav-bar">
          <div className="priority-countries-group">
            <label>TOP REGIONS:</label>
            {PRIORITY_COUNTRIES.map(c => (
              <button
                key={c.code}
                className={`c-btn ${selectedCountryCode === c.code ? 'active' : ''}`}
                onClick={() => handleCountrySelect(c.code)}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="global-country-dropdown">
            <label htmlFor="country-select">All 200 Countries:</label>
            <select
              id="country-select"
              className="country-select-dropdown"
              value={selectedCountryCode}
              onChange={e => handleCountrySelect(e.target.value)}
            >
              {allCountryList.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Analytics KPI Row */}
        <div className="kpi-grid">
          {/* Box 1: Annual Fire Breakdown */}
          <div className="kpi-card annual-breakdown-kpi-card">
            <div className="kpi-header">
              <span>ANNUAL BURNING TOTALS</span>
              <span>2018–2025</span>
            </div>
            <div className="annual-counts-row">
              {['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018'].map(yr => {
                const yrCount = countryData.annual_totals?.[yr] || 0;
                const isCurrent = selectedYear === yr;
                return (
                  <div
                    key={yr}
                    className={`annual-count-pill ${isCurrent ? 'selected' : ''}`}
                    onClick={() => setSelectedYear(selectedYear === yr ? 'ALL' : yr)}
                    title={`Click to filter by ${yr} (${yrCount.toLocaleString()} fires)`}
                  >
                    <span className="pill-year">{yr}</span>
                    <span className="pill-val">
                      {yrCount >= 1000000
                        ? `${(yrCount / 1000000).toFixed(2)}M`
                        : yrCount >= 1000
                          ? `${(yrCount / 1000).toFixed(0)}k`
                          : yrCount.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="kpi-note">
              {selectedYear === 'ALL'
                ? 'Individual annual fire volumes. Click any year to filter.'
                : `Filtered to ${selectedYear} (${(countryData.annual_totals?.[selectedYear] || 0).toLocaleString()} fires).`}
            </div>
          </div>

          {/* Box 2: Peak Burning Season & Next 4 Highest Months */}
          <div className="kpi-card peak-season-kpi-card">
            <div className="kpi-header">
              <span>PEAK BURNING SEASONS</span>
              <span>{selectedYear === 'ALL' ? 'HISTORICAL TOP 5' : `${selectedYear} TOP 5`}</span>
            </div>
            <div className="kpi-val">
              {topPeakMonths[0]?.name || 'N/A'}
            </div>
            <div className="kpi-rank-list">
              <span className="rank-tag">Next Highest:</span>
              {topPeakMonths.slice(1, 5).map((m, idx) => (
                <span key={m.name} className="rank-month-item" title={`${m.name}: ${m.count.toLocaleString()} fire detections`}>
                  <b>{idx + 2}.</b> {m.name}
                </span>
              ))}
            </div>
            <div className="kpi-note">
              {selectedYear === 'ALL'
                ? 'Months with highest recurring multi-year fire outbreaks'
                : `Months with highest fire outbreak volume in ${selectedYear}`}
            </div>
          </div>

          {/* Box 3: Dangerous Emergency Wildfires (High Intensity) */}
          <div className="kpi-card">
            <div className="kpi-header">
              <span>EMERGENCY WILDFIRES</span>
              <span>HEAT &gt; 100 MW</span>
            </div>
            <div className="kpi-val" style={{ color: 'var(--fire-flame)' }}>
              {severeFireMetrics.count.toLocaleString()}
            </div>
            <div className="kpi-sub-badge">
              {severeFireMetrics.pct}% of fires {severeFireMetrics.label}
            </div>
            <div className="kpi-note">
              High-intensity blazes hot enough to burn canopy trees and resist normal suppression
            </div>
          </div>

          {/* Box 4: Active Region & Filtered Fire Count */}
          <div className="kpi-card active-filter-kpi-card">
            <div className="kpi-header">
              <span>ACTIVE REGION & FILTER</span>
              <span className="live-status-dot">ACTIVE</span>
            </div>
            
            <div className="filter-card-main">
              <div className="filter-country-title">{countryData.name}</div>
              <div className="filter-stat-primary">
                <span className="filter-stat-number">{filteredFireCount.toLocaleString()}</span>
                <span className="filter-stat-label">fires</span>
              </div>
            </div>

            <div className="filter-active-pills-row">
              <span className="active-pill-tag">
                Year: <b>{selectedYear === 'ALL' ? 'All (2018-25)' : selectedYear}</b>
              </span>
              {selectedMonth !== 'ALL' && (
                <span className="active-pill-tag">
                  Month: <b>{MONTH_NAMES[Number(selectedMonth) - 1]}</b>
                </span>
              )}
            </div>

            <div className="kpi-note">
              Coordinates: {countryData.center?.[1]}°N, {countryData.center?.[0]}°E
            </div>
          </div>
        </div>

        {/* Map Explorer Section */}
        <section className="map-section">
          <div className="map-top-bar">
            <div className="map-title">
              Active Fire Detections across {countryData.name}
            </div>

            <div className="map-controls-right">
              {/* Year Filter Dropdown */}
              <select
                className="filter-pill-select"
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
              >
                <option value="ALL">All Years (2018–2025)</option>
                <option value="2025">2025 Only</option>
                <option value="2024">2024 Only</option>
                <option value="2023">2023 Only</option>
                <option value="2022">2022 Only</option>
                <option value="2021">2021 Only</option>
                <option value="2020">2020 Only</option>
                <option value="2019">2019 Only</option>
                <option value="2018">2018 Only</option>
              </select>

              {/* Month Filter Dropdown */}
              <select
                className="filter-pill-select"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              >
                <option value="ALL">All Months</option>
                {MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>

              {/* Sensor Toggle */}
              <div className="sensor-toggle-group">
                {['ALL', 'VIIRS', 'MODIS'].map(s => (
                  <button
                    key={s}
                    className={`sensor-toggle-btn ${selectedSensor === s ? 'active' : ''}`}
                    onClick={() => setSelectedSensor(s)}
                  >
                    {s === 'ALL' ? 'Both' : s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="map-container-box">
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
          </div>

          <div className="map-bottom-bar">
            <div>
              Showing <b>{visibleHotspots.length.toLocaleString()}</b> mapped fire hotspots
              {selectedYear !== 'ALL' && <span> in <b>{selectedYear}</b></span>}
              {selectedMonth !== 'ALL' && <span> (<b>{MONTH_NAMES[Number(selectedMonth) - 1]}</b>)</span>}
            </div>
            <div className="export-btn-group">
              <button className="export-btn" onClick={handleExportCSV} title="Download CSV of visible fire coordinates">
                Download CSV ({visibleHotspots.length.toLocaleString()})
              </button>
              <button className="export-btn pdf-btn" onClick={handleExportPDF} title="Download 1-page PDF Briefing Report">
                Export PDF Report
              </button>
            </div>
          </div>
        </section>

        {/* Multi-Year Burning Activity Calendar Matrix */}
        <section className="calendar-section">
          <div className="calendar-top-bar">
            <div>
              <h3>Historical Burning Activity Calendar (2018 – 2025)</h3>
              <p>Direct monthly fire counts using the standard NASA Thermal Heat scale. Click any cell to isolate that month on the map.</p>
            </div>
          </div>

          <div className="matrix-wrapper">
            <table className="matrix-table">
              <thead>
                <tr className="matrix-header">
                  <th>YEAR</th>
                  {MONTH_NAMES.map(m => (
                    <th key={m}>{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {countryData.years?.map(yr => (
                  <tr key={yr}>
                    <td className="year-title-td">{yr}</td>
                    {MONTH_NAMES.map((_, idx) => {
                      const mNum = idx + 1;
                      const record = countryData.calendar_matrix?.find(c => Number(c.year) === Number(yr) && Number(c.month) === Number(mNum));
                      const count = record ? record.count : 0;
                      const isSelected = Number(selectedYear) === Number(yr) && Number(selectedMonth) === Number(mNum);
                      const bgColor = getCellColor(count);
                      const t = matrixMaxCount > 0 ? (count / matrixMaxCount) : 0;
                      const textColor = count === 0
                        ? 'var(--text-dim)'
                        : (t > 0.55 ? '#ffffff' : '#111b18');

                      return (
                        <td
                          key={mNum}
                          className={`matrix-cell ${isSelected ? 'selected' : ''}`}
                          style={{
                            backgroundColor: bgColor,
                            color: textColor
                          }}
                          onClick={() => handleCellClick(yr, mNum)}
                          title={`${MONTH_NAMES[idx]} ${yr}: ${count.toLocaleString()} fire detections`}
                        >
                          <div className="cell-inner">
                            <span className="cell-cnt">
                              {count > 1000 ? `${Math.round(count / 1000)}k` : count}
                            </span>
                            <span className="cell-lbl">fires</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="matrix-legend-row">
            <div className="matrix-legend-compact">
              <span className="legend-label-sub">Few or zero fires</span>
              <div className="gradient-strip" />
              <span className="legend-label-sub">Peak month ({matrixMaxCount.toLocaleString()})</span>
            </div>
          </div>
        </section>

        {/* Operational Fire Analytics & Actionable Inferences */}
        <section className="insights-grid">
          {/* Card 1: Seasonal Burning Concentration (Dynamic for Selected Year) */}
          <div className="insight-card">
            <div className="insight-header">
              <span className="insight-tag">BURNING PATTERN</span>
              <span className="insight-metric-pill">
                {analyticsInsights.concentrationPct}% in 3 Months
              </span>
            </div>
            <h4>Peak Fire Months</h4>
            <div className="insight-stat-row">
              <div className="insight-stat-val">{analyticsInsights.top3Names || 'Peak Window'}</div>
              <div className="insight-stat-desc">
                {analyticsInsights.isAllYears ? 'Busiest burning months across all years' : `Busiest burning months in ${analyticsInsights.selectedYear}`}
              </div>
            </div>
            <div className="insight-bar-track">
              <div
                className="insight-bar-fill"
                style={{
                  width: `${Math.min(100, analyticsInsights.concentrationPct)}%`,
                  background: 'var(--primary-green)'
                }}
              />
            </div>
            <p>
              In {countryData.name}{analyticsInsights.isAllYears ? '' : ` in ${analyticsInsights.selectedYear}`}, {analyticsInsights.concentrationPct}% of all fires ({analyticsInsights.top3Count.toLocaleString()} fires) broke out during {analyticsInsights.top3Names}.
              This shows most fires happen during this short window, helping response teams plan ahead before peak season begins.
            </p>
          </div>

          {/* Card 2: Year-over-Year Risk Trajectory & Sparkline (Dynamic Prior Year Baseline) */}
          <div className="insight-card">
            <div className="insight-header">
              <span className="insight-tag">YEAR COMPARISON</span>
              <span
                className="insight-metric-pill"
                style={{
                  color: analyticsInsights.isEscalating ? '#ff4d4f' : 'var(--primary-green)',
                  borderColor: analyticsInsights.isEscalating ? 'rgba(255, 77, 79, 0.35)' : 'rgba(42, 87, 77, 0.35)'
                }}
              >
                {analyticsInsights.isEscalating ? `+${analyticsInsights.yoyPercent}% Increase` : `${analyticsInsights.yoyPercent}% Decrease`}
              </span>
            </div>
            <h4>
              {analyticsInsights.isAllYears ? '2024 to 2025 Fire Change' : `${analyticsInsights.selectedYear} Fire Volume vs Earlier`}
            </h4>
            <div className="insight-stat-row">
              <div className="insight-stat-val">
                {Number(analyticsInsights.curVol).toLocaleString()}
                <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '6px' }}>
                  {analyticsInsights.baselineLabel.replace('vs ', 'vs ')} ({Number(analyticsInsights.baselineVol).toLocaleString()})
                </span>
              </div>
              <div className="insight-stat-desc">
                {analyticsInsights.isEscalating ? 'More fires detected this year' : 'Fewer fires detected this year'}
              </div>
            </div>

            {/* 8-Year Sparkline Mini Trend */}
            <div className="sparkline-trend-container">
              {analyticsInsights.sparklineData.map(s => {
                const hPct = Math.max(14, Math.round((s.count / analyticsInsights.maxSpark) * 100));
                const isHit = analyticsInsights.selectedYear === s.year;
                const formattedCount = s.count >= 1000000 
                  ? `${(s.count / 1000000).toFixed(1)}M` 
                  : s.count >= 1000 
                    ? `${(s.count / 1000).toFixed(0)}k` 
                    : s.count.toLocaleString();

                return (
                  <div
                    key={s.year}
                    className={`spark-bar-col ${isHit ? 'active' : ''}`}
                    onClick={() => setSelectedYear(selectedYear === s.year ? 'ALL' : s.year)}
                    title={`Click to filter by ${s.year} (${s.count.toLocaleString()} fires)`}
                  >
                    <span className="spark-bar-val">{formattedCount}</span>
                    <div className="spark-bar-track">
                      <div className="spark-bar-fill" style={{ height: `${hPct}%` }} />
                    </div>
                    <span className="spark-bar-lbl">{s.year}</span>
                  </div>
                );
              })}
            </div>

            <p>
              In {analyticsInsights.isAllYears ? '2025' : analyticsInsights.selectedYear}, fire activity changed by {analyticsInsights.isEscalating ? `+${analyticsInsights.yoyPercent}%` : `${analyticsInsights.yoyPercent}%`} compared to {analyticsInsights.baselineLabel.replace('vs ', '')}.
              {analyticsInsights.isEscalating
                ? ' This means fire activity grew higher this year, so extra field monitoring is recommended.'
                : ' This means fire activity stayed lower this year, helped by good weather and fire management.'}
            </p>
          </div>

          {/* Card 3: Energy Spectrum & Emergency Wildfire Surge (High > 100 MW) */}
          <div className="insight-card">
            <div className="insight-header">
              <span className="insight-tag">FIRE STRENGTH</span>
              <span className="insight-metric-pill" style={{ color: 'var(--fire-flame)' }}>
                {analyticsInsights.severePct}% High Intensity
              </span>
            </div>
            <h4>Large Emergency Wildfires</h4>
            <div className="insight-stat-row">
              <div className="insight-stat-val" style={{ color: 'var(--fire-flame)' }}>
                {analyticsInsights.severeCount.toLocaleString()}
                <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '6px' }}>
                  large fires ({analyticsInsights.isAllYears ? '2018-25' : analyticsInsights.selectedYear})
                </span>
              </div>
              <div className="insight-stat-desc">Fires strong enough to spread across tree tops</div>
            </div>

            {/* Stacked Energy Spectrum Bar */}
            <div className="energy-spectrum-bar-wrap">
              <div className="energy-spectrum-bar">
                <div
                  className="energy-seg low"
                  style={{ width: `${Math.max(4, analyticsInsights.lowPct)}%` }}
                  title={`Small fires & field burning: ${analyticsInsights.lowCount.toLocaleString()} (${analyticsInsights.lowPct}%)`}
                />
                <div
                  className="energy-seg mod"
                  style={{ width: `${Math.max(3, analyticsInsights.modPct)}%` }}
                  title={`Moderate brush fires: ${analyticsInsights.modCount.toLocaleString()} (${analyticsInsights.modPct}%)`}
                />
                <div
                  className="energy-seg high"
                  style={{ width: `${Math.max(2, analyticsInsights.severePct)}%` }}
                  title={`Dangerous large wildfires: ${analyticsInsights.severeCount.toLocaleString()} (${analyticsInsights.severePct}%)`}
                />
              </div>
              <div className="energy-legend-row">
                <span>Small & Crop: <b>{analyticsInsights.lowPct}%</b></span>
                <span>Medium Brush: <b>{analyticsInsights.modPct}%</b></span>
                <span style={{ color: 'var(--fire-flame)' }}>Large Wildfires: <b>{analyticsInsights.severePct}%</b></span>
              </div>
            </div>

            <p>
              In {countryData.name}{analyticsInsights.isAllYears ? ' between 2018 and 2025' : ` in ${analyticsInsights.selectedYear}`}, {analyticsInsights.severeCount.toLocaleString()} fires ({analyticsInsights.severePct}%) grew into dangerous high-heat wildfires.
              Most other fires were routine small agricultural burns or grass clearing that died down quickly.
            </p>
          </div>
        </section>
      </main>

      {/* Slide-out Side Drawer for Wildfire Comparison */}
      {isDrawerOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setIsDrawerOpen(false)} />
          <div className="side-drawer" role="dialog" aria-label="Wildfire Comparison Window">
            <div className="drawer-header">
              <h3>
                <span>Wildfire Comparison</span>
                <span className="compare-count-pill">{pinnedFires.length}</span>
              </h3>
              <button
                className="drawer-close-btn"
                onClick={() => setIsDrawerOpen(false)}
                title="Close side window"
              >
                Close
              </button>
            </div>

            <div className="drawer-body">
              {pinnedFires.length === 0 ? (
                <div className="drawer-empty-state">
                  <b style={{ color: 'var(--text-main)', display: 'block', marginBottom: '6px', fontSize: '15px' }}>
                    No Fires Pinned Yet
                  </b>
                  <p>
                    Click any fire hotspot on the interactive map and click <b>"Compare Fire"</b>.
                    Its real geographical location name, heat power (MW), and satellite details will be added here for side-by-side analysis.
                  </p>
                </div>
              ) : (
                pinnedFires.map((f, i) => {
                  const tier = f.frp > 100 ? 'extreme' : f.frp > 25 ? 'moderate' : 'low';
                  const label = f.frp > 100 ? 'Severe Wildfire' : f.frp > 25 ? 'Moderate Burn' : 'Routine / Ag Burn';
                  return (
                    <div key={i} className="compare-card-drawer">
                      <div className="compare-card-top">
                        <span className={`compare-badge ${tier}`}>{label}</span>
                        <button
                          className="remove-pin-btn"
                          onClick={() => setPinnedFires(prev => prev.filter((_, idx) => idx !== i))}
                          title="Remove from comparison"
                        >
                          Remove
                        </button>
                      </div>

                      {/* Real Location Name Resolved by Geocoding */}
                      <div className="fire-location-title">
                        {f.locationName || `${f.country || 'Regional Zone'}`}
                      </div>

                      <div className="compare-metrics">
                        <span>Acquisition Date: <b>{f.date}</b></span>
                        <span>Fire Radiative Power: <b>{f.frp} MW</b></span>
                        <span>Coordinates: <b>{f.lat.toFixed(4)}°N, {f.lon.toFixed(4)}°E</b></span>
                        <span>Detecting Sensor: <b>{f.sensor}</b></span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {pinnedFires.length > 0 && (
              <div className="drawer-footer">
                <button
                  style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: '#ef4444',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  onClick={() => setPinnedFires([])}
                >
                  Clear All ({pinnedFires.length})
                </button>
                <button
                  className="export-btn"
                  onClick={() => {
                    const header = ['Location', 'Date', 'FRP_MW', 'Latitude', 'Longitude', 'Sensor'];
                    const rows = pinnedFires.map(f => [
                      `"${f.locationName || f.country}"`,
                      f.date,
                      f.frp,
                      f.lat,
                      f.lon,
                      f.sensor
                    ]);
                    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `pinned_wildfire_comparison.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download Comparison CSV
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Floating Action Feedback Toast */}
      {toastMessage && (
        <div className="toast-notice" role="status">
          <span>{toastMessage}</span>
        </div>
      )}

      <footer className="app-footer">
        FIRELINE · 2026 NASA SPACE APPS CHALLENGE • HARMONIZATION OF MODIS AND VIIRS HOT SPOTS<br />
        <span style={{ fontSize: '10px', marginTop: '4px', display: 'inline-block' }}>
          Photo credit: The National Commission on Space Activities of Argentina (CONAE) • Data courtesy of NASA FIRMS
        </span>
      </footer>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
