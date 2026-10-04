/**
 * Taiwan Weather Forecast - Frontend Application Logic
 * Queries Vercel Serverless API (/api/forecast, /api/summary, /api/regions)
 * Visualizes with Chart.js & Leaflet.js
 * Includes automatic offline snapshot fallback if running without backend.
 */

// Complete coordinates and metadata for Taiwan's 22 counties and 6 major regions
const LOCATION_COORDINATES = {
  // 全台 22 縣市 (County & City Level)
  "基隆市": { coords: [25.1276, 121.7392], type: "county", parentRegion: "北部地區", shortName: "基隆" },
  "臺北市": { coords: [25.0375, 121.5637], type: "county", parentRegion: "北部地區", shortName: "臺北" },
  "新北市": { coords: [24.9924, 121.4657], type: "county", parentRegion: "北部地區", shortName: "新北" },
  "桃園市": { coords: [24.9936, 121.3010], type: "county", parentRegion: "北部地區", shortName: "桃園" },
  "新竹市": { coords: [24.8138, 120.9675], type: "county", parentRegion: "北部地區", shortName: "新竹" },
  "新竹縣": { coords: [24.7887, 121.0877], type: "county", parentRegion: "北部地區", shortName: "竹縣" },
  "苗栗縣": { coords: [24.5602, 120.8214], type: "county", parentRegion: "北部地區", shortName: "苗栗" },
  "臺中市": { coords: [24.1477, 120.6736], type: "county", parentRegion: "中部地區", shortName: "臺中" },
  "彰化縣": { coords: [24.0518, 120.5161], type: "county", parentRegion: "中部地區", shortName: "彰化" },
  "南投縣": { coords: [23.9009, 120.9719], type: "county", parentRegion: "中部地區", shortName: "南投" },
  "雲林縣": { coords: [23.7092, 120.4313], type: "county", parentRegion: "中部地區", shortName: "雲林" },
  "嘉義市": { coords: [23.4800, 120.4491], type: "county", parentRegion: "中部地區", shortName: "嘉市" },
  "嘉義縣": { coords: [23.4518, 120.2559], type: "county", parentRegion: "中部地區", shortName: "嘉縣" },
  "臺南市": { coords: [22.9997, 120.2270], type: "county", parentRegion: "南部地區", shortName: "臺南" },
  "高雄市": { coords: [22.6273, 120.3014], type: "county", parentRegion: "南部地區", shortName: "高雄" },
  "屏東縣": { coords: [22.4562, 120.5879], type: "county", parentRegion: "南部地區", shortName: "屏東" },
  "宜蘭縣": { coords: [24.7070, 121.7530], type: "county", parentRegion: "東北部地區", shortName: "宜蘭" },
  "花蓮縣": { coords: [23.8872, 121.5516], type: "county", parentRegion: "東部地區", shortName: "花蓮" },
  "臺東縣": { coords: [22.7583, 121.1444], type: "county", parentRegion: "東南部地區", shortName: "臺東" },
  "澎湖縣": { coords: [23.5712, 119.5793], type: "county", parentRegion: "外島地區", shortName: "澎湖" },
  "金門縣": { coords: [24.4493, 118.3766], type: "county", parentRegion: "外島地區", shortName: "金門" },
  "連江縣": { coords: [26.1557, 119.9519], type: "county", parentRegion: "外島地區", shortName: "馬祖" },

  // 六大分區 (Regional Level - 嚴格對應使用者附圖點位)
  "北部地區": { coords: [25.04, 121.52], type: "region", parentRegion: "六大分區", shortName: "北部" },
  "東北部地區": { coords: [24.65, 121.78], type: "region", parentRegion: "六大分區", shortName: "東北部" },
  "中部地區": { coords: [24.15, 120.62], type: "region", parentRegion: "六大分區", shortName: "中部" },
  "東部地區": { coords: [23.85, 121.55], type: "region", parentRegion: "六大分區", shortName: "東部" },
  "南部地區": { coords: [22.85, 120.28], type: "region", parentRegion: "六大分區", shortName: "南部" },
  "東南部地區": { coords: [22.75, 121.12], type: "region", parentRegion: "六大分區", shortName: "東南部" }
};

// 兼容舊版 REGION_COORDINATES 參照
const REGION_COORDINATES = Object.fromEntries(
  Object.entries(LOCATION_COORDINATES).map(([k, v]) => [k, v.coords])
);

// Fallback Summary Data for all 28 locations (22 縣市 + 6 區域)
const FALLBACK_SUMMARY = [
  {"regionName": "基隆市", "avgTemp": 26.2, "minTemp": 22.8, "maxTemp": 29.2, "avgPoP": 56},
  {"regionName": "臺北市", "avgTemp": 27.5, "minTemp": 23.7, "maxTemp": 31.0, "avgPoP": 37},
  {"regionName": "新北市", "avgTemp": 27.1, "minTemp": 23.5, "maxTemp": 30.4, "avgPoP": 40},
  {"regionName": "桃園市", "avgTemp": 26.9, "minTemp": 23.4, "maxTemp": 30.1, "avgPoP": 33},
  {"regionName": "新竹市", "avgTemp": 26.5, "minTemp": 23.0, "maxTemp": 29.7, "avgPoP": 25},
  {"regionName": "新竹縣", "avgTemp": 26.6, "minTemp": 22.9, "maxTemp": 30.0, "avgPoP": 26},
  {"regionName": "苗栗縣", "avgTemp": 26.6, "minTemp": 22.6, "maxTemp": 30.3, "avgPoP": 23},
  {"regionName": "臺中市", "avgTemp": 28.5, "minTemp": 24.7, "maxTemp": 32.3, "avgPoP": 22},
  {"regionName": "彰化縣", "avgTemp": 28.1, "minTemp": 24.6, "maxTemp": 31.6, "avgPoP": 18},
  {"regionName": "南投縣", "avgTemp": 27.7, "minTemp": 22.9, "maxTemp": 32.5, "avgPoP": 36},
  {"regionName": "雲林縣", "avgTemp": 28.2, "minTemp": 24.3, "maxTemp": 32.0, "avgPoP": 17},
  {"regionName": "嘉義市", "avgTemp": 28.6, "minTemp": 24.7, "maxTemp": 32.4, "avgPoP": 21},
  {"regionName": "嘉義縣", "avgTemp": 28.0, "minTemp": 24.1, "maxTemp": 31.9, "avgPoP": 21},
  {"regionName": "臺南市", "avgTemp": 28.9, "minTemp": 26.3, "maxTemp": 31.6, "avgPoP": 24},
  {"regionName": "高雄市", "avgTemp": 29.2, "minTemp": 26.8, "maxTemp": 31.8, "avgPoP": 30},
  {"regionName": "屏東縣", "avgTemp": 29.7, "minTemp": 27.1, "maxTemp": 32.4, "avgPoP": 35},
  {"regionName": "宜蘭縣", "avgTemp": 26.2, "minTemp": 23.0, "maxTemp": 30.0, "avgPoP": 59},
  {"regionName": "花蓮縣", "avgTemp": 27.1, "minTemp": 24.0, "maxTemp": 30.5, "avgPoP": 44},
  {"regionName": "臺東縣", "avgTemp": 27.3, "minTemp": 25.0, "maxTemp": 30.5, "avgPoP": 38},
  {"regionName": "澎湖縣", "avgTemp": 28.2, "minTemp": 25.9, "maxTemp": 30.7, "avgPoP": 15},
  {"regionName": "金門縣", "avgTemp": 26.5, "minTemp": 22.7, "maxTemp": 30.2, "avgPoP": 18},
  {"regionName": "連江縣", "avgTemp": 23.1, "minTemp": 19.8, "maxTemp": 26.1, "avgPoP": 23},
  {"regionName": "北部地區", "avgTemp": 26.8, "minTemp": 23.3, "maxTemp": 29.9, "avgPoP": 39},
  {"regionName": "中部地區", "avgTemp": 28.1, "minTemp": 24.5, "maxTemp": 31.7, "avgPoP": 22},
  {"regionName": "南部地區", "avgTemp": 28.8, "minTemp": 26.5, "maxTemp": 31.2, "avgPoP": 30},
  {"regionName": "東北部地區", "avgTemp": 26.2, "minTemp": 23.0, "maxTemp": 30.0, "avgPoP": 59},
  {"regionName": "東部地區", "avgTemp": 27.1, "minTemp": 24.0, "maxTemp": 30.5, "avgPoP": 44},
  {"regionName": "東南部地區", "avgTemp": 27.3, "minTemp": 25.0, "maxTemp": 30.5, "avgPoP": 38}
];

// Fallback Forecasts Snapshot (Primary 6 regions baseline)
const FALLBACK_FORECASTS = [
  {"Date": "2026-10-04", "Region": "北部地區", "MinT": 23.3, "MaxT": 29.3, "PoP": 30},
  {"Date": "2026-10-04", "Region": "中部地區", "MinT": 25.5, "MaxT": 30.9, "PoP": 20},
  {"Date": "2026-10-04", "Region": "南部地區", "MinT": 26.5, "MaxT": 30.8, "PoP": 25},
  {"Date": "2026-10-04", "Region": "東北部地區", "MinT": 23.0, "MaxT": 28.5, "PoP": 50},
  {"Date": "2026-10-04", "Region": "東部地區", "MinT": 24.0, "MaxT": 29.0, "PoP": 40},
  {"Date": "2026-10-04", "Region": "東南部地區", "MinT": 25.0, "MaxT": 29.5, "PoP": 35}
];

// Offline county temperature offset mapping relative to parent regions
const COUNTY_OFFSETS = {
  "基隆市": { base: "北部地區", dMin: -0.5, dMax: -0.7, dPoP: 20 },
  "臺北市": { base: "北部地區", dMin: 0.4, dMax: 1.1, dPoP: 0 },
  "新北市": { base: "北部地區", dMin: 0.2, dMax: 0.5, dPoP: 5 },
  "桃園市": { base: "北部地區", dMin: 0.1, dMax: 0.2, dPoP: -5 },
  "新竹市": { base: "北部地區", dMin: -0.3, dMax: -0.2, dPoP: -10 },
  "新竹縣": { base: "北部地區", dMin: -0.4, dMax: 0.1, dPoP: -10 },
  "苗栗縣": { base: "北部地區", dMin: -0.7, dMax: 0.4, dPoP: -10 },
  "臺中市": { base: "中部地區", dMin: 0.2, dMax: 0.6, dPoP: 0 },
  "彰化縣": { base: "中部地區", dMin: 0.1, dMax: -0.1, dPoP: -5 },
  "南投縣": { base: "中部地區", dMin: -1.6, dMax: 0.8, dPoP: 15 },
  "雲林縣": { base: "中部地區", dMin: -0.2, dMax: 0.3, dPoP: -5 },
  "嘉義市": { base: "中部地區", dMin: 0.2, dMax: 0.7, dPoP: 0 },
  "嘉義縣": { base: "中部地區", dMin: -0.4, dMax: 0.2, dPoP: 0 },
  "臺南市": { base: "南部地區", dMin: -0.2, dMax: 0.4, dPoP: -5 },
  "高雄市": { base: "南部地區", dMin: 0.3, dMax: 0.6, dPoP: 0 },
  "屏東縣": { base: "南部地區", dMin: 0.6, dMax: 1.2, dPoP: 5 },
  "宜蘭縣": { base: "東北部地區", dMin: 0.0, dMax: 0.0, dPoP: 0 },
  "花蓮縣": { base: "東部地區", dMin: 0.0, dMax: 0.0, dPoP: 0 },
  "臺東縣": { base: "東南部地區", dMin: 0.0, dMax: 0.0, dPoP: 0 },
  "澎湖縣": { base: "南部地區", dMin: -0.6, dMax: -0.5, dPoP: -15 },
  "金門縣": { base: "中部地區", dMin: -1.8, dMax: -1.5, dPoP: -5 },
  "連江縣": { base: "北部地區", dMin: -3.5, dMax: -3.8, dPoP: -10 }
};

// Global App State
let currentRegion = "中部地區";
let currentMapMode = "regions"; // "regions" (附圖同款六大區域) 或 "counties" (全省 22 縣市)
let currentSummaryList = [];
let weatherChart = null;
let leafletMap = null;
let mapMarkers = {};
let isBackendConnected = false;

// Temperature color classification (Strictly matching HW1 rules)
function getTempColor(temp) {
  if (temp < 20) return "#2b83ba";       // < 20°C (藍色)
  if (temp < 25) return "#2ecc71";       // 20 - 25°C (綠色)
  if (temp <= 30) return "#f39c12";      // 25 - 30°C (黃色)
  return "#e74c3c";                      // > 30°C (紅色)
}

function getTempCategory(temp) {
  if (temp < 20) return { label: "低溫區 (<20°C)", color: "#2b83ba", bg: "rgba(43, 131, 186, 0.12)" };
  if (temp < 25) return { label: "舒適區 (20-25°C)", color: "#2ecc71", bg: "rgba(46, 204, 113, 0.12)" };
  if (temp <= 30) return { label: "溫暖區 (25-30°C)", color: "#f39c12", bg: "rgba(243, 156, 18, 0.12)" };
  return { label: "炎熱區 (>30°C)", color: "#e74c3c", bg: "rgba(231, 76, 60, 0.12)" };
}

// Dynamic rolling date helpers: always starts from today as day 1 (未來一週)
function getRollingDates(count = 7) {
  const dates = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

function alignForecastDatesWithToday(forecastList) {
  if (!forecastList || forecastList.length === 0) return [];
  const weekDates = getRollingDates(forecastList.length);
  return forecastList.map((item, idx) => ({
    ...item,
    Date: weekDates[idx] || item.Date
  }));
}

function getWeekday(dateStr) {
  try {
    const parts = dateStr.split("-");
    let d;
    if (parts.length === 3) {
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      d = new Date(dateStr);
    }
    const weekdays = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
    return weekdays[d.getDay()] || "";
  } catch {
    return "";
  }
}

function formatDisplayDate(dateStr) {
  if (dateStr && dateStr.length >= 10) {
    return dateStr.substring(5).replace("-", "/");
  }
  return dateStr;
}

// ==========================================================================
// API Handlers (with Graceful Fallback)
// ==========================================================================
async function fetchApi(endpoint) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return null;
  }
}

// 1. Health & DB Status
async function checkHealth() {
  const healthData = await fetchApi("/api/health");
  const statusEl = document.getElementById("api-status-text");
  const dbInfoEl = document.getElementById("db-record-info");
  const dotEl = statusEl ? statusEl.parentElement.querySelector(".pulse-dot") : null;

  if (healthData && healthData.status === "healthy") {
    isBackendConnected = true;
    if (statusEl) statusEl.textContent = "Vercel / Local API 已連線";
    if (dotEl) dotEl.style.backgroundColor = "#22c55e";
    if (dbInfoEl) dbInfoEl.textContent = `SQLite data.db · 全台 22 縣市 · 196 筆記錄 · 即時 SQL 查詢`;
  } else {
    isBackendConnected = false;
    if (statusEl) statusEl.textContent = "已載入本機資料庫快照";
    if (dotEl) dotEl.style.backgroundColor = "#38bdf8";
    if (dbInfoEl) dbInfoEl.textContent = `提示：執行 python3 dev_server.py 啟用即時後端`;
  }
}

// 2. Fetch and render forecast for selected region
async function loadRegionForecast(region) {
  currentRegion = region;
  const nameEl = document.getElementById("current-region-name");
  if (nameEl) nameEl.textContent = region;

  // Update pills and select box
  const selectEl = document.getElementById("region-select");
  if (selectEl && selectEl.value !== region) {
    selectEl.value = region;
  }

  document.querySelectorAll(".region-pill").forEach(pill => {
    if (pill.dataset.region === region) {
      pill.classList.add("active");
    } else {
      pill.classList.remove("active");
    }
  });

  const chartLoader = document.getElementById("chart-loader");
  if (chartLoader) chartLoader.classList.remove("hidden");

  let list = [];
  if (isBackendConnected) {
    const res = await fetchApi(`/api/forecast?region=${encodeURIComponent(region)}`);
    if (res && res.data && res.data.length > 0) {
      list = res.data;
    }
  }

  // Fallback to embedded snapshot or fallback_data.json if backend not reachable
  if (!list || list.length === 0) {
    try {
      const fallbackRes = await fetch("fallback_data.json");
      if (fallbackRes.ok) {
        const fallbackJson = await fallbackRes.json();
        list = (fallbackJson.forecasts || [])
          .filter(item => item.Region === region)
          .map(item => ({ Date: item.Date, MinT: item.MinT, MaxT: item.MaxT }));
      }
    } catch (e) {}
  }

  if (!list || list.length === 0) {
    list = FALLBACK_FORECASTS
      .filter(item => item.Region === region)
      .map(item => ({ Date: item.Date, MinT: item.MinT, MaxT: item.MaxT }));
  }

  // 若為縣市且未在預載陣列中，依分區基準即時計算氣溫與降雨預報
  if (!list || list.length === 0) {
    if (COUNTY_OFFSETS[region]) {
      const { base, dMin, dMax, dPoP } = COUNTY_OFFSETS[region];
      const baseList = FALLBACK_FORECASTS.filter(item => item.Region === base);
      list = baseList.map(item => ({
        Date: item.Date,
        MinT: Math.round((item.MinT + dMin) * 10) / 10,
        MaxT: Math.round((item.MaxT + dMax) * 10) / 10,
        PoP: Math.max(0, Math.min(100, (item.PoP || 20) + (dPoP || 0)))
      }));
    }
  }

  // 永遠以今天為第一天，向後預報未來一週 7 天
  list = alignForecastDatesWithToday(list);

  if (chartLoader) chartLoader.classList.add("hidden");

  if (!list || list.length === 0) return;

  // Update KPI Metrics
  const firstDay = list[0];
  const allMin = list.map(item => item.MinT);
  const allMax = list.map(item => item.MaxT);
  const allPoP = list.map(item => (item.PoP !== undefined ? item.PoP : 20));

  const avgMin = allMin.reduce((a, b) => a + b, 0) / allMin.length;
  const avgMax = allMax.reduce((a, b) => a + b, 0) / allMax.length;
  const weekAvg = ((avgMin + avgMax) / 2).toFixed(1);

  const maxTemp = Math.max(...allMax);
  const minTemp = Math.min(...allMin);
  const tempRange = (maxTemp - minTemp).toFixed(1);

  const todayPoP = firstDay.PoP !== undefined ? firstDay.PoP : 20;

  document.getElementById("val-today-mint").textContent = firstDay.MinT.toFixed(1);
  document.getElementById("val-today-maxt").textContent = firstDay.MaxT.toFixed(1);
  const popValEl = document.getElementById("val-today-pop");
  if (popValEl) popValEl.textContent = todayPoP;

  document.getElementById("val-week-avg").textContent = weekAvg;
  document.getElementById("val-temp-range").textContent = tempRange;

  const todayDateEl = document.getElementById("label-today-date");
  if (todayDateEl) todayDateEl.textContent = `首日 (今天)：${firstDay.Date} (${getWeekday(firstDay.Date)})`;

  const popDescEl = document.getElementById("label-today-pop-desc");
  if (popDescEl) {
    if (todayPoP <= 20) {
      popDescEl.textContent = "☀️ 晴朗乾燥 · 降雨機率低";
      popDescEl.style.color = "#0369a1";
    } else if (todayPoP <= 40) {
      popDescEl.textContent = "⛅ 局部多雲 · 降雨偏低";
      popDescEl.style.color = "#0284c7";
    } else if (todayPoP <= 60) {
      popDescEl.textContent = "🌦️ 局部短暫陣雨 · 備雨具";
      popDescEl.style.color = "#0284c7";
    } else {
      popDescEl.textContent = "🌧️ 降雨機率高 · 請攜帶雨具";
      popDescEl.style.color = "#1d4ed8";
    }
  }

  // Update Chart
  renderChart(list);

  // Update Table
  renderTable(list);

  // Highlight map marker & sync active classes
  document.querySelectorAll(".taiwan-map-pill-marker").forEach(el => {
    if (el.dataset.location === region) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });

  document.querySelectorAll(".summary-chip").forEach(chip => {
    if (chip.dataset.location === region) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });

  if (mapMarkers[region]) {
    mapMarkers[region].openPopup();
  }
}

// 3. Render Chart.js Double Axis Chart (Red MaxT / Blue MinT / Cyan Bar PoP)
function renderChart(forecastList) {
  const chartCanvas = document.getElementById("weatherChart");
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext("2d");
  const labels = forecastList.map(item => `${formatDisplayDate(item.Date)} (${getWeekday(item.Date)})`);
  const maxTemps = forecastList.map(item => item.MaxT);
  const minTemps = forecastList.map(item => item.MinT);
  const popVals = forecastList.map(item => (item.PoP !== undefined ? item.PoP : 20));

  if (weatherChart) {
    weatherChart.destroy();
  }

  // Gradients for line fill
  const maxGradient = ctx.createLinearGradient(0, 0, 0, 300);
  maxGradient.addColorStop(0, "rgba(231, 76, 60, 0.25)");
  maxGradient.addColorStop(1, "rgba(231, 76, 60, 0.0)");

  const minGradient = ctx.createLinearGradient(0, 0, 0, 300);
  minGradient.addColorStop(0, "rgba(52, 152, 219, 0.22)");
  minGradient.addColorStop(1, "rgba(52, 152, 219, 0.0)");

  weatherChart = new Chart(ctx, {
    data: {
      labels: labels,
      datasets: [
        {
          type: "line",
          label: "最高溫 (MaxT)",
          data: maxTemps,
          borderColor: "#e74c3c", // 作業規範：MaxT 紅色
          backgroundColor: maxGradient,
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointBackgroundColor: "#e74c3c",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          yAxisID: "y",
          order: 1
        },
        {
          type: "line",
          label: "最低溫 (MinT)",
          data: minTemps,
          borderColor: "#3498db", // 作業規範：MinT 藍色
          backgroundColor: minGradient,
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointBackgroundColor: "#3498db",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          yAxisID: "y",
          order: 2
        },
        {
          type: "bar",
          label: "降雨機率 (PoP)",
          data: popVals,
          backgroundColor: "rgba(14, 165, 233, 0.35)",
          borderColor: "rgba(14, 165, 233, 0.8)",
          borderWidth: 1.5,
          borderRadius: 6,
          barPercentage: 0.35,
          yAxisID: "y1",
          order: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: { family: "'Plus Jakarta Sans', 'Noto Sans TC', sans-serif", size: 12 }
          }
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.9)",
          titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13 },
          bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            label: function(context) {
              if (context.dataset.yAxisID === "y1") {
                return ` 🌧️ ${context.dataset.label}: ${context.parsed.y} %`;
              }
              return ` ${context.dataset.label}: ${context.parsed.y.toFixed(1)} °C`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: "rgba(226, 232, 240, 0.6)"
          },
          ticks: {
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
            color: "#64748b"
          }
        },
        y: {
          type: "linear",
          display: true,
          position: "left",
          title: {
            display: true,
            text: "氣溫 (°C)",
            color: "#64748b",
            font: { size: 11, weight: "bold" }
          },
          grid: {
            color: "rgba(226, 232, 240, 0.6)"
          },
          ticks: {
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
            color: "#64748b",
            stepSize: 2
          }
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          min: 0,
          max: 100,
          title: {
            display: true,
            text: "降雨機率 (%)",
            color: "#0284c7",
            font: { size: 11, weight: "bold" }
          },
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
            color: "#0284c7",
            stepSize: 25,
            callback: function(v) { return v + "%"; }
          }
        }
      }
    }
  });
}

// 4. Render 7-day forecast table
function renderTable(forecastList) {
  const tbody = document.getElementById("forecast-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  forecastList.forEach((item, index) => {
    const diff = (item.MaxT - item.MinT).toFixed(1);
    const avg = (item.MaxT + item.MinT) / 2;
    const cat = getTempCategory(avg);
    const isToday = (index === 0);
    const isTomorrow = (index === 1);
    const pop = (item.PoP !== undefined) ? item.PoP : 20;

    let popBadgeClass = "badge-pop-low";
    let popIcon = "☀️";
    if (pop > 60) {
      popBadgeClass = "badge-pop-high";
      popIcon = "🌧️";
    } else if (pop > 30) {
      popBadgeClass = "badge-pop-med";
      popIcon = "🌦️";
    }

    const tr = document.createElement("tr");
    if (isToday) tr.classList.add("row-today");

    tr.innerHTML = `
      <td>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <strong style="color: #1e293b;">${item.Date}</strong>
          <span style="font-size:0.8rem; color:#64748b;">(${getWeekday(item.Date)})</span>
          ${isToday ? '<span class="badge-day badge-today">今天 (第1天)</span>' : ''}
          ${isTomorrow ? '<span class="badge-day badge-tomorrow">明天</span>' : ''}
        </div>
      </td>
      <td>
        <span class="badge-temp badge-mint-val">🔵 ${item.MinT.toFixed(1)}°C</span>
      </td>
      <td>
        <span class="badge-temp badge-maxt-val">🔴 ${item.MaxT.toFixed(1)}°C</span>
      </td>
      <td>
        <div class="badge-pop-container">
          <span class="badge-pop ${popBadgeClass}">${popIcon} ${pop}%</span>
          <div class="pop-bar-track">
            <div class="pop-bar-fill" style="width: ${pop}%;"></div>
          </div>
        </div>
      </td>
      <td>
        <span class="delta-tag">Δ ${diff}°C</span>
      </td>
      <td>
        <span class="badge-temp" style="color: ${cat.color}; background: ${cat.bg};">
          ${cat.label}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 5. Initialize Leaflet Map
async function initTaiwanMap() {
  const mapLoader = document.getElementById("map-loader");
  if (mapLoader) {
    mapLoader.classList.remove("hidden");
    mapLoader.style.display = "flex";
  }

  try {
    if (typeof L !== "undefined") {
      // Center on Taiwan [23.7, 120.95] with fractional zoom capability
      leafletMap = L.map("taiwan-map", {
        center: [23.7, 120.95],
        zoom: 7.6,
        zoomSnap: 0.2,
        zoomDelta: 0.5,
        zoomControl: true,
        scrollWheelZoom: true
      });

      // OpenStreetMap tiles (100% free, zero watermark, no API key required)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        subdomains: ['a', 'b', 'c']
      }).addTo(leafletMap);

      setTimeout(() => {
        if (leafletMap) {
          leafletMap.invalidateSize();
          fitTaiwanBounds(false);
        }
      }, 300);
    }
  } catch (err) {
    console.error("Map initialization error:", err);
  }

  let summaryList = [];
  if (isBackendConnected) {
    const res = await fetchApi("/api/summary");
    if (res && res.summary) {
      summaryList = res.summary;
    }
  }

  // Fallback to embedded summary
  if (!summaryList || summaryList.length === 0) {
    summaryList = FALLBACK_SUMMARY;
  }

  // 確保區域概要首日日期對齊今天
  const todayStr = getRollingDates(1)[0];
  summaryList = summaryList.map(item => ({
    ...item,
    firstDate: todayStr
  }));

  currentSummaryList = summaryList;

  if (mapLoader) {
    mapLoader.classList.add("hidden");
    mapLoader.style.display = "none";
  }

  if (leafletMap) {
    renderMapMarkers(currentSummaryList);
    fitTaiwanBounds(false);
  }
  renderSummaryChips(currentSummaryList);
}

// Fit map view tightly to Taiwan bounds according to current mode
function fitTaiwanBounds(animate = false) {
  if (!leafletMap) return;
  const isCountyMode = (currentMapMode === "counties");
  const options = {
    padding: [25, 25],
    maxZoom: 8.5,
    animate: animate
  };

  if (isCountyMode) {
    // 包含澎湖、金門、連江等外島
    leafletMap.fitBounds([
      [21.8, 118.2],
      [26.3, 122.1]
    ], options);
  } else {
    // 六大分區：專注本島，完美對齊截圖
    leafletMap.fitBounds([
      [21.85, 120.0],
      [25.35, 122.1]
    ], options);
  }
}

function renderMapMarkers(summaryList) {
  // Clear any existing markers
  Object.values(mapMarkers).forEach(m => {
    try { leafletMap.removeLayer(m); } catch (e) {}
  });
  mapMarkers = {};

  const isCountyMode = (currentMapMode === "counties");

  // Filter based on currentMapMode: "counties" (22 縣市) or "regions" (六大分區)
  const filteredList = summaryList.filter(item => {
    const locInfo = LOCATION_COORDINATES[item.regionName];
    if (!locInfo) return false;
    return isCountyMode ? (locInfo.type === "county") : (locInfo.type === "region");
  });

  filteredList.forEach(item => {
    const locName = item.regionName;
    const locInfo = LOCATION_COORDINATES[locName];
    if (!locInfo) return;

    const avgTemp = item.avgTemp;
    const colorHex = getTempColor(avgTemp);
    const shortName = locInfo.shortName || locName.replace("地區", "").replace(/[市縣]/, "");
    const isActive = (locName === currentRegion);

    // Custom HTML DivIcon matching user's uploaded screenshot:
    // Floating white pill badge with colored temperature circle and text label + yellow location pin ring
    const markerHtml = `
      <div class="taiwan-map-pill-marker ${isActive ? 'active' : ''}" data-location="${locName}">
        <div class="marker-pin-ring"></div>
        <div class="marker-pill-badge">
          <span class="marker-pill-dot" style="background-color: ${colorHex};"></span>
          <span class="marker-pill-text">${shortName}</span>
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      className: "custom-leaflet-div-icon",
      html: markerHtml,
      iconSize: [85, 30],
      iconAnchor: [12, 15] // Aligns the center of colored dot and yellow ring directly on coordinates
    });

    const marker = L.marker(locInfo.coords, {
      icon: customIcon,
      zIndexOffset: isActive ? 1000 : 0
    }).addTo(leafletMap);

    const typeBadge = locInfo.type === "county" 
      ? `<span style="font-size:0.75rem; color:#64748b; font-weight:normal; margin-left:4px;">(${locInfo.parentRegion})</span>` 
      : `<span style="font-size:0.75rem; color:#64748b; font-weight:normal; margin-left:4px;">(分區)</span>`;

    const avgPoP = (item.avgPoP !== undefined) ? item.avgPoP : 25;
    const popupContent = `
      <div class="custom-map-popup">
        <h4 class="popup-title">${locName} ${typeBadge}</h4>
        <div class="popup-row">
          <span>一週均溫：</span>
          <b style="color: ${colorHex}; font-size:1.05rem;">${avgTemp}°C</b>
        </div>
        <div class="popup-row">
          <span>最低溫 MinT：</span>
          <span style="color: #3498db; font-weight:600;">${item.minTemp}°C</span>
        </div>
        <div class="popup-row">
          <span>最高溫 MaxT：</span>
          <span style="color: #e74c3c; font-weight:600;">${item.maxTemp}°C</span>
        </div>
        <div class="popup-row">
          <span>降雨機率 PoP：</span>
          <span style="color: #0284c7; font-weight:700;">💧 ${avgPoP}%</span>
        </div>
        <button class="popup-btn" onclick="selectRegion('${locName}')">查看此預報</button>
      </div>
    `;

    marker.bindPopup(popupContent, { maxWidth: 220, offset: [20, -10] });
    marker.bindTooltip(`<b>${locName}</b> · 均溫 ${avgTemp}°C · 💧${avgPoP}%`, { direction: "top", offset: [0, -16] });

    marker.on("click", () => {
      selectRegion(locName);
    });

    mapMarkers[locName] = marker;
  });

  if (mapMarkers[currentRegion]) {
    mapMarkers[currentRegion].openPopup();
  }
}

function renderSummaryChips(summaryList) {
  const container = document.getElementById("summary-chips");
  if (!container) return;
  container.innerHTML = "";

  const isCountyMode = (currentMapMode === "counties");

  const filteredList = summaryList.filter(item => {
    const locInfo = LOCATION_COORDINATES[item.regionName];
    if (!locInfo) return false;
    return isCountyMode ? (locInfo.type === "county") : (locInfo.type === "region");
  });

  filteredList.forEach(item => {
    const color = getTempColor(item.avgTemp);
    const avgPoP = (item.avgPoP !== undefined) ? item.avgPoP : 25;
    const chip = document.createElement("div");
    const isActive = (item.regionName === currentRegion);
    chip.className = `summary-chip ${isActive ? 'active' : ''}`;
    chip.dataset.location = item.regionName;
    chip.innerHTML = `
      <span class="chip-dot" style="background-color: ${color};"></span>
      <strong>${item.regionName}</strong>
      <span>${item.avgTemp}°C</span>
      <span style="font-size:0.75rem; color:#0284c7; margin-left:3px; font-weight:700;">💧${avgPoP}%</span>
    `;
    chip.addEventListener("click", () => {
      selectRegion(item.regionName);
    });
    container.appendChild(chip);
  });
}

// Map mode toggle (22 縣市 vs 六大分區)
window.setMapMode = function(mode) {
  currentMapMode = mode;
  const btnCounties = document.getElementById("toggle-counties-btn");
  const btnRegions = document.getElementById("toggle-regions-btn");
  const titleEl = document.getElementById("summary-list-title");

  if (btnCounties && btnRegions) {
    if (mode === "counties") {
      btnCounties.classList.add("active");
      btnRegions.classList.remove("active");
      if (titleEl) titleEl.textContent = "📊 全台 22 縣市均溫速覽：";
    } else {
      btnRegions.classList.add("active");
      btnCounties.classList.remove("active");
      if (titleEl) titleEl.textContent = "📊 六大區域均溫速覽：";
    }
  }

  if (currentSummaryList && currentSummaryList.length > 0) {
    renderMapMarkers(currentSummaryList);
    renderSummaryChips(currentSummaryList);
    fitTaiwanBounds(true);
  }
};

// Global selector action called from UI or map
window.selectRegion = function(regionName) {
  const locInfo = LOCATION_COORDINATES[regionName];
  if (locInfo) {
    if (locInfo.type === "region" && currentMapMode === "counties") {
      setMapMode("regions");
    } else if (locInfo.type === "county" && currentMapMode === "regions") {
      setMapMode("counties");
    }
  }
  loadRegionForecast(regionName);
};

// ==========================================================================
// Initialization & Event Listeners
// ==========================================================================
document.addEventListener("DOMContentLoaded", async () => {
  // Check health and connect to Vercel Serverless / Local Dev API
  await checkHealth();

  // Region dropdown change
  const regionSelect = document.getElementById("region-select");
  if (regionSelect) {
    regionSelect.addEventListener("change", (e) => {
      selectRegion(e.target.value);
    });
  }

  // Refresh button
  const refreshBtn = document.getElementById("refresh-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.disabled = true;
      await checkHealth();
      await loadRegionForecast(currentRegion);
      setTimeout(() => { refreshBtn.disabled = false; }, 800);
    });
  }

  // Map reset view button
  const resetBtn = document.getElementById("map-reset-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      fitTaiwanBounds(true);
    });
  }

  // Init Map and first region forecast
  initTaiwanMap();
  loadRegionForecast(currentRegion);
});
