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
