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

  const [theme, setTheme] = useState('light');
  const [globalData, setGlobalData] = useState(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState('India');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedSensor, setSelectedSensor] = useState('ALL');
  
  // Side Drawer & Comparison States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pinnedFires, setPinnedFires] = useState([]);
  const [toastMessage, setToastMessage] = useState('');

  // Regional Subdivisions & Continuous Multi-Year Timeline States (Index: 0 = Jan 2018, 95 = Dec 2025)
  const [subdivisionsData, setSubdivisionsData] = useState(null);
  const [selectedStateCode, setSelectedStateCode] = useState('ALL');
  const [regStartIdx, setRegStartIdx] = useState(84); // Jan 2025 default (index 84)
  const [regEndIdx, setRegEndIdx] = useState(95);   // Dec 2025 default (index 95)
  const [openTimePicker, setOpenTimePicker] = useState(null); // 'start', 'end', or null
  const timePickerRef = useRef(null);

  // Close timeframe popovers when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (timePickerRef.current && !timePickerRef.current.contains(e.target)) {
        setOpenTimePicker(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const mapContainer = useRef(null);
  const mapInstance = useRef(null);

  // Regional second map container and instance
  const regionalMapContainer = useRef(null);
  const regionalMapInstance = useRef(null);

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

    fetch('/country_subdivisions.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setSubdivisionsData(data);
      })
      .catch(err => console.error('Failed to load subdivisions', err));
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

  // List of states/provinces available for currently selected country
  const availableStates = useMemo(() => {
    if (!subdivisionsData || !subdivisionsData[selectedCountryCode]) return [];
    return subdivisionsData[selectedCountryCode];
  }, [subdivisionsData, selectedCountryCode]);

  // Selected state object
  const currentStateObj = useMemo(() => {
    if (selectedStateCode === 'ALL' || !availableStates.length) return null;
    return availableStates.find(s => s.code === selectedStateCode || s.name === selectedStateCode) || null;
  }, [availableStates, selectedStateCode]);

  // Filter hotspots for upper national map view (strictly responds to upper Year, Month, and Sensor controls)
  const visibleHotspots = useMemo(() => {
    if (!countryData.hotspots) return [];
    return countryData.hotspots.filter(h => {
      const matchSensor = selectedSensor === 'ALL' || h.sensor === selectedSensor;
      const matchYear = selectedYear === 'ALL' || Number(h.yr) === Number(selectedYear);
      const matchMonth = selectedMonth === 'ALL' || Number(h.mo) === Number(selectedMonth);
      return matchSensor && matchYear && matchMonth;
    });
  }, [countryData.hotspots, selectedSensor, selectedYear, selectedMonth]);

  // Convert continuous month index (0..95) to formatted Year & Month label (e.g. 0 -> 'Jan 2018', 95 -> 'Dec 2025')
  const indexToYearMonth = (idx) => {
    const yr = 2018 + Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    return { yr, mo: m, label: `${MONTH_NAMES[m - 1]} ${yr}` };
  };

  const regStartInfo = useMemo(() => indexToYearMonth(regStartIdx), [regStartIdx]);
  const regEndInfo = useMemo(() => indexToYearMonth(regEndIdx), [regEndIdx]);

  // Human-readable active timeline span label
  const regActiveTimelineLabel = useMemo(() => {
    const minI = Math.min(regStartIdx, regEndIdx);
    const maxI = Math.max(regStartIdx, regEndIdx);
    const startObj = indexToYearMonth(minI);
    const endObj = indexToYearMonth(maxI);
    if (minI === maxI) return startObj.label;
    if (minI === 0 && maxI === 95) return 'All Years (2018 – 2025)';
    return `${startObj.label} – ${endObj.label}`;
  }, [regStartIdx, regEndIdx]);

  // Filter hotspots for lower regional map & regional hub (responds to State subdivision and continuous timeline span)
  const regionalVisibleHotspots = useMemo(() => {
    if (!countryData.hotspots) return [];
    const minI = Math.min(regStartIdx, regEndIdx);
    const maxI = Math.max(regStartIdx, regEndIdx);
    const startObj = indexToYearMonth(minI);
    const endObj = indexToYearMonth(maxI);
    const startKey = startObj.yr * 100 + startObj.mo;
    const endKey = endObj.yr * 100 + endObj.mo;

    return countryData.hotspots.filter(h => {
      const matchSensor = selectedSensor === 'ALL' || h.sensor === selectedSensor;

      // State bounding box filter if selected
      let matchState = true;
      if (currentStateObj && currentStateObj.bbox) {
        const [minLon, minLat, maxLon, maxLat] = currentStateObj.bbox;
        matchState = h.lon >= minLon && h.lon <= maxLon && h.lat >= minLat && h.lat <= maxLat;
      }

      // Continuous Year-Month integer comparison (e.g. 202201 <= hKey <= 202409)
      const hKey = Number(h.yr) * 100 + Number(h.mo);
      const matchSpan = hKey >= startKey && hKey <= endKey;

      return matchSensor && matchState && matchSpan;
    });
  }, [countryData.hotspots, selectedSensor, currentStateObj, regStartIdx, regEndIdx]);

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

  // Derived Regional & Custom Date Range Analytics & Inferences (reacts to regionalVisibleHotspots, state, and timeline)
  const regionalAnalyticsInsights = useMemo(() => {
    const list = regionalVisibleHotspots || [];
    const totalCount = list.length;
    const regionName = currentStateObj ? currentStateObj.name : countryData.name;

    // 1. Seasonal Concentration in Region
    const monthlyCounts = {};
    list.forEach(h => {
      const m = Number(h.mo);
      if (m >= 1 && m <= 12) {
        monthlyCounts[m] = (monthlyCounts[m] || 0) + 1;
      }
    });

    const sortedMonths = Object.entries(monthlyCounts)
      .map(([m, cnt]) => ({ month: Number(m), count: cnt }))
      .sort((a, b) => b.count - a.count);

    const top3Months = sortedMonths.slice(0, 3);
    const top3Count = top3Months.reduce((sum, item) => sum + item.count, 0);
    const concentrationPct = totalCount > 0 ? Math.round((top3Count / totalCount) * 100) : 0;
    const top3Names = top3Months.length > 0
      ? top3Months.map(item => MONTH_NAMES[item.month - 1]).join(', ')
      : 'Insufficient Data';

    // 2. Year-by-Year distribution within the selected regional filter (computed across all years for region/subdivision)
    const yearCounts = {};
    const availableYears = countryData.years ? countryData.years.map(String) : ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'];
    availableYears.forEach(yr => { yearCounts[yr] = 0; });

    // Filter country hotspots strictly by selected state/subdivision boundary across all years
    const regionalAllYearsHotspots = (countryData.hotspots || []).filter(h => {
      const matchSensor = selectedSensor === 'ALL' || h.sensor === selectedSensor;
      if (!matchSensor) return false;
      if (currentStateObj && currentStateObj.bbox) {
        const [minLon, minLat, maxLon, maxLat] = currentStateObj.bbox;
        return h.lon >= minLon && h.lon <= maxLon && h.lat >= minLat && h.lat <= maxLat;
      }
      return true;
    });

    regionalAllYearsHotspots.forEach(h => {
      const yStr = String(h.yr);
      if (yearCounts[yStr] !== undefined) {
        yearCounts[yStr] = (yearCounts[yStr] || 0) + 1;
      }
    });

    const sparklineData = availableYears.map(yr => ({
      year: yr,
      count: yearCounts[yr] || 0
    }));
    const maxSpark = Math.max(1, ...sparklineData.map(s => s.count));

    // Trajectory: compare latest active year in range to prior year
    const activeYearsWithData = availableYears.filter(yr => (yearCounts[yr] || 0) > 0);
    const latestYr = activeYearsWithData.length > 0 ? activeYearsWithData[activeYearsWithData.length - 1] : '2025';
    const priorYr = String(Number(latestYr) - 1);
    const curVol = yearCounts[latestYr] || 0;
    const baselineVol = yearCounts[priorYr] || 0;
    const baselineLabel = `vs ${priorYr}`;
    const diff = curVol - baselineVol;
    const yoyPercent = baselineVol > 0 ? ((diff / baselineVol) * 100).toFixed(1) : 0;
    const isEscalating = diff > 0;

    // 3. Fire Strength & Intensity Tiers for Region
    let lowCount = 0;
    let modCount = 0;
    let severeCount = 0;
    list.forEach(h => {
      if (h.frp > 100) severeCount++;
      else if (h.frp >= 25) modCount++;
      else lowCount++;
    });

    const tierTotal = totalCount || 1;
    const severePct = ((severeCount / tierTotal) * 100).toFixed(1);
    const modPct = ((modCount / tierTotal) * 100).toFixed(1);
    const lowPct = ((lowCount / tierTotal) * 100).toFixed(1);

    return {
      regionName,
      totalCount,
      concentrationPct,
      top3Names,
      top3Count,
      curVol,
      baselineVol,
      baselineLabel,
      yoyPercent,
      isEscalating,
      latestYr,
      severeCount,
      severePct,
      modCount,
      modPct,
      lowCount,
      lowPct,
      sparklineData,
      maxSpark
    };
  }, [regionalVisibleHotspots, currentStateObj, countryData, selectedSensor]);

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

  // Initialize Regional Second MapLibre Instance
  useEffect(() => {
    if (!regionalMapContainer.current || regionalMapInstance.current) return;

    const styleUrl = theme === 'dark'
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

    const regMap = new MapLibreMap({
      container: regionalMapContainer.current,
      style: styleUrl,
      center: countryData.center || [78.96, 20.59],
      zoom: countryData.zoom || 4.4,
      minZoom: 1,
      maxZoom: 15,
      attributionControl: false,
      preserveDrawingBuffer: true,
      fadeDuration: 0
    });

    regMap.addControl(new NavigationControl({ showCompass: true }), 'top-right');
    regMap.addControl(new AttributionControl({ compact: true }), 'bottom-right');

    regMap.on('load', () => {
      addFireLayers(regMap);
      if (regMap.getSource('fires')) {
        regMap.getSource('fires').setData({
          type: 'FeatureCollection',
          features: regionalVisibleHotspots.map(h => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [h.lon, h.lat] },
            properties: { date: h.date, frp: h.frp, sensor: h.sensor, lat: h.lat, lon: h.lon }
          }))
        });
      }
    });

    regionalMapInstance.current = regMap;

    return () => {
      regMap.remove();
      regionalMapInstance.current = null;
    };
  }, []);

  // Update regional map style when theme changes
  useEffect(() => {
    const regMap = regionalMapInstance.current;
    if (!regMap) return;

    const styleUrl = theme === 'dark'
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

    regMap.setStyle(styleUrl);
    regMap.once('style.load', () => {
      addFireLayers(regMap);
      if (regMap.getSource('fires')) {
        regMap.getSource('fires').setData({
          type: 'FeatureCollection',
          features: regionalVisibleHotspots.map(h => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [h.lon, h.lat] },
            properties: { date: h.date, frp: h.frp, sensor: h.sensor, lat: h.lat, lon: h.lon }
          }))
        });
      }
    });
  }, [theme]);

  // Update regional map GeoJSON source whenever regionalVisibleHotspots changes
  useEffect(() => {
    const regMap = regionalMapInstance.current;
    if (!regMap || !regMap.getSource('fires')) return;

    regMap.getSource('fires').setData({
      type: 'FeatureCollection',
      features: regionalVisibleHotspots.map(h => ({
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
  }, [regionalVisibleHotspots]);

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
      attributionControl: false,
      preserveDrawingBuffer: true,
      fadeDuration: 0
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
    setSelectedYear('2025');
    setSelectedMonth('ALL');
    setSelectedStateCode('ALL');
    setRegStartIdx(84); // Jan 2025
    setRegEndIdx(95);   // Dec 2025
    const target = globalData?.[code];
    if (target) {
      if (mapInstance.current) {
        mapInstance.current.flyTo({
          center: target.center,
          zoom: target.zoom,
          duration: 900
        });
      }
      if (regionalMapInstance.current) {
        regionalMapInstance.current.flyTo({
          center: target.center,
          zoom: target.zoom,
          duration: 900
        });
      }
    }
  };

  // Handle State / Province selection (strictly navigates the second regional map)
  const handleStateSelect = (stateCode) => {
    setSelectedStateCode(stateCode);
    if (stateCode === 'ALL') {
      const target = globalData?.[selectedCountryCode];
      if (target && regionalMapInstance.current) {
        regionalMapInstance.current.flyTo({
          center: target.center,
          zoom: target.zoom,
          duration: 800
        });
      }
    } else {
      const stateObj = availableStates.find(s => s.code === stateCode || s.name === stateCode);
      if (stateObj && regionalMapInstance.current) {
        const [minLon, minLat, maxLon, maxLat] = stateObj.bbox;
        regionalMapInstance.current.fitBounds(
          [[minLon, minLat], [maxLon, maxLat]],
          { padding: 40, duration: 900 }
        );
      }
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

  // Export CSV (isRegional=true exports regional dataset)
  const handleExportCSV = (isRegional = false) => {
    const targetHotspots = isRegional ? regionalVisibleHotspots : visibleHotspots;
    if (!targetHotspots.length) return;
    const header = ['Date', 'Year', 'Month', 'Latitude', 'Longitude', 'Fire_Radiative_Power_MW', 'Sensor'];
    const rows = targetHotspots.map(h => [h.date, h.yr, h.mo, h.lat, h.lon, h.frp, h.sensor]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const regionName = isRegional && currentStateObj ? currentStateObj.name.replace(/\s+/g, '_') : selectedCountryCode;
    a.download = `nasa_fireline_${regionName}_${selectedYear}_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  // Generate self-contained vector SVG scatter map of hotspots for guaranteed rendering
  const generateVectorMapSVG = (hotspots, centerCoords, width = 400, height = 215, subtitle = '') => {
    const list = Array.isArray(hotspots) ? hotspots : [];
    const baseHotspots = list.length > 0 ? list : (countryData.hotspots || []);
    
    let minLat, maxLat, minLon, maxLon;
    if (baseHotspots.length > 0) {
      const lats = baseHotspots.map(h => Number(h.lat)).filter(n => !isNaN(n));
      const lons = baseHotspots.map(h => Number(h.lon)).filter(n => !isNaN(n));
      minLat = Math.min(...lats);
      maxLat = Math.max(...lats);
      minLon = Math.min(...lons);
      maxLon = Math.max(...lons);
    } else {
      const cLon = (centerCoords && centerCoords[0]) || 78.96;
      const cLat = (centerCoords && centerCoords[1]) || 20.59;
      minLat = cLat - 2.5;
      maxLat = cLat + 2.5;
      minLon = cLon - 3.5;
      maxLon = cLon + 3.5;
    }

    if (maxLat - minLat < 1.0) { minLat -= 0.8; maxLat += 0.8; }
    if (maxLon - minLon < 1.0) { minLon -= 1.0; maxLon += 1.0; }

    const pad = 20;
    const plotW = width - pad * 2;
    const plotH = height - pad * 2;

    const circles = baseHotspots.slice(0, 450).map(h => {
      const x = pad + ((h.lon - minLon) / (maxLon - minLon)) * plotW;
      const y = pad + ((maxLat - h.lat) / (maxLat - minLat)) * plotH;
      const r = h.frp > 100 ? 5.5 : h.frp >= 25 ? 3.8 : 2.5;
      const fill = h.frp > 100 ? '#ef4444' : h.frp >= 50 ? '#f97316' : h.frp >= 25 ? '#f59e0b' : '#fde047';
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${fill}" opacity="0.88" />`;
    }).join('');

    const subText = subtitle ? `<text x="${width - 12}" y="${height - 8}" fill="#94a3b8" font-size="8.5" font-family="sans-serif" text-anchor="end">${subtitle}</text>` : '';

    const uid = Math.random().toString(36).substring(2, 8);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="width:100%;height:100%;min-height:215px;background:#0f172a;display:block;">
      <defs>
        <pattern id="grid_${uid}" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#1e293b" stroke-width="0.8"/>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="#0f172a" />
      <rect width="${width}" height="${height}" fill="url(#grid_${uid})" />
      <text x="12" y="16" fill="#94a3b8" font-size="8.5" font-family="monospace">BOUNDS: ${maxLat.toFixed(1)}N, ${minLon.toFixed(1)}E TO ${minLat.toFixed(1)}N, ${maxLon.toFixed(1)}E</text>
      <text x="${width - 12}" y="16" fill="#f59e0b" font-size="9" font-weight="bold" font-family="sans-serif" text-anchor="end">SATELLITE THERMAL RADAR</text>
      ${circles}
      <text x="12" y="${height - 8}" fill="#cbd5e1" font-size="8.5" font-family="sans-serif">${baseHotspots.length} SATELLITE DETECTIONS</text>
      ${subText}
    </svg>`;
  };

  // Export Printable PDF Incident Briefing Report
  // isRegionalReport=true includes Section 1 (National Summary) + Section 2 (Regional Subdivision & Date Range Intelligence)
  const handleExportPDF = (isRegionalReport = false) => {
    // Open window immediately on user gesture to avoid browser popup blockers
    let printWin = null;
    try {
      printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write('<!DOCTYPE html><html><head><title>Preparing Fireline Report...</title></head><body style="font-family:sans-serif;padding:30px;color:#1e293b;background:#f8fafc;"><h2>Preparing Fireline Report...</h2><p>Rendering satellite captures and intelligence summaries. Please wait...</p></body></html>');
      }
    } catch {
      printWin = null;
    }

    const buildReport = (capturedMapUrl, capturedRegMapUrl) => {
      const regionNameDisplay = isRegionalReport && currentStateObj
        ? `${currentStateObj.name}, ${countryData.name}`
        : countryData.name;
      const yearLabel = selectedYear === 'ALL' ? 'All Recorded Years (2018–2025)' : `Year ${selectedYear}`;
      const monthLabel = selectedMonth === 'ALL' ? 'All Months' : MONTH_NAMES[Number(selectedMonth) - 1];
      const regTimeframeLabel = regActiveTimelineLabel;
      const dateRangeSub = currentStateObj
        ? `Subdivision: ${currentStateObj.name} · ${regTimeframeLabel}`
        : `National · ${regTimeframeLabel}`;

      const totalCountryFires = (selectedYear === 'ALL'
        ? (countryData.total_fires || 0)
        : (countryData.annual_totals?.[selectedYear] || 0)
      ).toLocaleString();

      // Night share calculation
      const dayFires = countryData.daynight?.day || 1;
      const nightFires = countryData.daynight?.night || 0;
      const totalDayNight = dayFires + nightFires;
      const nightSharePct = ((nightFires / totalDayNight) * 100).toFixed(1);

      // Monthly table rows with clean, human-readable labels
      const topMonthsList = topPeakMonths.slice(0, 5).map((m, idx) =>
        `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#1e293b;">
            <span style="display:inline-block;width:18px;height:18px;background:#e0f2fe;color:#0369a1;border-radius:50%;text-align:center;line-height:18px;font-size:9px;margin-right:6px;">${idx + 1}</span>
            ${m.name}
          </td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;font-weight:700;color:#0f172a;">${m.count.toLocaleString()}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#64748b;font-size:9.5px;">${totalCountryFires !== '0' ? ((m.count / (selectedYear === 'ALL' ? countryData.total_fires : countryData.annual_totals?.[selectedYear])) * 100).toFixed(1) : 0}%</td>
        </tr>`
      ).join('');

      // Annual comparison rows with clean visual progress bars and forced background print colors
      const availableYears = countryData.years || ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'];
      const maxYrCount = Math.max(1, ...availableYears.map(yr => countryData.annual_totals?.[String(yr)] || 0));

      const annualRows = availableYears.map(yr => {
        const cnt = countryData.annual_totals?.[String(yr)] || 0;
        const isSel = selectedYear === String(yr);
        const barW = Math.max(6, Math.round((cnt / maxYrCount) * 100));
        return `<tr style="${isSel ? 'background:#fef3c7;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-weight:700;' : ''}">
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-weight:600;">${yr} ${isSel ? '<span style="color:#b45309;font-size:9px;">[Selected]</span>' : ''}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;">${cnt.toLocaleString()}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;width:90px;">
            <div style="background:#e2e8f0;height:8px;border-radius:3px;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact;border:1px solid #cbd5e1;">
              <div style="background:${isSel ? '#d97706' : '#2a574d'};height:100%;width:${barW}%;-webkit-print-color-adjust:exact;print-color-adjust:exact;border-right:2px solid ${isSel ? '#92400e' : '#14312b'};"></div>
            </div>
          </td>
        </tr>`;
      }).join('');

      // High Heat Hotspots Sample Table (Top 5 largest fires)
      const severeHotspots = (countryData.hotspots || [])
        .filter(h => (selectedYear === 'ALL' || String(h.yr) === selectedYear) && (selectedMonth === 'ALL' || Number(h.mo) === Number(selectedMonth)))
        .slice(0, 5)
        .map(h =>
          `<tr>
            <td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;font-family:monospace;font-size:9.5px;">${h.date}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;font-family:monospace;font-size:9.5px;">${h.lat.toFixed(2)}°N, ${h.lon.toFixed(2)}°E</td>
            <td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#dc2626;font-family:monospace;">${h.frp} MW</td>
            <td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;text-align:center;"><span style="background:#f1f5f9;padding:2px 5px;border-radius:3px;font-size:9px;">${h.sensor}</span></td>
          </tr>`
        ).join('');

      // Regional Hotspots Sample Table (Top 6 hottest fires in selected state/date range)
      const regionalSevereHotspots = regionalVisibleHotspots
        .slice()
        .sort((a, b) => b.frp - a.frp)
        .slice(0, 6)
        .map(h =>
          `<tr>
            <td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;font-family:monospace;font-size:9.5px;">${h.date}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;font-family:monospace;font-size:9.5px;">${h.lat.toFixed(3)}°N, ${h.lon.toFixed(3)}°E</td>
            <td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:700;color:#dc2626;font-family:monospace;">${h.frp} MW</td>
            <td style="padding:5px 8px;border-bottom:1px solid #f1f5f9;text-align:center;"><span style="background:#f1f5f9;padding:2px 5px;border-radius:3px;font-size:9px;">${h.sensor}</span></td>
          </tr>`
        ).join('');

      // Sparkline sub-columns for Year Comparison card
      const sparklineColumnsHtml = analyticsInsights.sparklineData.map(s => {
        const hPct = Math.max(14, Math.round((s.count / analyticsInsights.maxSpark) * 100));
        const isHit = analyticsInsights.selectedYear === s.year;
        const formattedCount = s.count >= 1000000 
          ? `${(s.count / 1000000).toFixed(1)}M` 
          : s.count >= 1000 
            ? `${(s.count / 1000).toFixed(0)}k` 
            : s.count.toLocaleString();

        return `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;flex:1;background:${isHit ? '#fef3c7' : 'transparent'};padding:3px 1px;border-radius:3px;border-bottom:${isHit ? '2px solid #d97706' : 'none'};">
            <span style="font-family:monospace;font-size:7.5px;color:${isHit ? '#b45309' : '#64748b'};font-weight:${isHit ? '700' : '500'};">${formattedCount}</span>
            <div style="width:100%;max-width:14px;height:26px;background:#e2e8f0;border-radius:2px 2px 0 0;display:flex;align-items:flex-end;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
              <div style="width:100%;height:${hPct}%;background:${isHit ? '#d97706' : '#2a574d'};border-radius:2px 2px 0 0;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
            </div>
            <span style="font-family:monospace;font-size:8px;font-weight:${isHit ? '700' : '600'};color:${isHit ? '#0f172a' : '#64748b'};">${s.year}</span>
          </div>`;
      }).join('');

      // Regional Sparkline sub-columns for Year Comparison card
      const regionalSparklineColumnsHtml = (regionalAnalyticsInsights.sparklineData || []).map(s => {
        const hPct = Math.max(14, Math.round((s.count / Math.max(1, regionalAnalyticsInsights.maxSpark || 1)) * 100));
        const isHit = String(regionalAnalyticsInsights.latestYr) === String(s.year);
        const formattedCount = s.count >= 1000000 
          ? `${(s.count / 1000000).toFixed(1)}M` 
          : s.count >= 1000 
            ? `${(s.count / 1000).toFixed(0)}k` 
            : s.count.toLocaleString();

        return `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;flex:1;background:${isHit ? '#fef3c7' : 'transparent'};padding:3px 1px;border-radius:3px;border-bottom:${isHit ? '2px solid #d97706' : 'none'};">
            <span style="font-family:monospace;font-size:7.5px;color:${isHit ? '#b45309' : '#64748b'};font-weight:${isHit ? '700' : '500'};">${formattedCount}</span>
            <div style="width:100%;max-width:14px;height:26px;background:#e2e8f0;border-radius:2px 2px 0 0;display:flex;align-items:flex-end;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
              <div style="width:100%;height:${hPct}%;background:${isHit ? '#d97706' : '#2a574d'};border-radius:2px 2px 0 0;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
            </div>
            <span style="font-family:monospace;font-size:8px;font-weight:${isHit ? '700' : '600'};color:${isHit ? '#0f172a' : '#64748b'};">${s.year}</span>
          </div>`;
      }).join('');

      // Regional Section HTML Block (Appended for Regional Export)
      const regionalSectionHtml = isRegionalReport ? `
      <!-- PAGE BREAK & SECTION 2: REGIONAL & SUBDIVISION DEEP-DIVE -->
      <div style="page-break-before: always; margin-top: 24px; padding-top: 14px; border-top: 2px dashed #cbd5e1;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;background:#1e293b;color:#f8fafc;padding:9px 14px;border-radius:4px;">
          <div>
            <div style="font-size:8.5px;text-transform:uppercase;color:#94a3b8;font-weight:700;letter-spacing:0.06em;">SECTION 2 · REGIONAL & CUSTOM TIMEFRAME INTELLIGENCE</div>
            <div style="font-size:15px;font-weight:800;letter-spacing:-0.01em;">${regionNameDisplay} Deep-Dive Assessment</div>
          </div>
          <span style="background:#2a574d;color:#f5d9a8;font-size:9.5px;font-weight:700;padding:4px 8px;border-radius:3px;font-family:monospace;">
            ${regionalVisibleHotspots.length.toLocaleString()} HOTSPOTS FILTERED
          </span>
        </div>

        <div class="kpi-strip" style="margin-bottom:12px;">
          <div class="kpi-card blue">
            <div class="kpi-label">Target Subdivision</div>
            <div class="kpi-value" style="font-size:15px;">${currentStateObj ? currentStateObj.name : countryData.name}</div>
            <div class="kpi-sub">${currentStateObj ? `Subdivision of ${countryData.name}` : `National Level Area`}</div>
          </div>
          <div class="kpi-card gold">
            <div class="kpi-label">Active Hotspots in Region</div>
            <div class="kpi-value" style="color:#b45309;">${regionalVisibleHotspots.length.toLocaleString()}</div>
            <div class="kpi-sub">${regTimeframeLabel}</div>
          </div>
          <div class="kpi-card alert">
            <div class="kpi-label">High-Heat Wildfires (&gt;100 MW)</div>
            <div class="kpi-value" style="color:#dc2626;">${regionalVisibleHotspots.filter(h => h.frp > 100).length.toLocaleString()}</div>
            <div class="kpi-sub">${regionalVisibleHotspots.length > 0 ? ((regionalVisibleHotspots.filter(h => h.frp > 100).length / regionalVisibleHotspots.length) * 100).toFixed(1) : 0}% emergency share</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Observation Months</div>
            <div class="kpi-value" style="font-size:13px;">${regTimeframeLabel}</div>
            <div class="kpi-sub">MODIS (1km) & VIIRS (375m)</div>
          </div>
        </div>

        <div class="main-grid">
          <div>
            <div class="map-card">
              <div class="map-header">
                <span>REGIONAL SATELLITE MAP SNAPSHOT</span>
                <span>${currentStateObj ? currentStateObj.name : countryData.name}</span>
              </div>
              <div class="map-frame">
                ${capturedRegMapUrl && capturedRegMapUrl.startsWith('data:image') && capturedRegMapUrl.length > 500
                  ? `<img src="${capturedRegMapUrl}" alt="Regional Satellite Fire Map" style="width:100%;height:100%;object-fit:cover;display:block;" />`
                  : (capturedRegMapUrl && capturedRegMapUrl.startsWith('<svg')
                    ? capturedRegMapUrl
                    : generateVectorMapSVG(regionalVisibleHotspots, currentStateObj ? [currentStateObj.lon, currentStateObj.lat] : countryData.center, 400, 215, currentStateObj ? currentStateObj.name : countryData.name)
                  )
                }
              </div>
              <div class="map-footer">
                Synchronized regional satellite capture focused directly on ${currentStateObj ? currentStateObj.name : countryData.name}.
              </div>
            </div>
          </div>

          <div>
            <div class="data-card">
              <h3>Hottest Regional Wildfires</h3>
              <table>
                <thead>
                  <tr style="background:#f8fafc;color:#64748b;font-size:8.5px;text-align:left;">
                    <th style="padding:4px 8px;">DATE</th>
                    <th style="padding:4px 8px;">COORDINATES</th>
                    <th style="padding:4px 8px;text-align:right;">HEAT OUTPUT</th>
                    <th style="padding:4px 8px;text-align:center;">SENSOR</th>
                  </tr>
                </thead>
                <tbody>
                  ${regionalSevereHotspots || '<tr><td colspan="4" style="padding:8px;text-align:center;color:#94a3b8;">No hotspots matching active regional filter</td></tr>'}
                </tbody>
              </table>
            </div>

            <div class="action-briefing" style="margin-top:10px;">
              <h4>Regional Operational Guidance</h4>
              <p>
                In ${currentStateObj ? currentStateObj.name : countryData.name} during ${regTimeframeLabel}, ${regionalVisibleHotspots.length.toLocaleString()} fire hotspots were mapped, including ${regionalVisibleHotspots.filter(h => h.frp > 100).length.toLocaleString()} emergency blazes exceeding 100 MW. Local forestry crews should position rapid-containment equipment and fire patrol teams in high-density corridors.
              </p>
            </div>
          </div>
        </div>

        <!-- Regional In-Depth Intelligence Cards (BURNING PATTERN, YEAR COMPARISON, FIRE STRENGTH) -->
        <div class="threat-strip" style="grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; margin-bottom: 12px;">
          <!-- Card 1: REGIONAL BURNING PATTERN -->
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:3px solid #2a574d;border-radius:4px;padding:9px 10px;display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <span style="font-size:9px;text-transform:uppercase;color:#64748b;font-weight:700;letter-spacing:0.04em;">REGIONAL BURNING PATTERN</span>
                <span style="background:#f1f5f9;color:#2a574d;font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:3px;border:1px solid #cbd5e1;">
                  ${regionalAnalyticsInsights.concentrationPct}% in 3 Months
                </span>
              </div>
              <h4 style="margin:2px 0 4px;font-size:12px;font-weight:800;color:#0f172a;">Regional Peak Burning Window</h4>
              <div style="font-size:14px;font-weight:800;color:#2a574d;margin-bottom:2px;">${regionalAnalyticsInsights.top3Names || 'Peak Window'}</div>
              <div style="font-size:9px;color:#64748b;margin-bottom:6px;">
                Busiest burning months in ${regionalAnalyticsInsights.regionName}
              </div>
              <div style="background:#e2e8f0;height:6px;border-radius:3px;overflow:hidden;margin-bottom:6px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
                <div style="background:#2a574d;height:100%;width:${Math.min(100, regionalAnalyticsInsights.concentrationPct)}%;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
              </div>
            </div>
            <p style="margin:0;font-size:9px;color:#334155;line-height:1.4;">
              In ${regionalAnalyticsInsights.regionName} during ${regTimeframeLabel}, ${regionalAnalyticsInsights.concentrationPct}% of all fires (${regionalAnalyticsInsights.top3Count.toLocaleString()} fires) broke out during ${regionalAnalyticsInsights.top3Names}. Most burning activity within this area is compressed into this seasonal window.
            </p>
          </div>

          <!-- Card 2: REGIONAL YEAR COMPARISON -->
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:3px solid ${regionalAnalyticsInsights.isEscalating ? '#dc2626' : '#2a574d'};border-radius:4px;padding:9px 10px;display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <span style="font-size:9px;text-transform:uppercase;color:#64748b;font-weight:700;letter-spacing:0.04em;">REGIONAL YEAR COMPARISON</span>
                <span style="background:#f1f5f9;color:${regionalAnalyticsInsights.isEscalating ? '#dc2626' : '#2a574d'};font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:3px;border:1px solid #cbd5e1;">
                  ${regionalAnalyticsInsights.isEscalating ? `+${regionalAnalyticsInsights.yoyPercent}% Increase` : `${regionalAnalyticsInsights.yoyPercent}% Decrease`}
                </span>
              </div>
              <h4 style="margin:2px 0 4px;font-size:12px;font-weight:800;color:#0f172a;">
                ${regionalAnalyticsInsights.latestYr} Regional Volume vs Earlier
              </h4>
              <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:2px;font-family:monospace;">
                ${Number(regionalAnalyticsInsights.curVol).toLocaleString()}
                <span style="font-size:10px;font-weight:500;color:#64748b;margin-left:4px;font-family:sans-serif;">
                  ${regionalAnalyticsInsights.baselineLabel.replace('vs ', 'vs ')} (${Number(regionalAnalyticsInsights.baselineVol).toLocaleString()})
                </span>
              </div>
              <div style="font-size:9px;color:#64748b;margin-bottom:6px;">
                ${regionalAnalyticsInsights.isEscalating ? 'More fires detected in latest active year' : 'Fewer fires detected in latest active year'}
              </div>
              <!-- Micro 8-Year Sparkline -->
              <div style="display:flex;gap:3px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:3px;padding:4px 3px;margin-bottom:6px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
                ${regionalSparklineColumnsHtml}
              </div>
            </div>
            <p style="margin:0;font-size:9px;color:#334155;line-height:1.4;">
              In ${regionalAnalyticsInsights.regionName}, fire volume changed by ${regionalAnalyticsInsights.isEscalating ? `+${regionalAnalyticsInsights.yoyPercent}%` : `${regionalAnalyticsInsights.yoyPercent}%`} between ${regionalAnalyticsInsights.latestYr} and ${regionalAnalyticsInsights.baselineLabel.replace('vs ', '')}.
              ${regionalAnalyticsInsights.isEscalating
                ? ' Fire activity increased in this regional boundary, signaling the need for heightened patrol preparedness.'
                : ' Fire activity stayed lower or stable in this timeframe.'}
            </p>
          </div>

          <!-- Card 3: REGIONAL FIRE STRENGTH -->
          <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:3px solid #dc2626;border-radius:4px;padding:9px 10px;display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <span style="font-size:9px;text-transform:uppercase;color:#64748b;font-weight:700;letter-spacing:0.04em;">REGIONAL FIRE STRENGTH</span>
                <span style="background:#fef2f2;color:#dc2626;font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:3px;border:1px solid #fecaca;">
                  ${regionalAnalyticsInsights.severePct}% High Intensity
                </span>
              </div>
              <h4 style="margin:2px 0 4px;font-size:12px;font-weight:800;color:#0f172a;">Regional Emergency Wildfires</h4>
              <div style="font-size:14px;font-weight:800;color:#dc2626;margin-bottom:2px;font-family:monospace;">
                ${regionalAnalyticsInsights.severeCount.toLocaleString()}
                <span style="font-size:10px;font-weight:500;color:#64748b;margin-left:4px;font-family:sans-serif;">
                  large fires (>100 MW)
                </span>
              </div>
              <div style="font-size:9px;color:#64748b;margin-bottom:6px;">Fires strong enough to spread across tree tops</div>
              
              <!-- Stacked Energy Spectrum Bar -->
              <div style="margin-bottom:6px;">
                <div style="display:flex;height:7px;border-radius:3px;overflow:hidden;background:#e2e8f0;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
                  <div style="background:#fef08a;width:${Math.max(4, regionalAnalyticsInsights.lowPct)}%;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
                  <div style="background:#f59e0b;width:${Math.max(3, regionalAnalyticsInsights.modPct)}%;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
                  <div style="background:#dc2626;width:${Math.max(2, regionalAnalyticsInsights.severePct)}%;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:8px;color:#64748b;margin-top:3px;">
                  <span>Small & Crop: <b>${regionalAnalyticsInsights.lowPct}%</b></span>
                  <span>Medium Brush: <b>${regionalAnalyticsInsights.modPct}%</b></span>
                  <span style="color:#dc2626;">Large Wildfires: <b>${regionalAnalyticsInsights.severePct}%</b></span>
                </div>
              </div>
            </div>
            <p style="margin:0;font-size:9px;color:#334155;line-height:1.4;">
              In ${regionalAnalyticsInsights.regionName} during ${regTimeframeLabel}, ${regionalAnalyticsInsights.severeCount.toLocaleString()} fires (${regionalAnalyticsInsights.severePct}%) grew into dangerous high-heat wildfires exceeding 100 MW radiative power.
            </p>
          </div>
        </div>
      </div>` : '';

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Fireline ${isRegionalReport ? 'Regional & National' : 'Summary'} Report - ${regionNameDisplay}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; background: #ffffff; font-size: 10.5px; line-height: 1.35; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .print-controls { display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: #ffffff; padding: 8px 16px; border-radius: 6px; margin-bottom: 12px; }
    .print-btn { background: #2a574d; color: #ffffff; border: none; padding: 7px 16px; font-weight: 700; border-radius: 4px; cursor: pointer; font-size: 11px; }
    .print-btn:hover { background: #397063; }
    @media print {
      .print-controls { display: none !important; }
    }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2a574d; padding-bottom: 10px; margin-bottom: 12px; }
    .header-left { display: flex; align-items: center; gap: 10px; }
    .logo-badge { width: 34px; height: 34px; background: #2a574d; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #f5d9a8; font-weight: 800; font-size: 18px; }
    .header-left h1 { margin: 0; font-size: 17px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; }
    .header-left p { margin: 2px 0 0; color: #64748b; font-size: 10px; }
    .header-right { text-align: right; }
    .badge { display: inline-block; background: #2a574d; color: #fff; padding: 4px 8px; border-radius: 4px; font-weight: 700; font-size: 10px; font-family: monospace; letter-spacing: 0.04em; }
    .report-date { font-size: 9px; color: #64748b; margin-top: 3px; }
    
    .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
    .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-top: 3px solid #2a574d; border-radius: 4px; padding: 8px 10px; }
    .kpi-card.alert { border-top-color: #dc2626; }
    .kpi-card.gold { border-top-color: #d97706; }
    .kpi-card.blue { border-top-color: #0284c7; }
    .kpi-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 3px; letter-spacing: 0.03em; }
    .kpi-value { font-size: 18px; font-weight: 800; color: #0f172a; font-family: monospace; line-height: 1.1; }
    .kpi-sub { font-size: 9px; color: #475569; margin-top: 3px; font-weight: 500; }

    .main-grid { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 12px; margin-bottom: 12px; }
    
    .map-card { border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden; background: #ffffff; display: flex; flex-direction: column; }
    .map-header { padding: 6px 10px; background: #1e293b; color: #f1f5f9; font-weight: 700; font-size: 10px; display: flex; justify-content: space-between; }
    .map-frame { height: 215px; background: #0f172a; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
    .map-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .map-frame svg { width: 100%; height: 100%; display: block; }
    .map-footer { padding: 6px 10px; background: #f8fafc; color: #475569; font-size: 9px; border-top: 1px solid #e2e8f0; }
    
    .data-card { border: 1px solid #e2e8f0; border-radius: 4px; background: #ffffff; padding: 8px 10px; margin-bottom: 10px; }
    .data-card h3 { margin: 0 0 6px; font-size: 10.5px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
    
    .action-briefing { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #2a574d; border-radius: 4px; padding: 9px 12px; margin-bottom: 10px; }
    .action-briefing h4 { margin: 0 0 3px; font-size: 11px; font-weight: 800; color: #0f172a; }
    .action-briefing p { margin: 0; color: #334155; font-size: 9.5px; line-height: 1.45; }

    .threat-strip { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
    .threat-box { background: #fef2f2; border: 1px solid #fee2e2; border-left: 3px solid #dc2626; border-radius: 4px; padding: 7px 10px; }
    .threat-box h5 { margin: 0 0 2px; font-size: 10px; font-weight: 700; color: #991b1b; }
    .threat-box p { margin: 0; font-size: 9px; color: #7f1d1d; }

    .footer { border-top: 1px solid #e2e8f0; padding-top: 6px; display: flex; justify-content: space-between; color: #94a3b8; font-size: 8px; }
  </style>
</head>
<body>
  <div class="print-controls">
    <span style="font-size:11px;font-weight:600;">Print / Save as PDF Ready ${isRegionalReport ? '· Comprehensive Regional Briefing' : ''}</span>
    <button class="print-btn" onclick="window.print()">Print Report / Save PDF</button>
  </div>

  <div class="header">
    <div class="header-left">
      <div class="logo-badge">F</div>
      <div>
        <h1>FIRELINE · WILDFIRE SUMMARY REPORT</h1>
        <p>NASA Satellite Fire Observation • ${isRegionalReport ? 'Comprehensive National & Regional Wildfire Intelligence' : 'Country and Year Wildfire Intelligence'}</p>
      </div>
    </div>
    <div class="header-right">
      <span class="badge">OFFICIAL REPORT</span>
      <div class="report-date">Generated: ${new Date().toISOString().replace('T', ' ').substring(0, 16)} UTC</div>
    </div>
  </div>

  <div class="kpi-strip">
    <div class="kpi-card blue">
      <div class="kpi-label">Region / Country</div>
      <div class="kpi-value">${regionNameDisplay}</div>
      <div class="kpi-sub">${dateRangeSub}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Selected Timeframe</div>
      <div class="kpi-value" style="font-size:14px;">${yearLabel}</div>
      <div class="kpi-sub">Month: ${monthLabel}</div>
    </div>
    <div class="kpi-card gold">
      <div class="kpi-label">Total Fires Detected</div>
      <div class="kpi-value" style="color:#2a574d;">${totalCountryFires}</div>
      <div class="kpi-sub">${filteredFireCount.toLocaleString()} fires in current filter</div>
    </div>
    <div class="kpi-card alert">
      <div class="kpi-label">Emergency Wildfires (>100 MW)</div>
      <div class="kpi-value" style="color:#dc2626;">${severeFireMetrics.count.toLocaleString()}</div>
      <div class="kpi-sub">${severeFireMetrics.pct}% of all fires</div>
    </div>
  </div>

  <div class="main-grid">
    <div>
      <div class="map-card">
        <div class="map-header">
          <span>ACTIVE FIRE MAP SNAPSHOT</span>
          <span>${visibleHotspots.length.toLocaleString()} HOTSPOTS SHOWN</span>
        </div>
        <div class="map-frame">
          ${capturedMapUrl && capturedMapUrl.startsWith('data:image') && capturedMapUrl.length > 500
            ? `<img src="${capturedMapUrl}" alt="Satellite Fire Map" style="width:100%;height:100%;object-fit:cover;display:block;" />`
            : (capturedMapUrl && capturedMapUrl.startsWith('<svg')
              ? capturedMapUrl
              : generateVectorMapSVG(visibleHotspots, countryData.center, 400, 215, countryData.name)
            )
          }
        </div>
        <div class="map-footer">
          Actual live satellite capture showing verified heat signatures across ${countryData.name}.
        </div>
      </div>

      <div class="data-card" style="margin-top:10px;">
        <h3>Hottest Wildfires (Highest Heat Output)</h3>
        <table>
          <thead>
            <tr style="background:#f8fafc;color:#64748b;font-size:8.5px;text-align:left;">
              <th style="padding:4px 8px;">DATE</th>
              <th style="padding:4px 8px;">COORDINATES</th>
              <th style="padding:4px 8px;text-align:right;">HEAT OUTPUT</th>
              <th style="padding:4px 8px;text-align:center;">SENSOR</th>
            </tr>
          </thead>
          <tbody>
            ${severeHotspots || '<tr><td colspan="4" style="padding:8px;text-align:center;color:#94a3b8;">No high-intensity hotspots matching active filter</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div>
      <div class="data-card">
        <h3>Peak Burning Months</h3>
        <table>
          <thead>
            <tr style="background:#f8fafc;color:#64748b;font-size:8.5px;">
              <th style="padding:4px 8px;text-align:left;">MONTH</th>
              <th style="padding:4px 8px;text-align:right;">FIRES</th>
              <th style="padding:4px 8px;text-align:right;">SHARE</th>
            </tr>
          </thead>
          <tbody>
            ${topMonthsList}
          </tbody>
        </table>
      </div>

      <div class="data-card">
        <h3>Year-by-Year Fire Comparison (2018–2025)</h3>
        <table>
          <thead>
            <tr style="background:#f8fafc;color:#64748b;font-size:8.5px;">
              <th style="padding:4px 8px;text-align:left;">YEAR</th>
              <th style="padding:4px 8px;text-align:right;">FIRES</th>
              <th style="padding:4px 8px;text-align:center;">TREND</th>
            </tr>
          </thead>
          <tbody>
            ${annualRows}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div class="threat-strip" style="grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px;">
    <!-- Card 1: BURNING PATTERN -->
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:3px solid #2a574d;border-radius:4px;padding:9px 10px;display:flex;flex-direction:column;justify-content:space-between;">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:9px;text-transform:uppercase;color:#64748b;font-weight:700;letter-spacing:0.04em;">BURNING PATTERN</span>
          <span style="background:#f1f5f9;color:#2a574d;font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:3px;border:1px solid #cbd5e1;">
            ${analyticsInsights.concentrationPct}% in 3 Months
          </span>
        </div>
        <h4 style="margin:2px 0 4px;font-size:12px;font-weight:800;color:#0f172a;">Peak Fire Months</h4>
        <div style="font-size:14px;font-weight:800;color:#2a574d;margin-bottom:2px;">${analyticsInsights.top3Names || 'Peak Window'}</div>
        <div style="font-size:9px;color:#64748b;margin-bottom:6px;">
          ${analyticsInsights.isAllYears ? 'Busiest burning months across all years' : `Busiest burning months in ${analyticsInsights.selectedYear}`}
        </div>
        <div style="background:#e2e8f0;height:6px;border-radius:3px;overflow:hidden;margin-bottom:6px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          <div style="background:#2a574d;height:100%;width:${Math.min(100, analyticsInsights.concentrationPct)}%;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
        </div>
      </div>
      <p style="margin:0;font-size:9px;color:#334155;line-height:1.4;">
        In ${countryData.name}${analyticsInsights.isAllYears ? '' : ` in ${analyticsInsights.selectedYear}`}, ${analyticsInsights.concentrationPct}% of all fires (${analyticsInsights.top3Count.toLocaleString()} fires) broke out during ${analyticsInsights.top3Names}.
        This shows most fires happen during this short window, helping response teams plan ahead before peak season begins.
      </p>
    </div>

    <!-- Card 2: YEAR COMPARISON -->
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:3px solid ${analyticsInsights.isEscalating ? '#dc2626' : '#2a574d'};border-radius:4px;padding:9px 10px;display:flex;flex-direction:column;justify-content:space-between;">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:9px;text-transform:uppercase;color:#64748b;font-weight:700;letter-spacing:0.04em;">YEAR COMPARISON</span>
          <span style="background:#f1f5f9;color:${analyticsInsights.isEscalating ? '#dc2626' : '#2a574d'};font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:3px;border:1px solid #cbd5e1;">
            ${analyticsInsights.isEscalating ? `+${analyticsInsights.yoyPercent}% Increase` : `${analyticsInsights.yoyPercent}% Decrease`}
          </span>
        </div>
        <h4 style="margin:2px 0 4px;font-size:12px;font-weight:800;color:#0f172a;">
          ${analyticsInsights.isAllYears ? '2024 to 2025 Fire Change' : `${analyticsInsights.selectedYear} Fire Volume vs Earlier`}
        </h4>
        <div style="font-size:14px;font-weight:800;color:#0f172a;margin-bottom:2px;font-family:monospace;">
          ${Number(analyticsInsights.curVol).toLocaleString()}
          <span style="font-size:10px;font-weight:500;color:#64748b;margin-left:4px;font-family:sans-serif;">
            ${analyticsInsights.baselineLabel.replace('vs ', 'vs ')} (${Number(analyticsInsights.baselineVol).toLocaleString()})
          </span>
        </div>
        <div style="font-size:9px;color:#64748b;margin-bottom:6px;">
          ${analyticsInsights.isEscalating ? 'More fires detected this year' : 'Fewer fires detected this year'}
        </div>
        <!-- Micro 8-Year Sparkline -->
        <div style="display:flex;gap:3px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:3px;padding:4px 3px;margin-bottom:6px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          ${sparklineColumnsHtml}
        </div>
      </div>
      <p style="margin:0;font-size:9px;color:#334155;line-height:1.4;">
        In ${analyticsInsights.isAllYears ? '2025' : analyticsInsights.selectedYear}, fire activity changed by ${analyticsInsights.isEscalating ? `+${analyticsInsights.yoyPercent}%` : `${analyticsInsights.yoyPercent}%`} compared to ${analyticsInsights.baselineLabel.replace('vs ', '')}.
        ${analyticsInsights.isEscalating
          ? ' This means fire activity grew higher this year, so extra field monitoring is recommended.'
          : ' This means fire activity stayed lower this year, helped by good weather and fire management.'}
      </p>
    </div>

    <!-- Card 3: FIRE STRENGTH -->
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:3px solid #dc2626;border-radius:4px;padding:9px 10px;display:flex;flex-direction:column;justify-content:space-between;">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:9px;text-transform:uppercase;color:#64748b;font-weight:700;letter-spacing:0.04em;">FIRE STRENGTH</span>
          <span style="background:#fef2f2;color:#dc2626;font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:3px;border:1px solid #fecaca;">
            ${analyticsInsights.severePct}% High Intensity
          </span>
        </div>
        <h4 style="margin:2px 0 4px;font-size:12px;font-weight:800;color:#0f172a;">Large Emergency Wildfires</h4>
        <div style="font-size:14px;font-weight:800;color:#dc2626;margin-bottom:2px;font-family:monospace;">
          ${analyticsInsights.severeCount.toLocaleString()}
          <span style="font-size:10px;font-weight:500;color:#64748b;margin-left:4px;font-family:sans-serif;">
            large fires (${analyticsInsights.isAllYears ? '2018-25' : analyticsInsights.selectedYear})
          </span>
        </div>
        <div style="font-size:9px;color:#64748b;margin-bottom:6px;">Fires strong enough to spread across tree tops</div>
        
        <!-- Stacked Energy Spectrum Bar -->
        <div style="margin-bottom:6px;">
          <div style="display:flex;height:7px;border-radius:3px;overflow:hidden;background:#e2e8f0;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
            <div style="background:#fef08a;width:${Math.max(4, analyticsInsights.lowPct)}%;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
            <div style="background:#f59e0b;width:${Math.max(3, analyticsInsights.modPct)}%;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
            <div style="background:#dc2626;width:${Math.max(2, analyticsInsights.severePct)}%;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:8px;color:#64748b;margin-top:3px;">
            <span>Small & Crop: <b>${analyticsInsights.lowPct}%</b></span>
            <span>Medium Brush: <b>${analyticsInsights.modPct}%</b></span>
            <span style="color:#dc2626;">Large Wildfires: <b>${analyticsInsights.severePct}%</b></span>
          </div>
        </div>
      </div>
      <p style="margin:0;font-size:9px;color:#334155;line-height:1.4;">
        In ${countryData.name}${analyticsInsights.isAllYears ? ' between 2018 and 2025' : ` in ${analyticsInsights.selectedYear}`}, ${analyticsInsights.severeCount.toLocaleString()} fires (${analyticsInsights.severePct}%) grew into dangerous high-heat wildfires.
        Most other fires were routine small agricultural burns or grass clearing that died down quickly.
      </p>
    </div>
  </div>

  ${regionalSectionHtml}

  <div class="footer">
    <span>Data Courtesy: NASA FIRMS (VIIRS & MODIS) • Fireline Earth Observation Systems</span>
    <span>Photo Attribution: CONAE • Open Access Research Distribution</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

      try {
        if (printWin && !printWin.closed) {
          printWin.document.open();
          printWin.document.write(html);
          printWin.document.close();
        } else {
          throw new Error('Window not available');
        }
      } catch {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 3000);
      }
    };

    // Capture main map snapshot
    const captureMainMap = (callback) => {
      const fallbackSvg = generateVectorMapSVG(visibleHotspots, countryData.center, 400, 215, countryData.name);
      if (!mapInstance.current) {
        callback(fallbackSvg);
        return;
      }
      const map = mapInstance.current;
      let executed = false;
      const deliverMain = () => {
        if (executed) return;
        executed = true;
        try {
          const imgUrl = map.getCanvas().toDataURL('image/png');
          if (imgUrl && imgUrl.startsWith('data:image') && imgUrl.length > 500) {
            callback(imgUrl);
          } else {
            callback(fallbackSvg);
          }
        } catch {
          callback(fallbackSvg);
        }
      };

      try {
        map.once('render', deliverMain);
        map.triggerRepaint();
        setTimeout(deliverMain, 100);
      } catch {
        deliverMain();
      }
    };

    // Capture regional map snapshot - using identical render-synchronized capture engine as main map
    const captureRegMap = (callback) => {
      if (!isRegionalReport) {
        callback('');
        return;
      }

      const regSubtitle = currentStateObj ? currentStateObj.name : countryData.name;
      const regCenter = currentStateObj ? [currentStateObj.lon, currentStateObj.lat] : countryData.center;
      const fallbackSvg = generateVectorMapSVG(regionalVisibleHotspots, regCenter, 400, 215, regSubtitle);

      // Check if regional map instance is available, fallback to mapInstance if not separate
      const regMap = regionalMapInstance.current || mapInstance.current;
      if (!regMap) {
        callback(fallbackSvg);
        return;
      }

      let executed = false;
      const deliverReg = () => {
        if (executed) return;
        executed = true;
        try {
          const regCanvas = regMap.getCanvas();
          const imgUrl = regCanvas ? regCanvas.toDataURL('image/png') : '';
          if (imgUrl && imgUrl.startsWith('data:image') && imgUrl.length > 500) {
            callback(imgUrl);
          } else {
            callback(fallbackSvg);
          }
        } catch {
          callback(fallbackSvg);
        }
      };

      try {
        regMap.once('render', deliverReg);
        regMap.triggerRepaint();
        setTimeout(deliverReg, 100);
      } catch {
        deliverReg();
      }
    };

    captureMainMap((mainImg) => {
      captureRegMap((regImg) => {
        buildReport(mainImg, regImg);
      });
    });
  };

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

        {/* Regional & Custom Date Range Analytics Hub */}
        <section className="regional-analytics-hub">
          <div className="regional-hub-header">
            <div className="regional-hub-title-group">
              <h2>Regional & Custom Date Range Analytics</h2>
              <p>
                Filter fire activity across specific states, provinces, or custom day/month date spans with dedicated regional mapping.
              </p>
            </div>
            <div className="regional-actions-group">
              <button
                className="export-btn"
                onClick={() => handleExportCSV(true)}
                title="Download CSV of current regional fire detections"
              >
                Download Region CSV ({regionalVisibleHotspots.length.toLocaleString()})
              </button>
              <button
                className="export-btn pdf-btn"
                onClick={() => handleExportPDF(true)}
                title="Download Combined Comprehensive Briefing Report (National Summary + Regional Assessment)"
              >
                Export Region PDF Report
              </button>
            </div>
          </div>

          <div className="regional-filter-strip" ref={timePickerRef}>
            {/* Country Selector */}
            <div className="filter-control-item">
              <label htmlFor="reg-country">Country:</label>
              <select
                id="reg-country"
                value={selectedCountryCode}
                onChange={e => handleCountrySelect(e.target.value)}
              >
                {allCountryList.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* State / Province Selector */}
            <div className="filter-control-item" style={{ minWidth: '220px' }}>
              <label htmlFor="reg-state">State / Province / Region:</label>
              <select
                id="reg-state"
                value={selectedStateCode}
                onChange={e => handleStateSelect(e.target.value)}
              >
                <option value="ALL">All States / Whole Country</option>
                {availableStates.map(s => (
                  <option key={s.code || s.name} value={s.code || s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* From Timeframe Dropdown (Year & Month Scrollable) */}
            <div className="filter-control-item timeframe-dropdown-container">
              <label>From (Start Month & Year):</label>
              <button
                type="button"
                className={`timeframe-dropdown-trigger ${openTimePicker === 'start' ? 'is-active' : ''}`}
                onClick={() => setOpenTimePicker(prev => prev === 'start' ? null : 'start')}
                title="Select start timeframe"
              >
                <span>{regStartInfo.label}</span>
                <span className="dropdown-arrow">▼</span>
              </button>

              {openTimePicker === 'start' && (
                <div className="timeframe-picker-popover">
                  <div className="timeframe-picker-columns">
                    {/* Year Scrollable Column */}
                    <div className="timeframe-picker-col">
                      <div className="timeframe-picker-col-title">Year</div>
                      <div className="timeframe-picker-scroll-list">
                        {[2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map(yr => (
                          <button
                            type="button"
                            key={yr}
                            className={`timeframe-picker-option ${regStartInfo.yr === yr ? 'is-selected' : ''}`}
                            onClick={() => {
                              const newIdx = (yr - 2018) * 12 + (regStartInfo.mo - 1);
                              setRegStartIdx(newIdx);
                              if (newIdx > regEndIdx) setRegEndIdx(newIdx);
                            }}
                          >
                            {yr}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Month Scrollable Column */}
                    <div className="timeframe-picker-col">
                      <div className="timeframe-picker-col-title">Month</div>
                      <div className="timeframe-picker-scroll-list">
                        {MONTH_NAMES.map((mName, mIdx) => (
                          <button
                            type="button"
                            key={mName}
                            className={`timeframe-picker-option ${regStartInfo.mo === mIdx + 1 ? 'is-selected' : ''}`}
                            onClick={() => {
                              const newIdx = (regStartInfo.yr - 2018) * 12 + mIdx;
                              setRegStartIdx(newIdx);
                              if (newIdx > regEndIdx) setRegEndIdx(newIdx);
                            }}
                          >
                            {mName}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* To Timeframe Dropdown (Year & Month Scrollable) */}
            <div className="filter-control-item timeframe-dropdown-container">
              <label>To (End Month & Year):</label>
              <button
                type="button"
                className={`timeframe-dropdown-trigger ${openTimePicker === 'end' ? 'is-active' : ''}`}
                onClick={() => setOpenTimePicker(prev => prev === 'end' ? null : 'end')}
                title="Select end timeframe"
              >
                <span>{regEndInfo.label}</span>
                <span className="dropdown-arrow">▼</span>
              </button>

              {openTimePicker === 'end' && (
                <div className="timeframe-picker-popover">
                  <div className="timeframe-picker-columns">
                    {/* Year Scrollable Column */}
                    <div className="timeframe-picker-col">
                      <div className="timeframe-picker-col-title">Year</div>
                      <div className="timeframe-picker-scroll-list">
                        {[2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map(yr => (
                          <button
                            type="button"
                            key={yr}
                            className={`timeframe-picker-option ${regEndInfo.yr === yr ? 'is-selected' : ''}`}
                            onClick={() => {
                              const newIdx = (yr - 2018) * 12 + (regEndInfo.mo - 1);
                              setRegEndIdx(newIdx);
                              if (newIdx < regStartIdx) setRegStartIdx(newIdx);
                            }}
                          >
                            {yr}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Month Scrollable Column */}
                    <div className="timeframe-picker-col">
                      <div className="timeframe-picker-col-title">Month</div>
                      <div className="timeframe-picker-scroll-list">
                        {MONTH_NAMES.map((mName, mIdx) => (
                          <button
                            type="button"
                            key={mName}
                            className={`timeframe-picker-option ${regEndInfo.mo === mIdx + 1 ? 'is-selected' : ''}`}
                            onClick={() => {
                              const newIdx = (regEndInfo.yr - 2018) * 12 + mIdx;
                              setRegEndIdx(newIdx);
                              if (newIdx < regStartIdx) setRegStartIdx(newIdx);
                            }}
                          >
                            {mName}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Reset Filter */}
            {(selectedStateCode !== 'ALL' || regStartIdx !== 84 || regEndIdx !== 95) && (
              <div className="filter-control-item" style={{ alignSelf: 'flex-end', marginLeft: 'auto' }}>
                <button
                  type="button"
                  style={{
                    padding: '7px 12px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    color: '#ef4444',
                    background: 'transparent',
                    border: '1px solid #ef4444',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    handleStateSelect('ALL');
                    setRegStartIdx(84);
                    setRegEndIdx(95);
                  }}
                >
                  Reset Region & Range
                </button>
              </div>
            )}
          </div>

          {/* Regional KPI Summary Strip */}
          <div className="regional-kpi-summary-strip">
            <div className="reg-kpi-box">
              <div className="reg-kpi-header">
                <span>TARGET REGION</span>
                <span>SUBDIVISION</span>
              </div>
              <div className="reg-kpi-val" style={{ fontSize: '20px' }}>
                {currentStateObj ? currentStateObj.name : countryData.name}
              </div>
              <div className="reg-kpi-sub-badge">
                {currentStateObj ? `Subdivision of ${countryData.name}` : `National Level (${countryData.code || selectedCountryCode})`}
              </div>
              <div className="reg-kpi-desc">
                {currentStateObj ? `Boundary: ${currentStateObj.bbox?.[1]}°N to ${currentStateObj.bbox?.[3]}°N` : 'Whole country active area'}
              </div>
            </div>

            <div className="reg-kpi-box">
              <div className="reg-kpi-header">
                <span>REGION HOTSPOTS</span>
                <span>FILTERED</span>
              </div>
              <div className="reg-kpi-val">{regionalVisibleHotspots.length.toLocaleString()}</div>
              <div className="reg-kpi-sub-badge">
                {regActiveTimelineLabel}
              </div>
              <div className="reg-kpi-desc">
                NASA verified thermal detections in this region
              </div>
            </div>

            <div className="reg-kpi-box danger">
              <div className="reg-kpi-header">
                <span>HIGH-HEAT WILDFIRES</span>
                <span>&gt; 100 MW</span>
              </div>
              <div className="reg-kpi-val" style={{ color: 'var(--fire-flame)' }}>
                {regionalVisibleHotspots.filter(h => h.frp > 100).length.toLocaleString()}
              </div>
              <div className="reg-kpi-sub-badge danger">
                {regionalVisibleHotspots.length > 0
                  ? `${((regionalVisibleHotspots.filter(h => h.frp > 100).length / regionalVisibleHotspots.length) * 100).toFixed(1)}% emergency share`
                  : '0% emergency share'}
              </div>
              <div className="reg-kpi-desc">
                High-intensity blazes requiring immediate containment
              </div>
            </div>

            <div className="reg-kpi-box">
              <div className="reg-kpi-header">
                <span>TIMEFRAME SCOPE</span>
                <span>MULTI-YEAR SPAN</span>
              </div>
              <div className="reg-kpi-val" style={{ fontSize: '18px' }}>
                {regStartInfo.label.split(' ')[1] === regEndInfo.label.split(' ')[1]
                  ? regStartInfo.label.split(' ')[1]
                  : `${regStartInfo.label.split(' ')[1]} – ${regEndInfo.label.split(' ')[1]}`}
              </div>
              <div className="reg-kpi-sub-badge">
                {regActiveTimelineLabel}
              </div>
              <div className="reg-kpi-desc">
                NASA VIIRS (375m) and MODIS (1km) satellites
              </div>
            </div>
          </div>

          {/* Dedicated Regional Map Container */}
          <div className="regional-map-container-box">
            <div className="regional-map-overlay-badge">
              <span>{currentStateObj ? `${currentStateObj.name}, ${countryData.name}` : `${countryData.name} Regional Map`}</span>
              <span style={{ opacity: 0.65, marginLeft: '8px' }}>• {regionalVisibleHotspots.length.toLocaleString()} fires</span>
            </div>
            <div ref={regionalMapContainer} style={{ width: '100%', height: '100%' }} />
          </div>

          <div className="regional-bottom-info">
            <div>
              Click any fire hotspot on the regional map to view precise coordinates, radiative heat output (MW), and compare side by side.
            </div>
            <div>
              State boundaries synchronized with verified Natural Earth territorial polygons.
            </div>
          </div>

          {/* Regional & Custom Timeframe In-Depth Intelligence Cards */}
          <div className="insights-grid" style={{ marginTop: '20px' }}>
            {/* Regional Card 1: Seasonal Burning Concentration */}
            <div className="insight-card">
              <div className="insight-header">
                <span className="insight-tag amber">REGIONAL BURNING PATTERN</span>
                <span className="insight-metric-pill">
                  {regionalAnalyticsInsights.concentrationPct}% in 3 Months
                </span>
              </div>
              <h4>Regional Peak Burning Window</h4>
              <div className="insight-stat-row">
                <div className="insight-stat-val">{regionalAnalyticsInsights.top3Names}</div>
                <div className="insight-stat-desc">
                  Busiest burning months in {regionalAnalyticsInsights.regionName}
                </div>
              </div>
              <div className="insight-bar-track">
                <div
                  className="insight-bar-fill"
                  style={{
                    width: `${Math.min(100, regionalAnalyticsInsights.concentrationPct)}%`,
                    background: 'var(--accent-gold)'
                  }}
                />
              </div>
              <p>
                In {regionalAnalyticsInsights.regionName} during {regActiveTimelineLabel}, {regionalAnalyticsInsights.concentrationPct}% of all fires ({regionalAnalyticsInsights.top3Count.toLocaleString()} fires) broke out during {regionalAnalyticsInsights.top3Names}.
                Most burning activity within this area is compressed into this seasonal window.
              </p>
            </div>

            {/* Regional Card 2: Year Comparison & Sparkline */}
            <div className="insight-card">
              <div className="insight-header">
                <span className="insight-tag teal">REGIONAL YEAR COMPARISON</span>
                <span
                  className="insight-metric-pill"
                  style={{
                    color: regionalAnalyticsInsights.isEscalating ? '#ff4d4f' : 'var(--primary-green)',
                    borderColor: regionalAnalyticsInsights.isEscalating ? 'rgba(255, 77, 79, 0.35)' : 'rgba(42, 87, 77, 0.35)'
                  }}
                >
                  {regionalAnalyticsInsights.isEscalating ? `+${regionalAnalyticsInsights.yoyPercent}% Increase` : `${regionalAnalyticsInsights.yoyPercent}% Decrease`}
                </span>
              </div>
              <h4>
                {regionalAnalyticsInsights.latestYr} Regional Volume vs Earlier
              </h4>
              <div className="insight-stat-row">
                <div className="insight-stat-val">
                  {Number(regionalAnalyticsInsights.curVol).toLocaleString()}
                  <span style={{ fontSize: '14px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '6px' }}>
                    {regionalAnalyticsInsights.baselineLabel} ({Number(regionalAnalyticsInsights.baselineVol).toLocaleString()})
                  </span>
                </div>
                <div className="insight-stat-desc">
                  {regionalAnalyticsInsights.isEscalating ? 'More fires detected in latest active year' : 'Fewer fires detected in latest active year'}
                </div>
              </div>

              {/* Multi-Year Sparkline Mini Trend */}
              <div className="sparkline-trend-container">
                {regionalAnalyticsInsights.sparklineData.map(s => {
                  const hPct = Math.max(14, Math.round((s.count / (regionalAnalyticsInsights.maxSpark || 1)) * 100));
                  const formattedCount = s.count >= 1000000 
                    ? `${(s.count / 1000000).toFixed(1)}M` 
                    : s.count >= 1000 
                      ? `${(s.count / 1000).toFixed(0)}k` 
                      : s.count.toLocaleString();

                  return (
                    <div
                      key={s.year}
                      className="spark-bar-col"
                      title={`${s.year}: ${s.count.toLocaleString()} regional fires`}
                    >
                      <span className="spark-bar-val">{formattedCount}</span>
                      <div className="spark-bar-track">
                        <div className="spark-bar-fill" style={{ height: `${hPct}%`, background: 'var(--accent-gold)' }} />
                      </div>
                      <span className="spark-bar-lbl">{s.year}</span>
                    </div>
                  );
                })}
              </div>

              <p>
                In {regionalAnalyticsInsights.regionName}, fire volume changed by {regionalAnalyticsInsights.isEscalating ? `+${regionalAnalyticsInsights.yoyPercent}%` : `${regionalAnalyticsInsights.yoyPercent}%`} between {regionalAnalyticsInsights.latestYr} and {regionalAnalyticsInsights.baselineLabel.replace('vs ', '')}.
                {regionalAnalyticsInsights.isEscalating
                  ? ' Fire activity increased in this regional boundary, signaling the need for heightened patrol preparedness.'
                  : ' Fire incidence remained moderate across the selected timeframe.'}
              </p>
            </div>

            {/* Regional Card 3: Fire Strength & Intensity Breakdown */}
            <div className="insight-card">
              <div className="insight-header">
                <span className="insight-tag red">REGIONAL FIRE STRENGTH</span>
                <span className="insight-metric-pill" style={{ color: 'var(--fire-flame)' }}>
                  {regionalAnalyticsInsights.severePct}% High Intensity
                </span>
              </div>
              <h4>Regional Emergency Wildfires</h4>
              <div className="insight-stat-row">
                <div className="insight-stat-val" style={{ color: 'var(--fire-flame)' }}>
                  {regionalAnalyticsInsights.severeCount.toLocaleString()}
                  <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '6px' }}>
                    large fires (&gt;100 MW)
                  </span>
                </div>
                <div className="insight-stat-desc">Fires strong enough to spread across tree tops</div>
              </div>

              {/* Stacked Energy Spectrum Bar */}
              <div className="energy-spectrum-bar-wrap">
                <div className="energy-spectrum-bar">
                  <div
                    className="energy-seg low"
                    style={{ width: `${Math.max(4, regionalAnalyticsInsights.lowPct)}%` }}
                    title={`Small fires & field burning: ${regionalAnalyticsInsights.lowCount.toLocaleString()} (${regionalAnalyticsInsights.lowPct}%)`}
                  />
                  <div
                    className="energy-seg mod"
                    style={{ width: `${Math.max(3, regionalAnalyticsInsights.modPct)}%` }}
                    title={`Moderate brush fires: ${regionalAnalyticsInsights.modCount.toLocaleString()} (${regionalAnalyticsInsights.modPct}%)`}
                  />
                  <div
                    className="energy-seg high"
                    style={{ width: `${Math.max(2, regionalAnalyticsInsights.severePct)}%` }}
                    title={`Dangerous large wildfires: ${regionalAnalyticsInsights.severeCount.toLocaleString()} (${regionalAnalyticsInsights.severePct}%)`}
                  />
                </div>
                <div className="energy-legend">
                  <span>Small & Crop: <b>{regionalAnalyticsInsights.lowPct}%</b></span>
                  <span>Medium Brush: <b>{regionalAnalyticsInsights.modPct}%</b></span>
                  <span style={{ color: 'var(--fire-flame)' }}>Large Wildfires: <b>{regionalAnalyticsInsights.severePct}%</b></span>
                </div>
              </div>

              <p>
                In {regionalAnalyticsInsights.regionName} during {regActiveTimelineLabel}, {regionalAnalyticsInsights.severeCount.toLocaleString()} fires ({regionalAnalyticsInsights.severePct}%) grew into dangerous high-heat wildfires exceeding 100 MW radiative power.
              </p>
            </div>
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
