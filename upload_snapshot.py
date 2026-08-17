"""
CLI Utility to run the full Kane-Jones depot sales analysis locally
and automatically publish the audit snapshot to Supabase.

Usage:
    python upload_snapshot.py sample_data/July_sales_report_v6.xlsx --client-id kane-jones --period 2026-07 --title "July 2026 Full Audit"
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
import pandas as pd

from engine.sheet_classifier import classify_workbook_sheets
from engine.config import ClientProfile, kane_jones_profile
from engine.parser import parse_inventory_sheet, parse_sales_returns_sheet, parse_workbook
from engine.price_match import load_price_list, match_products
from engine.audit import (
    below_floor_pricing,
    concentration_metrics,
    customer_margin_detail,
    daily_summary,
    dominant_products,
    loss_making_customers,
    loss_making_invoices,
    product_revenue_ranking,
    reconciliation_check,
    volume_tier_audit,
    weekly_summary,
)
from engine.true_cost import (
    compute_marketer_profitability,
    compute_product_profitability,
    compute_returns_analysis,
)
from engine.net_profit import compute_net_profit_bridge, parse_expenses_sheet
from engine.snapshots import (
    save_snapshot,
    save_client_price_list,
    load_client_price_list,
)


def sanitize_val(val):
    if val is None:
        return None
    if isinstance(val, list):
        return [sanitize_val(x) for x in val]
    if isinstance(val, dict):
        return {k: sanitize_val(v) for k, v in val.items()}
    if isinstance(val, (np.integer, int)):
        return int(val)
    if isinstance(val, (np.floating, float)):
        return None if (np.isnan(val) or np.isinf(val)) else float(val)
    if isinstance(val, (np.bool_, bool)):
        return bool(val)
    if hasattr(val, "isoformat"):
        return val.isoformat()
    if pd.isna(val):
        return None
    return str(val) if not isinstance(val, (str, int, float, bool)) else val


def df_to_records(df):
    if df is None or df.empty:
        return []
    clean_df = df.copy()
    for col in clean_df.columns:
        if pd.api.types.is_datetime64_any_dtype(clean_df[col]):
            clean_df[col] = clean_df[col].dt.strftime("%Y-%m-%d")
        elif pd.api.types.is_object_dtype(clean_df[col]):
            clean_df[col] = clean_df[col].apply(
                lambda x: x.isoformat() if hasattr(x, "isoformat") else x
            )
    records = clean_df.to_dict(orient="records")
    return [{k: sanitize_val(v) for k, v in row.items()} for row in records]


def run_manual_upload(
    file_path: str,
    client_id: str = "kane-jones",
    period_label: str = None,
    audit_title: str = None,
    expenses_path: str = None,
):
    print(f"\n=== Running Sales Intelligence Audit for '{file_path}' (Depot: {client_id}) ===")
    
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' not found.")
        sys.exit(1)

    with open(file_path, "rb") as f:
        file_bytes = f.read()

    filename = os.path.basename(file_path)
    profile = kane_jones_profile()
    profile.client_id = client_id

    # 1. Structural Sheet Classification
    print("1. Classifying workbook sheet roles...")
    clf_report = classify_workbook_sheets(file_path, profile)

    # 2. Parse Sales Register
    print("2. Parsing invoice blocks...")
    inv_df, li_df, anomalies_df = parse_workbook(file_path, profile, classification_report=clf_report)

    # 3. Derive Date Range & Effective Period
    min_date = inv_df["date"].min() if not inv_df.empty else None
    max_date = inv_df["date"].max() if not inv_df.empty else None
    date_range = {
        "start": min_date.strftime("%Y-%m-%d") if pd.notna(min_date) else None,
        "end": max_date.strftime("%Y-%m-%d") if pd.notna(max_date) else None,
    }

    effective_period = period_label
    if not effective_period:
        if date_range["start"]:
            effective_period = date_range["start"][:7]
        else:
            clean_fn = re.sub(r'(?i)\.xlsx?$', '', filename).strip()
            effective_period = clean_fn or "Uploaded Period"

    effective_title = audit_title or f"{effective_period} Full Audit"

    # 4. Load & Resolve Price List
    print("3. Resolving price list...")
    try:
        price_df = load_price_list(file_path, profile, classification_report=clf_report)
    except Exception:
        price_df = pd.DataFrame(columns=["sku", "distributor_price", "sub_distributor_price", "retail_price"])

    has_current_price_list = price_df is not None and not price_df.empty and len(price_df.dropna(subset=["distributor_price"])) > 0

    if has_current_price_list:
        price_list_source = "current"
        price_list_source_period = effective_period
        price_list_message = f"Using official price list from {effective_period}"
        save_client_price_list(profile.client_id, effective_period, price_df)
    else:
        cached_pl = load_client_price_list(profile.client_id)
        if cached_pl is not None:
            price_df, carried_from = cached_pl
            price_list_source = "carried_forward"
            price_list_source_period = carried_from
            price_list_message = f"Using price list carried over from {carried_from} (no updated price list found for {effective_period})"
        else:
            price_df = pd.DataFrame(columns=["sku", "distributor_price", "sub_distributor_price", "retail_price"])
            price_list_source = "none"
            price_list_source_period = None
            price_list_message = f"No price list available for this period ({effective_period})"

    has_price_list = price_df is not None and not price_df.empty and len(price_df.dropna(subset=["distributor_price"])) > 0

    # 5. Product Matching & Core Audits
    print("4. Fuzzy matching line items against price list...")
    matched_df = match_products(li_df, price_df, profile)

    print("5. Computing audits & leakage metrics...")
    bfp_df = below_floor_pricing(matched_df, profile)
    volume_df = volume_tier_audit(matched_df, profile)
    daily_df = daily_summary(inv_df)
    weekly_df = weekly_summary(daily_df)
    prod_rank_df = product_revenue_ranking(matched_df, profile)
    cust_margin_df = customer_margin_detail(inv_df)
    conc_metrics = concentration_metrics(prod_rank_df)
    rec_check_df = reconciliation_check(inv_df, li_df, profile)
    loss_inv_df = loss_making_invoices(inv_df)
    loss_cust_df = loss_making_customers(cust_margin_df)
    dominant_prod_df = dominant_products(prod_rank_df, profile)

    total_revenue = float(inv_df["gross_revenue"].sum()) if not inv_df.empty else 0.0
    total_gross_profit = float(inv_df["gross_profit"].sum()) if not inv_df.empty else 0.0
    overall_margin_pct = float(total_gross_profit / total_revenue) if total_revenue > 0 else 0.0

    unique_match_rows = matched_df[
        ["product_raw", "matched_sku", "match_score", "match_method"]
    ].drop_duplicates()
    match_method_counts = unique_match_rows["match_method"].value_counts().to_dict()
    unmatched_products = (
        unique_match_rows[unique_match_rows["match_method"] == "unmatched"]["product_raw"]
        .dropna()
        .tolist()
    )

    match_quality = {
        "total_products": int(len(unique_match_rows)),
        "counts": {
            "exact": int(match_method_counts.get("exact", 0)),
            "fuzzy": int(match_method_counts.get("fuzzy", 0)),
            "manual_override": int(match_method_counts.get("manual_override", 0)),
            "fuzzy_no_size_match": int(match_method_counts.get("fuzzy_no_size_match", 0)),
            "unmatched": int(match_method_counts.get("unmatched", 0)),
        },
        "unmatched_products": unmatched_products,
    }

    total_leakage = float(bfp_df["revenue_opportunity"].sum()) if not bfp_df.empty else 0.0
    reconciled_invoices_count = int(len(inv_df)) - int(len(rec_check_df))
    underpriced_count = int((volume_df["audit_result"] == "underpriced").sum()) if not volume_df.empty else 0
    overpriced_count = int((volume_df["audit_result"] == "overpriced").sum()) if not volume_df.empty else 0
    correct_count = int((volume_df["audit_result"] == "correct").sum()) if not volume_df.empty else 0
    vol_rev_impact = float(volume_df["revenue_impact"].sum()) if not volume_df.empty else 0.0

    # 6. Parse Inventory & Returns Sheets
    print("6. Parsing inventory costs and returns vouchers...")
    df_inv, inv_anomalies = parse_inventory_sheet(file_path, profile, classification_report=clf_report)
    df_returns, ret_anomalies = parse_sales_returns_sheet(file_path, profile, classification_report=clf_report)

    # 7. Operating Expenses
    expenses_total = 0.0
    df_expenses = pd.DataFrame()
    exp_anomalies = []
    if expenses_path and os.path.exists(expenses_path):
        expenses_total, df_expenses, exp_anomalies = parse_expenses_sheet(expenses_path, profile)
    else:
        expenses_total, df_expenses, exp_anomalies = parse_expenses_sheet(file_path, profile, classification_report=clf_report)

    true_cost_products = []
    true_cost_marketers = []
    returns_analysis = {
        "total_returns_value": 0.0,
        "product_returns_value": 0.0,
        "empties_returns_value": 0.0,
        "return_rate": 0.0,
        "items_breakdown": [],
        "customers_breakdown": [],
        "anomalies": [],
    }

    if not df_inv.empty:
        prod_true_cost_df, prod_tc_summary, prod_tc_anom = compute_product_profitability(li_df, df_inv, profile)
        true_cost_products = df_to_records(prod_true_cost_df)
        cust_tc_df, cust_tc_prod_map, cust_tc_summary = compute_marketer_profitability(li_df, df_inv, profile)
        true_cost_marketers = df_to_records(cust_tc_df)

    if not df_returns.empty:
        returns_analysis = compute_returns_analysis(df_returns, total_revenue, li_df, profile)

    # 8. Net Profit Bridge
    print("7. Computing Net Profit Bridge...")
    net_profit_bridge = compute_net_profit_bridge(
        inv_df,
        li_df,
        df_returns if not df_returns.empty else pd.DataFrame(),
        expenses_total=expenses_total,
        df_inv=df_inv if not df_inv.empty else None,
        profile=profile,
    )

    all_anomalies_list = df_to_records(anomalies_df)
    if inv_anomalies:
        all_anomalies_list.extend(inv_anomalies)
    if ret_anomalies:
        all_anomalies_list.extend(ret_anomalies)
    if exp_anomalies:
        all_anomalies_list.extend(exp_anomalies)
    if returns_analysis.get("anomalies"):
        all_anomalies_list.extend(returns_analysis["anomalies"])
    if net_profit_bridge.get("missing_cost_anomalies"):
        all_anomalies_list.extend(net_profit_bridge["missing_cost_anomalies"])

    response_payload = {
        "meta": {
            "client_id": profile.client_id,
            "client_display_name": profile.display_name,
            "period_label": effective_period,
            "audit_title": effective_title,
            "currency_symbol": profile.currency_symbol,
            "total_revenue": total_revenue,
            "total_gross_profit": total_gross_profit,
            "overall_margin_pct": overall_margin_pct,
            "date_range": date_range,
            "total_invoices": int(len(inv_df)),
            "total_anomalies": int(len(all_anomalies_list)),
            "total_recoverable_leakage": total_leakage,
            "has_price_list": has_price_list,
            "price_list_source": price_list_source,
            "price_list_source_period": price_list_source_period,
            "price_list_status": price_list_message,
            "price_list_message": price_list_message,
            "below_floor_items_count": int(len(bfp_df)),
            "reconciled_invoices_count": reconciled_invoices_count,
            "reconciliation_discrepancies_count": int(len(rec_check_df)),
            "loss_making_invoices_count": int(len(loss_inv_df)),
            "loss_making_customers_count": int(len(loss_cust_df)),
            "dominant_products_count": int(len(dominant_prod_df)),
            "volume_tier_counts": {
                "total": int(len(volume_df)),
                "underpriced": underpriced_count,
                "overpriced": overpriced_count,
                "correct": correct_count,
                "total_revenue_impact": vol_rev_impact,
            },
        },
        "audit_title": effective_title,
        "match_quality": match_quality,
        "anomalies": all_anomalies_list,
        "reconciliation_discrepancies": df_to_records(rec_check_df),
        "loss_making_invoices": df_to_records(loss_inv_df),
        "loss_making_customers": df_to_records(loss_cust_df),
        "dominant_products": df_to_records(dominant_prod_df),
        "below_floor_pricing": df_to_records(bfp_df),
        "volume_tier_audit": df_to_records(volume_df),
        "daily_summary": df_to_records(daily_df),
        "weekly_summary": df_to_records(weekly_df),
        "product_ranking": df_to_records(prod_rank_df),
        "customer_margin": df_to_records(cust_margin_df),
        "concentration_metrics": conc_metrics,
        "true_cost_products": true_cost_products,
        "true_cost_marketers": true_cost_marketers,
        "returns_analysis": returns_analysis,
        "net_profit_bridge": net_profit_bridge,
        "expenses": df_to_records(df_expenses),
        "expenses_total": expenses_total,
    }

    summary = {
        "period_label": effective_period,
        "audit_title": effective_title,
        "total_revenue": total_revenue,
        "total_gross_profit": total_gross_profit,
        "overall_margin_pct": overall_margin_pct,
        "total_invoices": int(len(inv_df)),
        "total_recoverable_leakage": total_leakage,
        "below_floor_items_count": int(len(bfp_df)),
        "loss_making_customers_count": int(len(loss_cust_df)),
        "currency_symbol": profile.currency_symbol,
        "date_range": date_range,
    }

    print("\n8. Publishing audit snapshot to Supabase...")
    ok = save_snapshot(
        client_id=client_id,
        period_label=effective_period,
        data=response_payload,
        file_bytes=file_bytes,
        filename=filename,
    )

    if ok:
        print("\n============================================================")
        print("  SUCCESS! Audit snapshot uploaded to Supabase.")
        print(f"  Depot:                     {client_id}")
        print(f"  Period:                    {effective_period}")
        print(f"  Gross Sales Revenue:       ₦{total_revenue:,.2f}")
        print(f"  Total Sales Returns:     - ₦{net_profit_bridge.get('total_sales_returns', 0):,.2f}")
        print(f"  Net Sales Revenue:       = ₦{net_profit_bridge.get('net_sales_revenue', 0):,.2f}")
        print(f"  Gross Embedded COGS:       ₦{net_profit_bridge.get('gross_embedded_cost', 0):,.2f}")
        print(f"  Cost of Returns Credit:  + ₦{net_profit_bridge.get('cost_of_returns', 0):,.2f}")
        print(f"  Net Invoiced COGS:       - ₦{net_profit_bridge.get('total_cost', 0):,.2f}")
        print(f"  Net Gross Profit:        = ₦{net_profit_bridge.get('net_gross_profit_loss', 0):,.2f}")
        print(f"  Total Operating Expenses:- ₦{net_profit_bridge.get('total_operating_expenses', 0):,.2f}")
        print(f"  Net Operating Loss:      = ₦{net_profit_bridge.get('net_operating_profit_loss', 0):,.2f}")
        print(f"  Recoverable Leakage:       ₦{total_leakage:,.2f} ({len(bfp_df)} items)")
        print("============================================================")
        print("Open your live dashboard at https://kane-jones-engine.vercel.app/app to view the results!")
    else:
        print("Error saving snapshot to Supabase.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Upload & Audit Depot Sales Register to Supabase")
    parser.add_argument("file", help="Path to raw Excel workbook (.xlsx)")
    parser.add_argument("--client-id", default="kane-jones", help="Depot Client Identifier (default: kane-jones)")
    parser.add_argument("--period", default=None, help="Period label (e.g. 2026-07)")
    parser.add_argument("--title", default=None, help="Human readable audit title")
    parser.add_argument("--expenses", default=None, help="Optional separate expenses workbook (.xlsx)")

    args = parser.parse_args()
    run_manual_upload(
        file_path=args.file,
        client_id=args.client_id,
        period_label=args.period,
        audit_title=args.title,
        expenses_path=args.expenses,
    )
