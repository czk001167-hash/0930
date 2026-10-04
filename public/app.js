/**
 * Taiwan Weather Forecast - Frontend Application Logic
 * Queries Vercel Serverless API (/api/forecast, /api/summary, /api/regions)
 * Visualizes with Chart.js & Leaflet.js
 * Includes automatic offline snapshot fallback if running without backend.
 */

// Regional coordinates matching assignment specification
const REGION_COORDINATES = {
  "北部地區": [25.04, 121.55],
  "中部地區": [24.15, 120.67],
  "南部地區": [22.62, 120.30],
  "東北部地區": [24.75, 121.75],
  "東部地區": [23.99, 121.60],
  "東南部地區": [22.75, 121.15]
};

// Embedded SQLite Snapshot Fallback (Ensures charts & map display even if opened directly via file://)
const FALLBACK_FORECASTS = [
  {"Date": "2026-09-23", "Region": "北部地區", "MinT": 23.3, "MaxT": 29.3},
  {"Date": "2026-09-23", "Region": "中部地區", "MinT": 25.5, "MaxT": 30.9},
  {"Date": "2026-09-23", "Region": "南部地區", "MinT": 26.5, "MaxT": 30.8},
  {"Date": "2026-09-23", "Region": "東北部地區", "MinT": 23.0, "MaxT": 28.5},
  {"Date": "2026-09-23", "Region": "東部地區", "MinT": 24.0, "MaxT": 29.0},
  {"Date": "2026-09-23", "Region": "東南部地區", "MinT": 25.0, "MaxT": 29.5},
  {"Date": "2026-09-24", "Region": "北部地區", "MinT": 23.7, "MaxT": 29.4},
  {"Date": "2026-09-24", "Region": "中部地區", "MinT": 25.3, "MaxT": 31.1},
  {"Date": "2026-09-24", "Region": "南部地區", "MinT": 26.5, "MaxT": 30.8},
  {"Date": "2026-09-24", "Region": "東北部地區", "MinT": 23.5, "MaxT": 28.8},
  {"Date": "2026-09-24", "Region": "東部地區", "MinT": 24.2, "MaxT": 29.1},
  {"Date": "2026-09-24", "Region": "東南部地區", "MinT": 25.2, "MaxT": 29.7},
  {"Date": "2026-09-25", "Region": "北部地區", "MinT": 24.1, "MaxT": 29.6},
  {"Date": "2026-09-25", "Region": "中部地區", "MinT": 25.0, "MaxT": 31.5},
  {"Date": "2026-09-25", "Region": "南部地區", "MinT": 26.7, "MaxT": 31.0},
  {"Date": "2026-09-25", "Region": "東北部地區", "MinT": 23.8, "MaxT": 29.2},
  {"Date": "2026-09-25", "Region": "東部地區", "MinT": 24.5, "MaxT": 29.5},
  {"Date": "2026-09-25", "Region": "東南部地區", "MinT": 25.5, "MaxT": 30.0},
  {"Date": "2026-09-26", "Region": "北部地區", "MinT": 24.3, "MaxT": 29.4},
  {"Date": "2026-09-26", "Region": "中部地區", "MinT": 24.8, "MaxT": 31.7},
  {"Date": "2026-09-26", "Region": "南部地區", "MinT": 26.8, "MaxT": 31.2},
  {"Date": "2026-09-26", "Region": "東北部地區", "MinT": 23.7, "MaxT": 29.0},
  {"Date": "2026-09-26", "Region": "東部地區", "MinT": 24.4, "MaxT": 29.4},
  {"Date": "2026-09-26", "Region": "東南部地區", "MinT": 25.4, "MaxT": 30.2},
  {"Date": "2026-09-27", "Region": "北部地區", "MinT": 23.9, "MaxT": 29.9},
  {"Date": "2026-09-27", "Region": "中部地區", "MinT": 24.7, "MaxT": 31.6},
  {"Date": "2026-09-27", "Region": "南部地區", "MinT": 26.6, "MaxT": 31.1},
  {"Date": "2026-09-27", "Region": "東北部地區", "MinT": 23.4, "MaxT": 29.5},
  {"Date": "2026-09-27", "Region": "東部地區", "MinT": 24.3, "MaxT": 29.8},
  {"Date": "2026-09-27", "Region": "東南部地區", "MinT": 25.3, "MaxT": 30.5},
  {"Date": "2026-09-28", "Region": "北部地區", "MinT": 24.3, "MaxT": 29.4},
  {"Date": "2026-09-28", "Region": "中部地區", "MinT": 24.6, "MaxT": 31.2},
  {"Date": "2026-09-28", "Region": "南部地區", "MinT": 26.5, "MaxT": 30.9},
  {"Date": "2026-09-28", "Region": "東北部地區", "MinT": 23.6, "MaxT": 29.1},
  {"Date": "2026-09-28", "Region": "東部地區", "MinT": 24.1, "MaxT": 29.3},
  {"Date": "2026-09-28", "Region": "東南部地區", "MinT": 25.1, "MaxT": 30.1},
  {"Date": "2026-09-29", "Region": "北部地區", "MinT": 24.9, "MaxT": 29.6},
  {"Date": "2026-09-29", "Region": "中部地區", "MinT": 24.5, "MaxT": 30.8},
  {"Date": "2026-09-29", "Region": "南部地區", "MinT": 26.4, "MaxT": 30.7},
  {"Date": "2026-09-29", "Region": "東北部地區", "MinT": 23.9, "MaxT": 29.4},
  {"Date": "2026-09-29", "Region": "東部地區", "MinT": 24.4, "MaxT": 29.6},
  {"Date": "2026-09-29", "Region": "東南部地區", "MinT": 25.2, "MaxT": 30.3}
];

const FALLBACK_SUMMARY = [
  {"regionName": "中部地區", "firstDate": "2026-09-23", "avgTemp": 28.1, "minTemp": 24.5, "maxTemp": 31.7},
  {"regionName": "北部地區", "firstDate": "2026-09-23", "avgTemp": 26.8, "minTemp": 23.3, "maxTemp": 29.9},
  {"regionName": "南部地區", "firstDate": "2026-09-23", "avgTemp": 28.8, "minTemp": 26.5, "maxTemp": 31.2},
  {"regionName": "東北部地區", "firstDate": "2026-09-23", "avgTemp": 26.2, "minTemp": 23.0, "maxTemp": 30.0},
  {"regionName": "東南部地區", "firstDate": "2026-09-23", "avgTemp": 27.3, "minTemp": 25.0, "maxTemp": 30.5},
  {"regionName": "東部地區", "firstDate": "2026-09-23", "avgTemp": 27.1, "minTemp": 24.0, "maxTemp": 30.5}
];

// Global App State
let currentRegion = "中部地區";
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

function getWeekday(dateStr) {
  try {
    const d = new Date(dateStr);
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
    if (dbInfoEl) dbInfoEl.textContent = `SQLite data.db · 42 筆記錄 · 即時 SQL 查詢`;
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

  // Fallback to embedded snapshot if backend not reachable
  if (!list || list.length === 0) {
    list = FALLBACK_FORECASTS
      .filter(item => item.Region === region)
      .map(item => ({ Date: item.Date, MinT: item.MinT, MaxT: item.MaxT }));
  }

  if (chartLoader) chartLoader.classList.add("hidden");

  if (!list || list.length === 0) return;

  // Update KPI Metrics
  const firstDay = list[0];
  const allMin = list.map(item => item.MinT);
  const allMax = list.map(item => item.MaxT);

  const avgMin = allMin.reduce((a, b) => a + b, 0) / allMin.length;
  const avgMax = allMax.reduce((a, b) => a + b, 0) / allMax.length;
  const weekAvg = ((avgMin + avgMax) / 2).toFixed(1);

  const maxTemp = Math.max(...allMax);
  const minTemp = Math.min(...allMin);
  const tempRange = (maxTemp - minTemp).toFixed(1);

  document.getElementById("val-today-mint").textContent = firstDay.MinT.toFixed(1);
  document.getElementById("val-today-maxt").textContent = firstDay.MaxT.toFixed(1);
  document.getElementById("val-week-avg").textContent = weekAvg;
  document.getElementById("val-temp-range").textContent = tempRange;

  const todayDateEl = document.getElementById("label-today-date");
  if (todayDateEl) todayDateEl.textContent = `首日日期：${firstDay.Date}`;

  // Update Chart
  renderChart(list);

  // Update Table
  renderTable(list);

  // Highlight map marker if map is ready
  if (mapMarkers[region]) {
    mapMarkers[region].openPopup();
  }
}

// 3. Render Chart.js Double Line Chart (Red MaxT / Blue MinT)
function renderChart(forecastList) {
  const chartCanvas = document.getElementById("weatherChart");
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext("2d");
  const labels = forecastList.map(item => `${formatDisplayDate(item.Date)} (${getWeekday(item.Date)})`);
  const maxTemps = forecastList.map(item => item.MaxT);
  const minTemps = forecastList.map(item => item.MinT);

  if (weatherChart) {
    weatherChart.destroy();
  }

  // Gradients for line fill
  const maxGradient = ctx.createLinearGradient(0, 0, 0, 300);
  maxGradient.addColorStop(0, "rgba(231, 76, 60, 0.28)");
  maxGradient.addColorStop(1, "rgba(231, 76, 60, 0.0)");

  const minGradient = ctx.createLinearGradient(0, 0, 0, 300);
  minGradient.addColorStop(0, "rgba(52, 152, 219, 0.25)");
  minGradient.addColorStop(1, "rgba(52, 152, 219, 0.0)");

  weatherChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
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
          pointHoverRadius: 7
        },
        {
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
          pointHoverRadius: 7
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
          display: false
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
          title: {
            display: true,
            text: "氣溫 Temperature (°C)",
            color: "#64748b",
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: "bold" }
          },
          grid: {
            color: "rgba(226, 232, 240, 0.8)"
          },
          ticks: {
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
            color: "#64748b",
            stepSize: 2
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

  forecastList.forEach(item => {
    const diff = (item.MaxT - item.MinT).toFixed(1);
    const avg = (item.MaxT + item.MinT) / 2;
    const cat = getTempCategory(avg);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <strong style="color: #1e293b;">${item.Date}</strong>
        <span style="font-size:0.75rem; color:#64748b; margin-left:4px;">(${getWeekday(item.Date)})</span>
      </td>
      <td>
        <span class="badge-temp badge-mint-val">🔵 ${item.MinT.toFixed(1)}°C</span>
      </td>
      <td>
        <span class="badge-temp badge-maxt-val">🔴 ${item.MaxT.toFixed(1)}°C</span>
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

// 5. Initialize Leaflet Map (Using OpenStreetMap standard tiles - Zero API Key required)
async function initTaiwanMap() {
  const mapLoader = document.getElementById("map-loader");
  if (mapLoader) mapLoader.classList.remove("hidden");

  // Center on Taiwan [23.7, 120.95], zoom level 7
  leafletMap = L.map("taiwan-map", {
    center: [23.7, 120.95],
    zoom: 7,
    zoomControl: true,
    scrollWheelZoom: true
  });

  // OpenStreetMap standard tile layer (100% open, zero API key needed, matches Folium in app.py)
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> 台灣地理圖資',
    maxZoom: 18,
    subdomains: ['a', 'b', 'c']
  }).addTo(leafletMap);

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

  if (mapLoader) mapLoader.classList.add("hidden");

  renderMapMarkers(summaryList);
  renderSummaryChips(summaryList);
}

function renderMapMarkers(summaryList) {
  summaryList.forEach(item => {
    const regName = item.regionName;
    const coord = REGION_COORDINATES[regName];
    if (!coord) return;

    const avgTemp = item.avgTemp;
    const colorHex = getTempColor(avgTemp);

    const marker = L.circleMarker(coord, {
      radius: 14,
      fillColor: colorHex,
      color: "#ffffff",
      weight: 3,
      opacity: 1,
      fillOpacity: 0.88
    }).addTo(leafletMap);

    // Popup HTML (Matches homework specification card)
    const popupContent = `
      <div class="custom-map-popup">
        <h4 class="popup-title">${regName}</h4>
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
        <button class="popup-btn" onclick="selectRegion('${regName}')">切換至此分區</button>
      </div>
    `;

    marker.bindPopup(popupContent, { maxWidth: 220 });
    marker.bindTooltip(`<b>${regName}</b> (均溫 ${avgTemp}°C)`, { direction: "top" });

    marker.on("click", () => {
      selectRegion(regName);
    });

    mapMarkers[regName] = marker;
  });

  if (mapMarkers[currentRegion]) {
    mapMarkers[currentRegion].openPopup();
  }
}

function renderSummaryChips(summaryList) {
  const container = document.getElementById("summary-chips");
  if (!container) return;
  container.innerHTML = "";

  summaryList.forEach(item => {
    const color = getTempColor(item.avgTemp);
    const chip = document.createElement("div");
    chip.className = "summary-chip";
    chip.innerHTML = `
      <span class="chip-dot" style="background-color: ${color};"></span>
      <strong>${item.regionName}</strong>
      <span>${item.avgTemp}°C</span>
    `;
    chip.addEventListener("click", () => {
      selectRegion(item.regionName);
    });
    container.appendChild(chip);
  });
}

// Global selector action called from UI or map
window.selectRegion = function(regionName) {
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

  // Quick pill clicks
  document.querySelectorAll(".region-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      selectRegion(pill.dataset.region);
    });
  });

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
      if (leafletMap) {
        leafletMap.setView([23.7, 120.95], 7, { animate: true });
      }
    });
  }

  // Init Map and first region forecast
  initTaiwanMap();
  loadRegionForecast("中部地區");
});
