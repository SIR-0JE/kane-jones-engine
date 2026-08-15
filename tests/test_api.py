"""
Integration and API endpoint tests for Depot Sales Intelligence Engine FastAPI service.
"""

import pytest
from fastapi.testclient import TestClient

from api.index import app


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


class TestApiEndpoints:
    """Validates FastAPI routes and HTTP responses."""

    def test_root_endpoint(self, client):
        res = client.get("/")
        assert res.status_code == 200
        data = res.json()
        assert data.get("status") == "ok"

    def test_list_snapshots(self, client):
        res = client.get("/api/snapshots?client_id=kane-jones")
        assert res.status_code == 200
        data = res.json()
        assert "snapshots" in data
        assert isinstance(data["snapshots"], list)
        assert len(data["snapshots"]) > 0

    def test_get_snapshot_detail(self, client):
        res = client.get("/api/snapshots/2026-07?client_id=kane-jones")
        assert res.status_code == 200
        data = res.json()
        assert "meta" in data
        assert "net_profit_bridge" in data
        assert "true_cost_products" in data
        assert "returns_analysis" in data

    def test_download_pdf_report(self, client):
        res = client.get("/api/report?client_id=kane-jones&period_label=2026-07")
        assert res.status_code == 200
        assert res.headers["content-type"] == "application/pdf"
        assert "attachment; filename=" in res.headers["content-disposition"]
        assert len(res.content) > 50000

    def test_download_presentation_pptx(self, client):
        res = client.get("/api/report/pptx?client_id=kane-jones&period_label=2026-07")
        assert res.status_code == 200
        assert "presentation" in res.headers["content-type"]
        assert "attachment; filename=" in res.headers["content-disposition"]
        assert len(res.content) > 40000
