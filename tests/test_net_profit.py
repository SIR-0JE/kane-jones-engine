"""
Unit and regression tests for Official Management Net Profit Bridge and Operating Expenses Parser.
"""

import pytest
from engine.net_profit import compute_net_profit_bridge, parse_expenses_sheet


class TestNetProfitBridge:
    """Validates the Management Net Profit Waterfall against official July 2026 benchmarks."""

    def test_net_profit_bridge_benchmarks(self, parsed_data):
        inv_df = parsed_data["inv_df"]
        li_df = parsed_data["li_df"]
        returns_df = parsed_data["returns_df"]
        df_inv = parsed_data.get("inv_df_cost")
        expenses_total = 2095229.0  # From threshold sheet Grand Total (incl. Journal)

        bridge = compute_net_profit_bridge(
            invoices_df=inv_df,
            line_items_df=li_df,
            df_returns=returns_df,
            df_inv=df_inv,
            expenses_total=expenses_total,
        )

        # 1. Gross Sales Revenue (incl. empties)
        assert bridge["gross_sales_revenue"] == 187674790.0

        # 2. Total Sales Returns (incl. empties)
        assert bridge["total_sales_returns"] == 13955850.0

        # 3. Net Sales Revenue
        assert bridge["net_sales_revenue"] == 173718940.0

        # 4. Gross Invoiced Embedded Cost (incl. empties) & Cost of Returns Credited Back
        assert bridge["gross_embedded_cost"] == 183957167.0
        assert round(bridge["cost_of_returns"], 2) == 10792837.31
        assert round(bridge["total_cost"], 2) == 173164329.69

        # 5. Net Gross Profit (post-returns basis)
        assert round(bridge["net_gross_profit_loss"], 2) == 554610.31

        # 6. Operating Expenses
        assert bridge["total_operating_expenses"] == 2095229.0

        # 7. Net Operating Profit / (Loss)
        assert round(bridge["net_operating_profit_loss"], 2) == -1540618.69

        # 8. Return Rate
        assert round(bridge["return_rate"], 4) == 0.0744

    def test_expenses_parsing_sheet(self):
        """Validates expenses parsing from threshold sheet matching 2,095,229 Grand Total."""
        total, df, anoms = parse_expenses_sheet("sample_data/july_expn.xlsx")
        assert total == 2095229.0
        assert len(df) == 13
        assert "Journal" in df["category"].values

    def test_expenses_parsing_no_expenses_in_sales_file(self):
        """Validates that a sales workbook without expenses returns 0.0 and does not parse sales invoices as expenses."""
        total, df, anoms = parse_expenses_sheet("sample_data/July_sales_report_v6.xlsx")
        assert total == 0.0
        assert len(df) == 0

    def test_expenses_parsing_fallback(self):
        """Validates expenses parsing behavior when file does not exist or empty."""
        total, df, anoms = parse_expenses_sheet("non_existent_file.xlsx")
        assert total == 0.0
        assert len(df) == 0
        assert len(anoms) == 0
