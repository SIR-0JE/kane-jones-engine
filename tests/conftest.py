"""
Shared pytest fixtures and test configuration for Depot Sales Engine.
"""

import json
import os
import pytest

from engine.config import kane_jones_profile
from engine.parser import parse_inventory_sheet, parse_sales_returns_sheet, parse_workbook
from engine.price_match import load_price_list
from engine.snapshots import load_snapshot


SAMPLE_V6_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "sample_data",
    "July_sales_report_v6.xlsx",
)

SNAPSHOT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "clients",
    "kane-jones",
    "snapshots",
    "2026-07.json",
)


@pytest.fixture(scope="session")
def profile():
    return kane_jones_profile()


@pytest.fixture(scope="session")
def sample_v6_file():
    if not os.path.exists(SAMPLE_V6_PATH):
        pytest.skip(f"Benchmark file not found at {SAMPLE_V6_PATH}")
    return SAMPLE_V6_PATH


@pytest.fixture(scope="session")
def parsed_data(sample_v6_file, profile):
    """Session fixture that parses the sample workbook once."""
    inv_df, li_df, anom_df = parse_workbook(sample_v6_file, profile)
    sample_v4 = os.path.join(os.path.dirname(sample_v6_file), "July_sales_report_v4.xlsx")
    price_df = load_price_list(sample_v4, profile) if os.path.exists(sample_v4) else None
    inv_df_cost, inv_anoms = parse_inventory_sheet(sample_v6_file, profile)
    returns_df, ret_anoms = parse_sales_returns_sheet(sample_v6_file, profile)
    
    leaf_costs = dict(zip(inv_df_cost["item_name"].str.upper().str.strip(), inv_df_cost["rate_per_unit"]))
    all_costs = dict(zip(inv_df_cost["item_name"].str.upper().str.strip(), inv_df_cost["rate_per_unit"]))

    return {
        "inv_df": inv_df,
        "li_df": li_df,
        "anom_df": anom_df,
        "price_df": price_df,
        "inv_df_cost": inv_df_cost,
        "leaf_costs": leaf_costs,
        "all_costs": all_costs,
        "inv_anoms": inv_anoms,
        "returns_df": returns_df,
        "ret_anoms": ret_anoms,
    }


@pytest.fixture(scope="session")
def stored_snapshot():
    """Loads the canonical stored snapshot for Kane-Jones 2026-07."""
    if not os.path.exists(SNAPSHOT_PATH):
        pytest.skip(f"Snapshot file not found at {SNAPSHOT_PATH}")
    with open(SNAPSHOT_PATH, "r", encoding="utf-8") as f:
        return json.load(f)
