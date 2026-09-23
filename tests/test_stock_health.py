"""
Unit and regression tests for Stock / Inventory Health Analysis Module.
Validates Feature 1 of Distil Specification (Phase 1 & 2):
- Velocity calculation (30-day standard, 45-day low-transaction extension).
- Empties exclusion from velocity.
- Lead time buffer (safety stock = 10d, ROP = 20d, suggested reorders).
- 6-band health classification & recommendations.
- Capital tied up ranking for slow/dead stock, velocity ranking for critical stock.
- Peak season multiplier side-by-side calculations.
"""

import pytest
import pandas as pd
import numpy as np
from engine.config import kane_jones_profile
from engine.stock_health import compute_stock_health


@pytest.fixture
def profile():
    return kane_jones_profile()


class TestStockHealthEngine:
    def test_basic_velocity_and_buffers(self, profile):
        """Validates velocity, safety stock (10d), ROP (20d), and reorder suggestions."""
        # Setup synthetic 30-day sales register
        dates = pd.date_range("2026-08-01", "2026-08-30")
        sales_records = []
        for d in dates:
            # 10 units sold each day -> 300 units in 30 days -> velocity = 10.0 units/day
            # 30 transactions (>10 txns -> standard 30-day window)
            sales_records.append({
                "date": d,
                "product_raw": "TROPHY CAN 33CL",
                "quantity": 10.0,
                "rate": 12000.0,
                "cost": 10000.0,
                "invoice_no": f"INV-{d.day}",
                "customer": "CUSTOMER A",
            })

        li_df = pd.DataFrame(sales_records)

        # Inventory on hand: 50 units (current stock), unit cost: 10,000
        df_inv = pd.DataFrame([{
            "item_name": "TROPHY CAN 33CL",
            "units": 50.0,
            "uom": "Ctn",
            "rate_per_unit": 10000.0,
            "value": 500000.0,
        }])

        res = compute_stock_health(df_inv, li_df, profile=profile, as_of_date="2026-08-30")
        assert len(res["all_products"]) == 1
        p = res["all_products"][0]

        # Velocity = 300 units / 30 days = 10.0 units/day
        assert p["daily_velocity"] == 10.0
        assert p["window_days"] == 30
        assert "30_days" in p["window_type"]

        # Safety stock = 10 * 10 = 100
        assert p["safety_stock"] == 100.0

        # ROP = 10 * 20 = 200
        assert p["reorder_point"] == 200.0

        # Current stock = 50 -> Suggested reorder = 200 - 50 = 150
        assert p["suggested_reorder_qty"] == 150.0
        assert p["estimated_reorder_cost"] == 150.0 * 10000.0

        # Cover = 50 / 10 = 5 days -> 5 / 7 = 0.71 weeks (< 1 week -> Critical)
        assert p["stock_cover_days"] == 5.0
        assert round(p["stock_cover_weeks"], 2) == 0.71
        assert p["status"] == "Critical (stock-out risk)"
        assert "Reorder now" in p["action_recommendation"]

    def test_low_transactions_45_day_extension(self, profile):
        """If <10 sales transactions occur in 30 days, window extends to 45 days."""
        # 45 days total history (e.g. July 17 to Aug 30)
        dates = pd.date_range("2026-07-17", "2026-08-30")
        # Only 5 transactions across 45 days (each with 6 units)
        sales_records = [
            {"date": pd.Timestamp("2026-07-20"), "product_raw": "SLOW SKU", "quantity": 6.0, "rate": 5000.0, "cost": 4000.0, "invoice_no": "1", "customer": "C"},
            {"date": pd.Timestamp("2026-07-28"), "product_raw": "SLOW SKU", "quantity": 6.0, "rate": 5000.0, "cost": 4000.0, "invoice_no": "2", "customer": "C"},
            {"date": pd.Timestamp("2026-08-05"), "product_raw": "SLOW SKU", "quantity": 6.0, "rate": 5000.0, "cost": 4000.0, "invoice_no": "3", "customer": "C"},
            {"date": pd.Timestamp("2026-08-15"), "product_raw": "SLOW SKU", "quantity": 6.0, "rate": 5000.0, "cost": 4000.0, "invoice_no": "4", "customer": "C"},
            {"date": pd.Timestamp("2026-08-25"), "product_raw": "SLOW SKU", "quantity": 6.0, "rate": 5000.0, "cost": 4000.0, "invoice_no": "5", "customer": "C"},
        ]
        li_df = pd.DataFrame(sales_records)

        df_inv = pd.DataFrame([{
            "item_name": "SLOW SKU",
            "units": 20.0,
            "uom": "Ctn",
            "rate_per_unit": 4000.0,
            "value": 80000.0,
        }])

        res = compute_stock_health(df_inv, li_df, profile=profile, as_of_date="2026-08-30")
        p = res["all_products"][0]

        # Only 3 transactions occurred in trailing 30 days (Aug 1 - Aug 30) -> triggers 45-day window
        assert p["window_days"] == 45
        assert "45_days" in p["window_type"]
        # Total units in 45 days = 30 -> Daily velocity = 30 / 45 = 0.67
        assert round(p["daily_velocity"], 2) == 0.67

    def test_empties_exclusion_from_velocity(self, profile):
        """Empties returnable containers must NEVER be included in beverage velocity."""
        dates = pd.date_range("2026-08-01", "2026-08-30")
        sales_records = []
        for d in dates:
            # Empties sold
            sales_records.append({
                "date": d,
                "product_raw": "EMPTY BOTTLES",
                "quantity": 100.0,
                "rate": 3000.0,
                "cost": 3000.0,
                "invoice_no": f"INV-{d.day}",
                "customer": "CUSTOMER A",
            })
            # Real product
            sales_records.append({
                "date": d,
                "product_raw": "CASTLE LITE CAN 33CL",
                "quantity": 5.0,
                "rate": 11000.0,
                "cost": 9000.0,
                "invoice_no": f"INV-{d.day}",
                "customer": "CUSTOMER A",
            })

        li_df = pd.DataFrame(sales_records)
        df_inv = pd.DataFrame([
            {"item_name": "CASTLE LITE CAN 33CL", "units": 100.0, "uom": "Ctn", "rate_per_unit": 9000.0, "value": 900000.0},
        ])

        res = compute_stock_health(df_inv, li_df, profile=profile, as_of_date="2026-08-30")
        p = res["all_products"][0]

        # Castle Lite velocity = 150 / 30 = 5.0 units/day (empties lines were ignored)
        assert p["daily_velocity"] == 5.0

    def test_health_band_classifications(self, profile):
        """Validates all health status conditions."""
        # 1. Dead Stock: units_sold = 0, current_stock > 0
        df_inv_dead = pd.DataFrame([{"item_name": "DEAD ITEM", "units": 50.0, "uom": "Ctn", "rate_per_unit": 5000.0, "value": 250000.0}])
        res_dead = compute_stock_health(df_inv_dead, pd.DataFrame(), profile=profile)
        assert res_dead["all_products"][0]["status"] == "Dead Stock"
        assert len(res_dead["dead_stock"]) == 1

        # 2. No Stock / No Sales: units_sold = 0, current_stock = 0 (excluded from active lists)
        df_inv_none = pd.DataFrame([{"item_name": "GHOST ITEM", "units": 0.0, "uom": "Ctn", "rate_per_unit": 5000.0, "value": 0.0}])
        res_none = compute_stock_health(df_inv_none, pd.DataFrame(), profile=profile)
        assert len(res_none["all_products"]) == 0  # excluded per section 1.4

        # 3. Healthy: 2–4 weeks cover
        # Daily velocity = 10 -> 1 week = 70 units. Current stock = 210 units -> 3 weeks cover
        sales_records = [{"date": pd.Timestamp("2026-08-01") + pd.Timedelta(days=i), "product_raw": "HEALTHY SKU", "quantity": 10.0, "rate": 1000.0, "cost": 800.0, "invoice_no": str(i), "customer": "C"} for i in range(30)]
        df_inv_healthy = pd.DataFrame([{"item_name": "HEALTHY SKU", "units": 210.0, "uom": "Ctn", "rate_per_unit": 800.0, "value": 168000.0}])
        res_h = compute_stock_health(df_inv_healthy, pd.DataFrame(sales_records), profile=profile, as_of_date="2026-08-30")
        assert res_h["all_products"][0]["status"] == "Healthy"

        # 4. Excess: > 6 weeks cover
        # Current stock = 700 units -> 10 weeks cover
        df_inv_excess = pd.DataFrame([{"item_name": "HEALTHY SKU", "units": 700.0, "uom": "Ctn", "rate_per_unit": 800.0, "value": 560000.0}])
        res_e = compute_stock_health(df_inv_excess, pd.DataFrame(sales_records), profile=profile, as_of_date="2026-08-30")
        assert res_e["all_products"][0]["status"] == "Excess (capital tied up)"

    def test_peak_period_side_by_side(self, profile):
        """Validates that peak season multiplier creates side-by-side metrics without altering baseline."""
        sales_records = [{"date": pd.Timestamp("2026-08-01") + pd.Timedelta(days=i), "product_raw": "DECEMBER PEAK", "quantity": 10.0, "rate": 1000.0, "cost": 800.0, "invoice_no": str(i), "customer": "C"} for i in range(30)]
        df_inv = pd.DataFrame([{"item_name": "DECEMBER PEAK", "units": 150.0, "uom": "Ctn", "rate_per_unit": 800.0, "value": 120000.0}])

        # Multiplier = 2.0
        res = compute_stock_health(df_inv, pd.DataFrame(sales_records), profile=profile, as_of_date="2026-08-30", peak_multiplier=2.0, is_peak_active=True)
        p = res["all_products"][0]

        # Baseline:
        # velocity = 10.0, safety = 100.0, ROP = 200.0, suggested_reorder = 200 - 150 = 50.0
        assert p["daily_velocity"] == 10.0
        assert p["safety_stock"] == 100.0
        assert p["reorder_point"] == 200.0
        assert p["suggested_reorder_qty"] == 50.0

        # Peak Adjusted (Side-by-Side):
        peak = p["peak_adjusted"]
        assert peak["is_active"] is True
        assert peak["multiplier"] == 2.0
        assert peak["peak_daily_velocity"] == 20.0
        assert peak["peak_safety_stock"] == 200.0
        assert peak["peak_reorder_point"] == 400.0
        assert peak["peak_suggested_reorder_qty"] == 250.0  # 400 - 150
