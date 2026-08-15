"""
Unit and regression tests for Official Management Net Profit Bridge.
"""

import pytest
from engine.net_profit import compute_net_profit_bridge, parse_expenses_sheet


class TestNetProfitBridge:
    """Validates the Management Net Profit Waterfall against official July 2026 benchmarks."""

    def test_net_profit_bridge_benchmarks(self, parsed_data):
        li_df = parsed_data["li_df"]
        returns_df = parsed_data["returns_df"]
        expenses_total = 2059599.0  # From payment vouchers

        bridge = compute_net_profit_bridge(
            invoices_df=parsed_data["inv_df"],
            line_items_df=li_df,
            df_returns=returns_df,
            expenses_total=expenses_total,
        )

        # 1. Gross Sales Revenue (incl. empties)
        assert bridge["gross_sales_revenue"] == 187674790.0

        # 2. Total Sales Returns (incl. empties)
        assert bridge["total_sales_returns"] == 13955850.0

        # 3. Net Sales Revenue
        assert bridge["net_sales_revenue"] == 173718940.0

        # 4. Total Cost (invoice-embedded, incl. empties)
        assert bridge["total_cost_embedded"] == 183957167.0

        # 5. Net Gross Profit / (Loss)
        assert bridge["net_gross_profit_loss"] == -10238227.0
        assert round(bridge["net_gross_margin_pct"], 4) == -0.0589

        # 6. Operating Expenses
        assert bridge["total_operating_expenses"] == 2059599.0

        # 7. Net Operating Profit / (Loss)
        assert bridge["net_operating_profit_loss"] == -12297826.0

        # 8. Return Rate
        assert round(bridge["return_rate"], 4) == 0.0744

    def test_expenses_parsing_fallback(self):
        """Validates expenses parsing behavior when file does not exist or empty."""
        total, df, anoms = parse_expenses_sheet("non_existent_file.xlsx")
        assert total == 0.0
        assert len(df) == 0
        assert len(anoms) == 0

