"""
dev_server.py - Taiwan Weather Forecast 本地一鍵開發與測試伺服器
無須安裝任何第三方套件 (僅使用 Python 內建標準庫 http.server, sqlite3, json)。
同時提供：
1. 靜態前端網頁 (public/index.html, style.css, app.js)
2. Vercel Serverless 同款 API (/api/regions, /api/forecast, /api/summary, /api/health)
"""

import os
import sys
import json
import sqlite3
import datetime
import webbrowser
from urllib.parse import urlparse, parse_qs, unquote
from http.server import HTTPServer, SimpleHTTPRequestHandler

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
DB_PATH = os.path.join(BASE_DIR, "data.db")

PORT = 3000

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def handle_get_regions():
    if not os.path.exists(DB_PATH):
        return {"error": "data.db not found", "regions": []}, 404
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT DISTINCT regionName FROM TemperatureForecasts ORDER BY id ASC;")
    rows = c.fetchall()
    conn.close()
    return {"regions": [r["regionName"] for r in rows]}, 200

def handle_get_forecast(region_name):
    if not os.path.exists(DB_PATH):
        return {"error": "data.db not found", "data": []}, 404
    if not region_name:
        return {"error": "Missing region parameter"}, 400
    conn = get_db_connection()
    c = conn.cursor()
    query = """
        SELECT dataDate AS Date, minT AS MinT, maxT AS MaxT, pop AS PoP
        FROM TemperatureForecasts
        WHERE regionName = ?
        ORDER BY dataDate ASC;
    """
    c.execute(query, (region_name,))
    rows = c.fetchall()
    conn.close()
    # 動態滾動日期：以今天為第 1 天，向後預報未來一週 (7天)
    today = datetime.date.today()
    data = [
        {
            "Date": (today + datetime.timedelta(days=idx)).strftime("%Y-%m-%d"),
            "MinT": float(r["MinT"]),
            "MaxT": float(r["MaxT"]),
            "PoP": int(r["PoP"]) if ("PoP" in r.keys() and r["PoP"] is not None) else 20
        }
        for idx, r in enumerate(rows)
    ]
    return {"region": region_name, "data": data}, 200

def handle_get_summary():
    if not os.path.exists(DB_PATH):
        return {"error": "data.db not found", "summary": []}, 404
    conn = get_db_connection()
    c = conn.cursor()
    query = """
        SELECT regionName, 
               MIN(dataDate) as firstDate,
               AVG((minT + maxT) / 2.0) as avgTemp,
               MIN(minT) as minTemp,
               MAX(maxT) as maxTemp,
               ROUND(AVG(pop)) as avgPoP
        FROM TemperatureForecasts
        GROUP BY regionName;
    """
    c.execute(query)
    rows = c.fetchall()
    conn.close()
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    summary = [
        {
            "regionName": r["regionName"],
            "firstDate": today_str,
            "avgTemp": round(float(r["avgTemp"]), 1) if r["avgTemp"] is not None else 0.0,
            "minTemp": float(r["minTemp"]) if r["minTemp"] is not None else 0.0,
            "maxTemp": float(r["maxTemp"]) if r["maxTemp"] is not None else 0.0,
            "avgPoP": int(r["avgPoP"]) if ("avgPoP" in r.keys() and r["avgPoP"] is not None) else 20
        }
        for r in rows
    ]
    return {"summary": summary}, 200

def handle_get_health():
    db_exists = os.path.exists(DB_PATH)
    total_records = 0
    regions_count = 0
    if db_exists:
        try:
            conn = get_db_connection()
            c = conn.cursor()
            c.execute("SELECT COUNT(*), COUNT(DISTINCT regionName) FROM TemperatureForecasts;")
            r = c.fetchone()
            total_records = r[0]
            regions_count = r[1]
            conn.close()
        except Exception:
            pass
    return {
        "status": "healthy" if db_exists and total_records > 0 else "degraded",
        "database_exists": db_exists,
        "database_path": DB_PATH,
        "total_records": total_records,
        "regions_count": regions_count,
        "mode": "Local Dev Server (Emulating Vercel Serverless)"
    }, 200


class WeatherDevHandler(SimpleHTTPRequestHandler):
    """Handles both static files from public/ and /api/* endpoints."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def _send_json_response(self, data, status_code=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        params = parse_qs(parsed.query)

        # Route API calls
        if path.startswith("/api/"):
            subpath = path[5:]
            if subpath == "regions":
                data, code = handle_get_regions()
                self._send_json_response(data, code)
                return
            elif subpath == "forecast":
                region = params.get("region", [None])[0]
                if region:
                    region = unquote(region)
                data, code = handle_get_forecast(region)
                self._send_json_response(data, code)
                return
            elif subpath == "summary":
                data, code = handle_get_summary()
                self._send_json_response(data, code)
                return
            elif subpath in ("health", "status"):
                data, code = handle_get_health()
                self._send_json_response(data, code)
                return
            else:
                self._send_json_response({"error": "Endpoint not found"}, 404)
                return

        # Otherwise serve static files from public/
        return super().do_GET()


def run_server():
    server_address = ("127.0.0.1", PORT)
    httpd = HTTPServer(server_address, WeatherDevHandler)
    url = f"http://127.0.0.1:{PORT}"
    print("=" * 60)
    print("🌤️  Taiwan Weather Forecast - Local Dev Server")
    print(f"👉 網站網址 (Dashboard): {url}")
    print(f"👉 API 端點 (Health):   {url}/api/health")
    print(f"👉 資料庫狀態:          {DB_PATH} ({'存在' if os.path.exists(DB_PATH) else '不存在'})")
    print("=" * 60)
    print("提示：在終端機按下 Ctrl + C 即可停止伺服器\n")

    # Auto open in browser if not running in headless script or NO_BROWSER
    if not os.environ.get("NO_BROWSER"):
        try:
            webbrowser.open(url)
        except Exception:
            pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n伺服器已安全停止。")


if __name__ == "__main__":
    run_server()
