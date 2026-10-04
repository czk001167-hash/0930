"""
api/index.py - Vercel Serverless Function for Taiwan Weather Forecast
Provides RESTful API endpoints by querying SQLite (data.db).
Zero external dependencies (uses standard library: sqlite3, http.server, json, urllib).
Complies with assignment requirement: 使用 SQL 從 SQLite 查詢資料，嚴禁前端直連氣象署 API。
"""

import os
import json
import sqlite3
import datetime
from urllib.parse import urlparse, parse_qs, unquote
from http.server import BaseHTTPRequestHandler

# Resolve SQLite database path
# Look for data.db in project root or current working directory
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
CANDIDATE_PATHS = [
    os.path.join(PROJECT_ROOT, "data.db"),
    os.path.join(os.getcwd(), "data.db"),
    os.path.join(CURRENT_DIR, "data.db"),
]

DB_PATH = None
for p in CANDIDATE_PATHS:
    if os.path.exists(p):
        DB_PATH = p
        break

if DB_PATH is None:
    DB_PATH = os.path.join(PROJECT_ROOT, "data.db")


def get_db_connection():
    """Connect to SQLite with read-only mode if possible or standard connect."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def handle_get_regions():
    """從 SQLite 讀取所有可選地區名稱 (使用 SQL 查詢)"""
    if not os.path.exists(DB_PATH):
        return {"error": "Database not found", "regions": []}, 404
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT regionName FROM TemperatureForecasts ORDER BY id ASC;")
    rows = cursor.fetchall()
    conn.close()
    regions = [row["regionName"] for row in rows]
    return {"regions": regions}, 200


def handle_get_forecast(region_name):
    """使用 SQL 從 SQLite 資料庫查詢指定地區之一週預報"""
    if not os.path.exists(DB_PATH):
        return {"error": "Database not found", "data": []}, 404
    
    if not region_name:
        return {"error": "Missing region parameter"}, 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    query = """
        SELECT dataDate AS Date, minT AS MinT, maxT AS MaxT
        FROM TemperatureForecasts
        WHERE regionName = ?
        ORDER BY dataDate ASC;
    """
    cursor.execute(query, (region_name,))
    rows = cursor.fetchall()
    conn.close()
    
    # 動態滾動日期：以今天為第 1 天，向後預報未來一週 (7天)
    today = datetime.date.today()
    data = [
        {
            "Date": (today + datetime.timedelta(days=idx)).strftime("%Y-%m-%d"),
            "MinT": float(row["MinT"]),
            "MaxT": float(row["MaxT"])
        }
        for idx, row in enumerate(rows)
    ]
    return {"region": region_name, "data": data}, 200


def handle_get_summary():
    """使用 SQL 查詢各區域首日與一週氣溫概要（供地圖與綜合比較展示）"""
    if not os.path.exists(DB_PATH):
        return {"error": "Database not found", "summary": []}, 404
    
    conn = get_db_connection()
    cursor = conn.cursor()
    query = """
        SELECT regionName, 
               MIN(dataDate) as firstDate,
               AVG((minT + maxT) / 2.0) as avgTemp,
               MIN(minT) as minTemp,
               MAX(maxT) as maxTemp
        FROM TemperatureForecasts
        GROUP BY regionName;
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()
    
    today_str = datetime.date.today().strftime("%Y-%m-%d")
    summary = [
        {
            "regionName": row["regionName"],
            "firstDate": today_str,
            "avgTemp": round(float(row["avgTemp"]), 1) if row["avgTemp"] is not None else 0.0,
            "minTemp": float(row["minTemp"]) if row["minTemp"] is not None else 0.0,
            "maxTemp": float(row["maxTemp"]) if row["maxTemp"] is not None else 0.0
        }
        for row in rows
    ]
    return {"summary": summary}, 200


def handle_get_health():
    """系統狀態與資料庫診斷"""
    db_exists = os.path.exists(DB_PATH)
    total_records = 0
    regions_count = 0
    if db_exists:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*), COUNT(DISTINCT regionName) FROM TemperatureForecasts;")
            row = cursor.fetchone()
            total_records = row[0]
            regions_count = row[1]
            conn.close()
        except Exception:
            pass
            
    return {
        "status": "healthy" if db_exists and total_records > 0 else "degraded",
        "database_exists": db_exists,
        "database_path": DB_PATH,
        "total_records": total_records,
        "regions_count": regions_count,
        "source": "Taiwan CWA Open Data (F-A0010-001)"
    }, 200


class handler(BaseHTTPRequestHandler):
    """Vercel Serverless Function Handler & Standalone HTTP Server Handler."""

    def _send_json_response(self, data, status_code=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        """Handle CORS Preflight requests."""
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        # Normalize /api/xxx and /xxx
        if path.startswith("/api"):
            path = path[4:]
        if not path:
            path = "/"

        params = parse_qs(parsed.query)

        if path == "/regions":
            data, code = handle_get_regions()
            self._send_json_response(data, code)
        elif path == "/forecast":
            region = params.get("region", [None])[0]
            if region:
                region = unquote(region)
            data, code = handle_get_forecast(region)
            self._send_json_response(data, code)
        elif path == "/summary":
            data, code = handle_get_summary()
            self._send_json_response(data, code)
        elif path in ("/health", "/status", "/"):
            data, code = handle_get_health()
            self._send_json_response(data, code)
        else:
            self._send_json_response({"error": "Endpoint not found", "path": parsed.path}, 404)


if __name__ == "__main__":
    from http.server import HTTPServer
    PORT = 8000
    server_address = ("127.0.0.1", PORT)
    httpd = HTTPServer(server_address, handler)
    print(f"Server started at http://127.0.0.1:{PORT} (DB: {DB_PATH})")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer shutting down.")
