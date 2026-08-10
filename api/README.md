# Depot Sales Intelligence Engine API

Stateless FastAPI service wrapping the parsing, price-matching, and audit engine for beverage depot spreadsheets.

## Running Locally

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Start the API server with Uvicorn:
```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive OpenAPI documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## Endpoints

### 1. Health Check
`GET /health`

**Response:**
```json
{
  "status": "ok",
  "service": "depot-sales-intelligence-engine"
}
```

### 2. Analyze Workbook
`POST /analyze`

Accepts a multipart form upload with:
- `file`: The raw Excel workbook (`.xlsx`)
- `client_id`: (optional string, defaults to `"kane-jones"`)

#### Curl Example
```bash
curl -X POST "http://localhost:8000/analyze" \
  -F "file=@sample_data/July_sales_report_v4.xlsx" \
  -F "client_id=kane-jones"
```

#### Python httpx Example
```python
import httpx

with open("sample_data/July_sales_report_v4.xlsx", "rb") as f:
    files = {"file": ("July_sales_report_v4.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    data = {"client_id": "kane-jones"}
    response = httpx.post("http://localhost:8000/analyze", files=files, data=data, timeout=60.0)
    print(response.status_code)
    result = response.json()
```

#### Top-Level Response Structure
```json
{
  "meta": {
    "client_id": "kane-jones",
    "client_display_name": "Kane-Jones Depot (Ogun State)",
    "currency_symbol": "₦",
    "total_revenue": 185012345.67,
    "total_gross_profit": 12345678.90,
    "overall_margin_pct": 0.0667,
    "date_range": {
      "start": "2026-07-01",
      "end": "2026-07-31"
    },
    "total_invoices": 300,
    "total_anomalies": 3
  },
  "match_quality": {
    "total_products": 45,
    "counts": {
      "exact": 10,
      "fuzzy": 21,
      "manual_override": 5,
      "fuzzy_no_size_match": 0,
      "unmatched": 9
    },
    "unmatched_products": ["..."]
  },
  "anomalies": [...],
  "below_floor_pricing": [...],
  "volume_tier_audit": [...],
  "daily_summary": [...],
  "weekly_summary": [...],
  "product_revenue_ranking": [...],
  "customer_margin_detail": [...],
  "concentration_metrics": {
    "top_n": 10,
    "top_n_revenue": 150000000.0,
    "total_revenue": 185012345.67,
    "top_n_pct": 0.8107
  }
}
```
