"""
Unit and regression tests for Weekly Financial Reporting Module.
Validates Feature 2 of Distil Specification (Phase 1 & 2):
- Applies exact P&L calculation chain across weekly slices.
- Calendar week (Mon–Sun) and trading week slicing.
- Week-over-Week (WoW) variance calculation and basis point deltas.
- Supporting breakdowns: daily audit rows, top products, top customers, returns, expenses.
- Executive narrative commentary generation.
"""

import pytest
import pandas as pd
import numpy as np
from engine.config import kane_jones_profile
from engine.weekly_finance import compute_weekly_financials


@pytest.fixture
def profile():
    return kane_jones_profile()


class TestWeeklyFinancialsEngine:
    def test_weekly_pnl_chain_and_wow(self, profile):
        """Validates that the weekly P&L chain matches the monthly P&L formula exactly."""
        # 14 days of data: 2 distinct weeks
        # Week 1: 2026-08-03 (Monday) to 2026-08-09 (Sunday)
        # Week 2: 2026-08-10 (Monday) to 2026-08-16 (Sunday)
        inv_records = []
        li_records = []

        # Week 1: 10 invoices @ 1,000,000 rev, 900,000 cost -> 10,000,000 gross rev, 9,000,000 cogs
        for i in range(1, 8):
            d = pd.Timestamp(f"2026-08-0{2+i}")
            inv_no = f"INV-W1-{i}"
            inv_records.append({
                "date": d,
                "invoice_no": inv_no,
                "gross_revenue": 1_000_000.0,
                "invoice_cost": 900_000.0,
                "gross_profit": 100_000.0,
                "customer": "CUST 1",
            })
            li_records.append({
                "date": d,
                "invoice_no": inv_no,
                "product_raw": "GOLDEN MALT",
                "quantity": 100.0,
                "rate": 10_000.0,
                "cost": 900_000.0,
                "customer": "CUST 1",
            })

        # Week 2: 10 invoices @ 2,000,000 rev, 1,700,000 cost -> 14,000,000 gross rev, 11,900,000 cogs
        for i in range(1, 8):
            d = pd.Timestamp(f"2026-08-{9+i:02d}")
            inv_no = f"INV-W2-{i}"
            inv_records.append({
                "date": d,
                "invoice_no": inv_no,
                "gross_revenue": 2_000_000.0,
                "invoice_cost": 1_700_000.0,
                "gross_profit": 300_000.0,
                "customer": "CUST 2",
            })
            li_records.append({
                "date": d,
                "invoice_no": inv_no,
                "product_raw": "GOLDEN MALT",
                "quantity": 200.0,
                "rate": 10_000.0,
                "cost": 1_700_000.0,
                "customer": "CUST 2",
            })

        inv_df = pd.DataFrame(inv_records)
        li_df = pd.DataFrame(li_records)

        # Sales returns: ₦200,000 in Week 1, ₦400,000 in Week 2
        df_returns = pd.DataFrame([
            {"date": pd.Timestamp("2026-08-05"), "voucher_no": "RET-1", "customer": "CUST 1", "item_name": "GOLDEN MALT", "item_type": "Product", "quantity": 20.0, "return_value": 200_000.0},
            {"date": pd.Timestamp("2026-08-12"), "voucher_no": "RET-2", "customer": "CUST 2", "item_name": "GOLDEN MALT", "item_type": "Product", "quantity": 40.0, "return_value": 400_000.0},
        ])

        # Expenses total = ₦1,400,000 (allocated ₦700k per week for equal 7 days)
        res = compute_weekly_financials(
            inv_df=inv_df,
            line_items_df=li_df,
            df_returns=df_returns,
            profile=profile,
            expenses_total=1_400_000.0,
        )

        weeks = res["calendar_weeks"]
        assert len(weeks) == 2

        # Week 1
        w1 = weeks[0]
        p1 = w1["pnl"]
        assert p1["gross_sales_revenue"] == 7_000_000.0
        assert p1["total_sales_returns"] == 200_000.0
        assert p1["net_sales_revenue"] == 6_800_000.0
        assert p1["cogs"] == 6_300_000.0
        assert p1["gross_profit"] == 500_000.0  # 6.8M - 6.3M
        assert round(p1["gross_margin_pct"], 2) == round((500_000.0 / 6_800_000.0) * 100, 2)
        assert p1["total_operating_expenses"] == 700_000.0
        assert p1["net_profit"] == -200_000.0  # 500k - 700k

        # Week 2
        w2 = weeks[1]
        p2 = w2["pnl"]
        assert p2["gross_sales_revenue"] == 14_000_000.0
        assert p2["total_sales_returns"] == 400_000.0
        assert p2["net_sales_revenue"] == 13_600_000.0
        assert p2["cogs"] == 11_900_000.0
        assert p2["gross_profit"] == 1_700_000.0  # 13.6M - 11.9M
        assert p2["total_operating_expenses"] == 700_000.0
        assert p2["net_profit"] == 1_000_000.0

        # Week-over-Week (WoW) comparison on Week 2 vs Week 1
        wow2 = w2["wow"]
        assert wow2["has_previous"] is True
        assert wow2["revenue_diff"] == 7_000_000.0  # 14M - 7M
        assert wow2["revenue_diff_pct"] == 100.0    # doubled
        assert wow2["gross_profit_diff"] == 1_200_000.0  # 1.7M - 500k
        assert wow2["net_profit_diff"] == 1_200_000.0    # 1.0M - (-200k)

        # Narrative commentary generated
        assert len(w2["narrative_insight"]) > 20
        assert "gross sales revenue" in w2["narrative_insight"]

    def test_breakdowns_integrity(self, profile):
        """Daily rows sum to weekly gross revenue."""
        dates = pd.date_range("2026-08-03", "2026-08-07")  # 5 days
        inv_records = [{
            "date": d,
            "invoice_no": f"INV-{d.day}",
            "gross_revenue": 500_000.0,
            "invoice_cost": 400_000.0,
            "gross_profit": 100_000.0,
            "customer": "CUST A",
        } for d in dates]

        inv_df = pd.DataFrame(inv_records)
        res = compute_weekly_financials(inv_df, pd.DataFrame(), profile=profile)
        w = res["calendar_weeks"][0]

        daily = w["daily_breakdown"]
        assert len(daily) == 5
        sum_daily_rev = sum(d["gross_revenue"] for d in daily)
        assert sum_daily_rev == w["pnl"]["gross_sales_revenue"]

    def test_trading_weeks_mode(self, profile):
        """Validates 7-day blocks starting from day 1."""
        dates = pd.date_range("2026-08-01", "2026-08-21")
        inv_records = [{
            "date": d,
            "invoice_no": f"INV-{d.day}",
            "gross_revenue": 100_000.0,
            "invoice_cost": 80_000.0,
            "gross_profit": 20_000.0,
            "customer": "CUST A",
        } for d in dates]

        res = compute_weekly_financials(pd.DataFrame(inv_records), pd.DataFrame(), profile=profile, week_mode="trading")
        assert len(res["trading_weeks"]) == 3
        for tw in res["trading_weeks"]:
            assert tw["calendar_days"] == 7
