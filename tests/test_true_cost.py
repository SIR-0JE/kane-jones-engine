"""
Unit and regression tests for True-Cost Profitability Engine and Sales Returns Analysis.
"""

import pytest
from engine.true_cost import (
    compute_marketer_profitability,
    compute_product_profitability,
    compute_returns_analysis,
)


class TestTrueCostEngine:
    """Validates True-Cost Margin calculations against July 2026 benchmark standards."""

    def test_inventory_and_returns_parsing(self, parsed_data):
        leaf_costs = parsed_data["leaf_costs"]
        returns_df = parsed_data["returns_df"]

        # Ensure inventory leaves parsed properly
        assert len(leaf_costs) >= 40
        assert "MALTINA PET 33CL" in leaf_costs
        assert leaf_costs["MALTINA PET 33CL"] == 5200.0
        assert leaf_costs.get("GOLDBERG 60CL") == 8657.0

        # Ensure returns parsed properly
        assert len(returns_df) == 177
        assert "customer" in returns_df.columns
        assert "item_name" in returns_df.columns
        assert "return_value" in returns_df.columns

    def test_product_profitability_benchmarks(self, parsed_data, profile):
        li_df = parsed_data["li_df"]
        inv_df_cost = parsed_data["inv_df_cost"]

        products_df, summary, anomalies = compute_product_profitability(
            line_items_df=li_df,
            df_inventory=inv_df_cost,
            profile=profile,
        )

        # 40 products analyzed
        assert len(products_df) == 40

        # Locate Maltina Pet 33cl
        maltina_rows = products_df[products_df["product_raw"].str.contains("Maltina Pet 33cl", case=False, na=False)]
        assert not maltina_rows.empty
        maltina = maltina_rows.iloc[0]

        assert maltina["cases_sold"] == 10236.0
        assert round(maltina["avg_selling_price"], 2) == 4990.50
        assert maltina["tmp3f5d_cost"] == 5200.0
        assert maltina["revenue"] == 51082710.0
        assert maltina["total_cost"] == 53227200.0
        assert maltina["gross_profit"] == -2144490.0
        assert round(maltina["gross_profit_pct"], 4) == -0.0420

        # Locate Goldberg 60cl
        goldberg_rows = products_df[products_df["product_raw"].str.contains("Goldberg 60cl", case=False, na=False)]
        assert not goldberg_rows.empty
        goldberg = goldberg_rows.iloc[0]

        assert goldberg["cases_sold"] == 3349.0
        assert round(goldberg["avg_selling_price"], 2) == 8786.56
        assert goldberg["tmp3f5d_cost"] == 8657.0
        assert goldberg["revenue"] == 29426205.0
        assert goldberg["total_cost"] == 28992293.0
        assert goldberg["gross_profit"] == 433912.0

        # Total Product Aggregates
        assert summary["total_revenue"] == 174324840.0
        assert summary["total_cost"] == 174260589.0
        assert summary["total_gross_profit"] == 64251.0

    def test_marketer_profitability_benchmarks(self, parsed_data, profile):
        li_df = parsed_data["li_df"]
        inv_df_cost = parsed_data["inv_df_cost"]

        cust_summary_df, cust_details, overall = compute_marketer_profitability(
            line_items_df=li_df,
            df_inventory=inv_df_cost,
            profile=profile,
        )

        assert len(cust_summary_df) == 42

        # Locate Eniola Marketer
        eniola_rows = cust_summary_df[cust_summary_df["customer"].str.contains("Eniola", case=False, na=False)]
        assert not eniola_rows.empty
        eniola = eniola_rows.iloc[0]

        assert eniola["total_revenue"] == 23535615.0
        assert eniola["total_cases_sold"] == 3977.0
        assert eniola["total_cost"] == 24010817.0
        assert eniola["total_gross_profit"] == -475202.0

        # Locate AZ Marketer (consolidated with Emmycee per spec §8)
        az_rows = cust_summary_df[cust_summary_df["customer"].str.contains("AZ", case=False, na=False)]
        assert not az_rows.empty
        az = az_rows.iloc[0]

        assert az["total_revenue"] == 10728965.0
        assert az["total_cases_sold"] == 1391.0
        assert az["total_cost"] == 10812060.0
        assert az["total_gross_profit"] == -83095.0
        assert az["is_marketer"] == True
        assert az["cases_target"] == 6000


    def test_sales_returns_analysis_benchmarks(self, parsed_data, profile):
        returns_df = parsed_data["returns_df"]
        li_df = parsed_data["li_df"]
        gross_sales = float(li_df["quantity"].mul(li_df["rate"]).sum())

        analysis = compute_returns_analysis(
            df_returns=returns_df,
            gross_revenue=gross_sales,
            line_items_df=li_df,
            profile=profile,
        )

        assert analysis["total_returns_value"] == 13955850.0
        assert analysis["product_returns_value"] == 1460600.0
        assert analysis["empties_returns_value"] == 12495250.0
        assert analysis["product_returns_qty"] == 191.0
        assert analysis["empties_returns_qty"] == 7039.0
        assert round(analysis["return_rate"], 4) == 0.0744

        # Verify weekly trend
        weekly = analysis["weekly_trend"]
        assert len(weekly) == 5
        assert [w["week"] for w in weekly] == ["W1", "W2", "W3", "W4", "Tail"]

    def test_customer_product_mix_breakdown(self, parsed_data, profile):
        li_df = parsed_data["li_df"]
        inv_df_cost = parsed_data["inv_df_cost"]

        cust_summary_df, cust_details, overall = compute_marketer_profitability(
            line_items_df=li_df,
            df_inventory=inv_df_cost,
            profile=profile,
        )

        assert "product_mix" in cust_summary_df.columns
        for _, row in cust_summary_df.iterrows():
            pm = row["product_mix"]
            assert isinstance(pm, list)
            if pm:
                # Sum of pct_of_total_cases should be ~100%
                total_pct = sum(item["pct_of_total_cases"] for item in pm)
                assert abs(total_pct - 100.0) < 0.1
                # Total cases in product mix equals total_cases_sold
                total_pm_cases = sum(item["cases_sold"] for item in pm)
                assert total_pm_cases == row["total_cases_sold"]
