import pytest
import pandas as pd
from engine.config import kane_jones_profile
from engine.parser import (
    parse_purchases_sheet,
    parse_purchase_returns_sheet,
    parse_sales_returns_sheet,
    parse_workbook,
    parse_inventory_sheet,
)
from engine.sheet_classifier import classify_workbook_sheets
from engine.true_cost import compute_marketer_profitability, compute_returns_analysis

def test_august_purchases_no_doubling():
    profile = kane_jones_profile()
    file_path = "sample_data/August Sales.xlsx"
    clf = classify_workbook_sheets(file_path, profile)
    
    total, df_purchases, anomalies = parse_purchases_sheet(file_path, profile, clf)
    
    # 28 unique purchase vouchers
    assert len(df_purchases) == 28
    # Exact canonical total: ₦228,566,910.00
    assert total == 228566910.0
    assert df_purchases["amount"].sum() == 228566910.0
    # Header amount must match line items sum per voucher (zero anomalies)
    assert len(anomalies) == 0

def test_august_purchase_returns_no_doubling():
    profile = kane_jones_profile()
    file_path = "sample_data/August Sales.xlsx"
    clf = classify_workbook_sheets(file_path, profile)
    
    total, df_pr, anomalies = parse_purchase_returns_sheet(file_path, profile, clf)
    
    # 21 unique purchase return vouchers
    assert len(df_pr) == 21
    # Exact canonical total: ₦57,945,140.00
    assert total == 57945140.0
    assert df_pr["amount"].sum() == 57945140.0
    assert len(anomalies) == 0

def test_june_purchases_no_doubling():
    profile = kane_jones_profile()
    file_path = "sample_data/jun 1st sales-1.xlsx"
    clf = classify_workbook_sheets(file_path, profile)
    
    total, df_purchases, anomalies = parse_purchases_sheet(file_path, profile, clf)
    
    # 37 unique purchase vouchers
    assert len(df_purchases) == 37
    # Exact canonical total: ₦389,220,670.00
    assert total == 389220670.0
    assert df_purchases["amount"].sum() == 389220670.0
    assert len(anomalies) == 0

def test_june_purchase_returns_no_doubling():
    profile = kane_jones_profile()
    file_path = "sample_data/jun 1st sales-1.xlsx"
    clf = classify_workbook_sheets(file_path, profile)
    
    total, df_pr, anomalies = parse_purchase_returns_sheet(file_path, profile, clf)
    
    # 31 unique purchase return vouchers
    assert len(df_pr) == 31
    # Exact canonical total: ₦49,647,105.00
    assert total == 49647105.0
    assert df_pr["amount"].sum() == 49647105.0
    assert len(anomalies) == 0

def test_august_sales_returns_file_structure():
    profile = kane_jones_profile()
    file_path = "sample_data/August Sales.xlsx"
    clf = classify_workbook_sheets(file_path, profile)
    
    df_returns, anomalies = parse_sales_returns_sheet(file_path, profile, clf)
    
    # Total vouchers in August Sales Returns sheet: 111 transactions, 110 unique voucher numbers
    # (ann-SLR205 appears twice: Row 374: ₦380,000 and Row 378: ₦38,000)
    assert df_returns["voucher_no"].nunique() == 110
    # Total line-item value across the entire month: ₦17,388,420.00 (header sum is ₦17,395,620.00)
    assert abs(df_returns["return_value"].sum() - 17388420.0) < 1.0

def test_az_marketer_consolidation():
    profile = kane_jones_profile()
    file_path = "sample_data/August Sales.xlsx"
    clf = classify_workbook_sheets(file_path, profile)
    
    inv_df, li_df, _ = parse_workbook(file_path, profile, classification_report=clf)
    df_inv, _ = parse_inventory_sheet(file_path, profile, classification_report=clf)
    df_returns, _ = parse_sales_returns_sheet(file_path, profile, classification_report=clf)
    
    cust_tc_df, _, _ = compute_marketer_profitability(
        li_df, df_inv, profile, df_returns=df_returns
    )
    
    # AZ Marketer must exist and Emmycee must be consolidated into AZ Marketer
    az_row = cust_tc_df[cust_tc_df["customer"] == "AZ Marketer"]
    assert len(az_row) == 1
    az = az_row.iloc[0]
    
    # Total combined invoices = 8 (6 AZ + 2 Emmycee)
    assert az["invoices"] == 8
    # Total product cases sold = 1,347 (beverages only, empties filtered)
    assert az["total_cases_sold"] == 1347.0
    # Total product sales revenue = ₦12,664,845.00 (total invoice revenue with empties is ₦14,857,345.00)
    assert abs(az["total_revenue"] - 12664845.0) < 1.0
    # Total consolidated returns = 8 return vouchers, ₦2,143,700.00
    assert az["returns_count"] == 8
    assert abs(az["returns_value"] - 2143700.0) < 1.0
    # Net product revenue = ₦12,664,845.00 - ₦2,143,700.00 = ₦10,521,145.00
    assert abs(az["net_revenue"] - 10521145.0) < 1.0
    
    # Emmycee must NOT exist as a separate marketer row
    emmy_row = cust_tc_df[cust_tc_df["customer"] == "Emmycee"]
    assert len(emmy_row) == 0


def test_shared_date_parsing_recognizes_text_and_datetime():
    from engine.parser import looks_like_date, parse_date_value
    import datetime

    # Valid datetime objects
    dt = datetime.datetime(2026, 8, 1, 0, 0)
    assert looks_like_date(dt) is True
    assert parse_date_value(dt) == dt

    # Valid date-like text strings
    assert looks_like_date("15/08/2026") is True
    assert parse_date_value("15/08/2026") == datetime.datetime(2026, 8, 15, 0, 0)

    assert looks_like_date("13-08-2026") is True
    assert parse_date_value("13-08-2026") == datetime.datetime(2026, 8, 13, 0, 0)

    assert looks_like_date("2026-08-01") is True
    assert parse_date_value("2026-08-01") == datetime.datetime(2026, 8, 1, 0, 0)

    # Invalid / non-date strings must return False and not be treated as dates
    assert looks_like_date(None) is False
    assert looks_like_date("") is False
    assert looks_like_date("   ") is False
    assert looks_like_date("TOTAL (28 transactions)") is False
    assert looks_like_date("TOTAL") is False
    assert looks_like_date("ITEM/SERVICE") is False
    assert looks_like_date("Heineken Bottle 60cl") is False


def test_august_sheets_text_dates_not_skipped():
    profile = kane_jones_profile()
    file_path = "sample_data/August Sales.xlsx"
    clf = classify_workbook_sheets(file_path, profile)

    # 1. Purchases: 15 real Excel dates + 13 text dates ('15/08/2026', etc.) = 28 vouchers
    _, df_purchases, _ = parse_purchases_sheet(file_path, profile, clf)
    assert len(df_purchases) == 28
    assert df_purchases["date"].str.startswith("2026-08").all()
    assert pd.to_datetime(df_purchases["date"]).notna().all()

    # 2. Purchase Returns: 9 real Excel dates + 12 text dates = 21 vouchers
    _, df_pr, _ = parse_purchase_returns_sheet(file_path, profile, clf)
    assert len(df_pr) == 21
    assert df_pr["date"].str.startswith("2026-08").all()
    assert pd.to_datetime(df_pr["date"]).notna().all()

    # 3. Sales Returns: 33 real Excel dates + 78 text dates = 111 vouchers
    df_returns, _ = parse_sales_returns_sheet(file_path, profile, clf)
    assert df_returns["voucher_no"].nunique() == 110
    assert len(df_returns) == 180
    assert df_returns["date"].str.startswith("2026-08").all()
    assert pd.to_datetime(df_returns["date"]).notna().all()

    # 4. Sales Invoices: 99 real Excel dates + 199 text dates = 298 invoices
    inv_df, _, _ = parse_workbook(file_path, profile, classification_report=clf)
    assert len(inv_df) == 298
    assert inv_df["date"].dt.month.eq(8).all()
    assert inv_df["date"].notna().all()


def test_returns_weekly_trend_includes_all_transactions():
    profile = kane_jones_profile()
    file_path = "sample_data/August Sales.xlsx"
    clf = classify_workbook_sheets(file_path, profile)

    df_returns, _ = parse_sales_returns_sheet(file_path, profile, clf)
    analysis = compute_returns_analysis(df_returns, 207898525.0, None, profile)

    weekly = analysis["weekly_trend"]
    total_txns = sum(w["return_transactions"] for w in weekly)
    assert total_txns == 110  # 110 unique return vouchers across all weeks
    assert [w["week"] for w in weekly] == ["W1", "W2", "W3", "W4", "Tail"]
    assert weekly[0]["return_transactions"] > 0
    assert weekly[1]["return_transactions"] > 0
    assert weekly[2]["return_transactions"] > 0
    assert weekly[3]["return_transactions"] > 0
    assert weekly[4]["return_transactions"] > 0

