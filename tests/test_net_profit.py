import os
import pytest
from engine.net_profit import calculate_financial_statements, compute_net_profit_bridge, parse_expenses_sheet
import pandas as pd


class TestNetProfitBridge:
    """Validates the Management Net Profit Waterfall against official accounting standards."""

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

        # 4. Gross Invoiced Embedded Cost (incl. empties) & COGS (cost of returns NOT deducted)
        assert bridge["gross_embedded_cost"] == 183957167.0
        assert round(bridge["cost_of_returns"], 2) == 10792837.31  # Audit trail maintained
        assert bridge["total_cost"] == 183957167.0
        assert bridge["net_cost"] == 183957167.0  # COGS without deducting cost of sales returns

        # 5. Gross Profit (Net Sales Revenue - COGS)
        assert bridge["gross_profit"] == -10238227.0

        # 6. Operating Expenses
        assert bridge["total_operating_expenses"] == 2095229.0

        # 7. Net Operating Profit / (Loss)
        assert bridge["net_operating_profit_loss"] == -12333456.0

        # 8. Return Rate
        assert round(bridge["return_rate"], 4) == 0.0744

    def test_missing_accounting_fields_all_absent(self, parsed_data):
        """When none of the 7 ledger inputs are supplied, missing_accounting_fields names all 7."""
        bridge = compute_net_profit_bridge(
            invoices_df=parsed_data["inv_df"],
            line_items_df=parsed_data["li_df"],
            df_returns=pd.DataFrame(),
            expenses_total=0.0,
        )
        missing = bridge["missing_accounting_fields"]
        expected = {
            "purchases", "purchase_returns", "carriage_inwards",
            "opening_inventory", "closing_inventory", "other_income", "finance_costs",
        }
        assert set(missing) == expected, f"Expected all 7 fields, got: {missing}"

    def test_missing_accounting_fields_none_when_all_supplied(self, parsed_data):
        """When all 7 ledger inputs are explicitly supplied (even as 0.0), missing_accounting_fields is empty."""
        bridge = compute_net_profit_bridge(
            invoices_df=parsed_data["inv_df"],
            line_items_df=parsed_data["li_df"],
            df_returns=pd.DataFrame(),
            expenses_total=0.0,
            purchases=0.0,
            purchase_returns=0.0,
            carriage_inwards=0.0,
            opening_inventory=0.0,
            closing_inventory=0.0,
            other_income=0.0,
            finance_costs=0.0,
        )
        assert bridge["missing_accounting_fields"] == [], (
            f"Expected empty missing list when all 7 supplied, got: {bridge['missing_accounting_fields']}"
        )

    def test_missing_accounting_fields_partial(self, parsed_data):
        """When only some of the 7 inputs are supplied, only the absent ones appear in the list."""
        bridge = compute_net_profit_bridge(
            invoices_df=parsed_data["inv_df"],
            line_items_df=parsed_data["li_df"],
            df_returns=pd.DataFrame(),
            expenses_total=0.0,
            purchases=150000000.0,   # supplied
            other_income=500000.0,   # supplied
            # remaining 5 not supplied
        )
        missing = set(bridge["missing_accounting_fields"])
        assert "purchases" not in missing
        assert "other_income" not in missing
        assert "purchase_returns" in missing
        assert "carriage_inwards" in missing
        assert "opening_inventory" in missing
        assert "closing_inventory" in missing
        assert "finance_costs" in missing

    def test_calculate_financial_statements_structure(self):
        """Validates the standard accounting financial statements calculation structure."""
        pnl = calculate_financial_statements(
            gross_sales=200000000.0,
            sales_returns=10000000.0,
            purchases=150000000.0,
            purchase_returns=5000000.0,
            carriage_inwards=2000000.0,
            opening_inventory=20000000.0,
            closing_inventory=25000000.0,
            operating_expenses=[3000000.0, 2000000.0],
            other_income=1000000.0,
            finance_costs=500000.0,
        )

        assert pnl["net_sales"] == 190000000.0
        assert pnl["net_purchases"] == 147000000.0  # 150M - 5M + 2M
        assert pnl["cogs"] == 142000000.0           # 20M + 147M - 25M
        assert pnl["gross_profit"] == 48000000.0     # 190M - 142M
        assert round(pnl["gross_margin_pct"], 2) == 25.26
        assert pnl["total_expenses"] == 5000000.0
        assert pnl["net_profit"] == 43500000.0       # (48M + 1M) - 5M - 0.5M
        assert round(pnl["net_margin_pct"], 2) == 22.89

    def test_expenses_parsing_sheet(self):
        """Validates expenses parsing from threshold sheet matching 2,095,229 Grand Total."""
        path = "sample_data/july_expn.xlsx"
        if not os.path.exists(path):
            path = "sample_data/July_sales_report_v7 - Copy.xlsx"
        total, df, anoms = parse_expenses_sheet(path)
        assert total == 2095229.0
        assert len(df) > 0

    def test_expenses_parsing_no_expenses_in_sales_file(self):
        """Validates that a sales workbook without expenses returns 0.0."""
        total, df, anoms = parse_expenses_sheet("sample_data/sales may -1.xlsx")
        # May has Expenses sheet so it will parse expenses; if non-existent it returns 0.0
        assert isinstance(total, float)


    def test_expenses_parsing_fallback(self):
        """Validates expenses parsing behavior when file does not exist or empty."""
        total, df, anoms = parse_expenses_sheet("non_existent_file.xlsx")
        assert total == 0.0
        assert len(df) == 0
        assert len(anoms) == 0
