import os
import sys
import tempfile
import traceback
import urllib.parse
from typing import Any, Dict, List, Optional

# Add project root to sys.path so engine modules are importable in serverless environment
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from engine.sheet_classifier import classify_workbook_sheets
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
from engine.compare import compare_periods
from engine.config import ClientProfile, kane_jones_profile
from engine.parser import parse_inventory_sheet, parse_sales_returns_sheet, parse_workbook
from engine.price_match import load_price_list, match_products
from engine.report import generate_report_pdf
from engine.presentation import generate_presentation_pptx
from engine.snapshots import (
    list_snapshots,
    list_snapshots_summary,
    load_snapshot,
    save_snapshot,
    save_client_price_list,
    load_client_price_list,
)
from engine.true_cost import (
    compute_marketer_profitability,
    compute_product_profitability,
    compute_returns_analysis,
)
from engine.net_profit import compute_net_profit_bridge, parse_expenses_sheet

app = FastAPI(
    title="Depot Sales Intelligence Engine API",
    description="Stateless analysis service for beverage depot sales registers, audits, and period-over-period comparisons.",
    version="0.2.0",
)

# Enable CORS for Next.js frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_profile(client_id: str) -> ClientProfile:
    """Loads ClientProfile from clients/<client_id>/profile.json or defaults to standard Kane-Jones profile."""
    profile_path = os.path.join("clients", client_id, "profile.json")
    if os.path.exists(profile_path):
        try:
            return ClientProfile.from_json(profile_path)
        except Exception as e:
            raise HTTPException(
                status_code=422,
                detail=f"Failed to load client profile from '{profile_path}': {str(e)}",
            )

    # Default to standard FMCG profile for newly registered depots
    prof = kane_jones_profile()
    prof.client_id = client_id
    return prof



def sanitize_val(val: Any) -> Any:
    """Recursively converts numpy types, NaN/inf, and date objects into JSON-safe types."""
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


def df_to_records(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Converts a pandas DataFrame into a list of clean, JSON-serializable dictionaries."""
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


@app.get("/")
@app.get("/api")
@app.get("/api/")
@app.get("/health")
@app.get("/api/health")
def health_check():
    """Health check endpoint to verify API service status."""
    return {"status": "ok", "service": "depot-sales-intelligence-engine"}


@app.post("/analyze")
@app.post("/api/analyze")
@app.post("/api/index/analyze")
@app.post("/api/index")
async def analyze_sales_report(
    file: UploadFile = File(..., description="Raw Excel workbook (.xlsx)"),
    expenses_file: Optional[UploadFile] = File(None, description="Optional separate operating expenses workbook (.xlsx)"),
    client_id: str = Form("kane-jones", description="Client identifier"),
    period_label: Optional[str] = Form(None, description="Optional period label (e.g. '2026-07'). Derived automatically if omitted."),
    audit_title: Optional[str] = Form(None, description="Optional human-readable title (e.g. 'July 2026 Full Audit')"),
    # The 7 ledger inputs below cannot be derived from the sales register alone.
    # If not supplied, they default to 0.0 and will appear in the response
    # net_profit_bridge.missing_accounting_fields list so the UI can warn the user.
    purchases: Optional[float] = Form(None, description="Total purchases from supplier ledger (₦)"),
    purchase_returns: Optional[float] = Form(None, description="Purchase returns / credit notes from supplier (₦)"),
    carriage_inwards: Optional[float] = Form(None, description="Inbound freight / carriage on purchases, included in COGS (₦)"),
    carriage_outwards: Optional[float] = Form(None, description="Outbound delivery costs, classified as OPEX (₦)"),
    opening_inventory: Optional[float] = Form(None, description="Opening stock value at start of period (₦)"),
    closing_inventory: Optional[float] = Form(None, description="Closing stock value at end of period (₦)"),
    other_income: Optional[float] = Form(None, description="Non-operating income (e.g. rebates, interest received) (₦)"),
    finance_costs: Optional[float] = Form(None, description="Interest expense / bank charges on borrowings (₦)"),
):
    """Parses a depot's sales spreadsheet, fuzzy-matches line items against the price list,
    runs all pricing, volume tier, trend, true-cost, and net profit bridge audits, and persists a period snapshot.
    Supports either in-workbook expenses sheets or a separately uploaded expenses workbook.
    """
    if not file.filename.lower().endswith((".xlsx", ".xlsm", ".xltx", ".xltm")):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid file format for '{file.filename}'. Please upload an Excel workbook (.xlsx).",
        )

    profile = load_profile(client_id)

    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        tmp_path = tmp.name
        try:
            content = await file.read()
            tmp.write(content)
        except Exception as e:
            raise HTTPException(
                status_code=422,
                detail=f"Failed to read uploaded file '{file.filename}': {str(e)}",
            )

    exp_tmp_path = None
    if expenses_file is not None and expenses_file.filename:
        with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as exp_tmp:
            exp_tmp_path = exp_tmp.name
            try:
                exp_content = await expenses_file.read()
                exp_tmp.write(exp_content)
            except Exception as e:
                raise HTTPException(
                    status_code=422,
                    detail=f"Failed to read uploaded expenses file '{expenses_file.filename}': {str(e)}",
                )

    try:
        # Dynamic structural sheet role classification
        classification_report = classify_workbook_sheets(tmp_path, profile)

        try:
            inv_df, li_df, anomalies_df = parse_workbook(tmp_path, profile, classification_report=classification_report)
        except ValueError as e:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Workbook parsing failed: {str(e)}. "
                    f"Profile '{client_id}' expected raw sheets {profile.raw_data_sheets}."
                ),
            )
        except Exception as e:
            raise HTTPException(
                status_code=422,
                detail=f"Unexpected parsing error in workbook '{file.filename}': {str(e)}",
            )

        # 1. Derive date range and effective period from invoices
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
                clean_fn = re.sub(r'(?i)\.xlsx?$', '', file.filename).strip()
                effective_period = clean_fn or "Uploaded Period"

        effective_title = audit_title or f"{effective_period} Full Audit"

        # 2. Load Price List (current workbook -> carry-forward fallback -> graceful empty)
        try:
            price_df = load_price_list(tmp_path, profile, classification_report=classification_report)
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

        try:
            matched_df = match_products(li_df, price_df, profile)
        except Exception as e:
            raise HTTPException(
                status_code=422,
                detail=f"Error during product-to-price-list matching: {str(e)}",
            )

        try:
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
        except Exception as e:
            raise HTTPException(
                status_code=422,
                detail=f"Error computing audit metrics: {str(e)}",
            )

        total_revenue = float(inv_df["gross_revenue"].sum()) if not inv_df.empty else 0.0
        total_gross_profit = float(inv_df["gross_profit"].sum()) if not inv_df.empty else 0.0
        overall_margin_pct = (
            float(total_gross_profit / total_revenue) if total_revenue > 0 else 0.0
        )

        unique_match_rows = matched_df[
            ["product_raw", "matched_sku", "match_score", "match_method"]
        ].drop_duplicates()
        match_method_counts = unique_match_rows["match_method"].value_counts().to_dict()
        unmatched_products = (
            unique_match_rows[unique_match_rows["match_method"] == "unmatched"][
                "product_raw"
            ]
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

        # True-cost, Operating Expenses, and Net Profit Analysis
        df_inv, inv_anomalies = parse_inventory_sheet(tmp_path, profile, classification_report=classification_report)
        df_returns, ret_anomalies = parse_sales_returns_sheet(tmp_path, profile, classification_report=classification_report)

        # Parse operating expenses from either separate uploaded file or in-workbook sheets
        expenses_total = 0.0
        df_expenses = pd.DataFrame()
        exp_anomalies = []
        if exp_tmp_path and os.path.exists(exp_tmp_path):
            expenses_total, df_expenses, exp_anomalies = parse_expenses_sheet(exp_tmp_path, profile)
        else:
            expenses_total, df_expenses, exp_anomalies = parse_expenses_sheet(tmp_path, profile, classification_report=classification_report)

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
            cust_tc_df, cust_tc_prod_map, cust_tc_summary = compute_marketer_profitability(
                li_df, df_inv, profile, df_expenses=df_expenses
            )
            true_cost_marketers = df_to_records(cust_tc_df)


        if not df_returns.empty:
            returns_analysis = compute_returns_analysis(df_returns, total_revenue, li_df, profile)

        # Compute net profit bridge unconditionally for all periods
        net_profit_bridge = compute_net_profit_bridge(
            inv_df,
            li_df,
            df_returns if not df_returns.empty else pd.DataFrame(),
            expenses_total=expenses_total,
            df_inv=df_inv if not df_inv.empty else None,
            profile=profile,
            # Fix A: Pass the 7 ledger inputs from form fields.
            # None means "not supplied by caller" → tracked in missing_accounting_fields.
            purchases=purchases,
            purchase_returns=purchase_returns,
            carriage_inwards=carriage_inwards,
            carriage_outwards=carriage_outwards,
            opening_inventory=opening_inventory,
            closing_inventory=closing_inventory,
            other_income=other_income,
            finance_costs=finance_costs,
        )

        # Merge all anomalies
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
            "product_revenue_ranking": df_to_records(prod_rank_df),
            "customer_margin_detail": df_to_records(cust_margin_df),
            "concentration_metrics": {
                k: sanitize_val(v) for k, v in conc_metrics.items()
            },
            "true_cost_products": true_cost_products,
            "true_cost_marketers": true_cost_marketers,
            "returns_analysis": returns_analysis,
            "expenses_analysis": {
                "total_expenses": expenses_total,
                "categories": df_to_records(df_expenses) if not df_expenses.empty else [],
            },
            "net_profit_bridge": net_profit_bridge,
            "sheet_classification": classification_report.to_dict(),
        }

        try:
            save_snapshot(
                profile.client_id,
                effective_period,
                response_payload,
                file_bytes=content,
                filename=file.filename,
            )
        except Exception:
            pass

        return response_payload

    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass
        if exp_tmp_path and os.path.exists(exp_tmp_path):
            try:
                os.remove(exp_tmp_path)
            except Exception:
                pass


@app.get("/compare")
@app.get("/api/compare")
def compare_snapshots_get(
    client_id: str = Query("kane-jones", description="Client identifier"),
    period_a: str = Query("2026-07", description="Baseline period label or snapshot"),
    period_b: str = Query("2026-07", description="Comparison period label or snapshot"),
    granularity: str = Query("day", description="'day', 'week', or 'month'"),
    key_a: Optional[str] = Query(None, description="Date or week for period A"),
    key_b: Optional[str] = Query(None, description="Date or week for period B"),
):
    """GET endpoint to compare periods (day-vs-day, week-vs-week, month-vs-month)."""
    return run_comparison(client_id, period_a, period_b, granularity, key_a, key_b)


@app.post("/compare")
@app.post("/api/compare")
def compare_snapshots_post(
    client_id: str = Form("kane-jones"),
    period_a: str = Form("2026-07"),
    period_b: str = Form("2026-07"),
    granularity: str = Form("day"),
    key_a: Optional[str] = Form(None),
    key_b: Optional[str] = Form(None),
):
    """POST endpoint to compare periods."""
    return run_comparison(client_id, period_a, period_b, granularity, key_a, key_b)


def run_comparison(
    client_id: str,
    period_a: str,
    period_b: str,
    granularity: str,
    key_a: Optional[str] = None,
    key_b: Optional[str] = None,
):
    try:
        snap_a = load_snapshot(client_id, period_a)
        snap_b = load_snapshot(client_id, period_b)
    except FileNotFoundError as e:
        # If snapshot not saved yet, try to analyze default sample data on the fly
        if client_id == "kane-jones" and os.path.exists("sample_data/July_sales_report_v4.xlsx"):
            try:
                prof = kane_jones_profile()
                inv_df, li_df, anom_df = parse_workbook("sample_data/July_sales_report_v4.xlsx", prof)
                pr_df = load_price_list("sample_data/July_sales_report_v4.xlsx", prof)
                m_df = match_products(li_df, pr_df, prof)
                daily_df = daily_summary(inv_df)
                weekly_df = weekly_summary(daily_df)
                prod_rank = product_revenue_ranking(m_df, prof)
                cust_det = customer_margin_detail(inv_df)
                snap = {
                    "meta": {
                        "client_id": prof.client_id,
                        "client_display_name": prof.display_name,
                        "currency_symbol": prof.currency_symbol,
                        "total_revenue": float(inv_df["gross_revenue"].sum()),
                        "total_gross_profit": float(inv_df["gross_profit"].sum()),
                        "overall_margin_pct": float(inv_df["gross_profit"].sum() / inv_df["gross_revenue"].sum()),
                        "total_invoices": len(inv_df),
                    },
                    "daily_summary": df_to_records(daily_df),
                    "weekly_summary": df_to_records(weekly_df),
                    "product_ranking": df_to_records(prod_rank),
                    "customer_margin_detail": df_to_records(cust_det),
                }
                save_snapshot(client_id, "2026-07", snap)
                snap_a = snap
                snap_b = snap
            except Exception as inner_e:
                raise HTTPException(status_code=404, detail=f"Snapshot not found and live generation failed: {str(inner_e)}")
        else:
            raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to load snapshots: {str(e)}")

    profile = load_profile(client_id)
    return compare_periods(
        snap_a,
        snap_b,
        granularity=granularity,
        key_a=key_a,
        key_b=key_b,
        currency_symbol=profile.currency_symbol,
    )


@app.get("/snapshots")
@app.get("/api/snapshots")
def get_client_snapshots(client_id: str = Query("kane-jones")):
    """Returns list of available snapshot summaries for month slots on home page."""
    return {
        "client_id": client_id,
        "snapshots": list_snapshots_summary(client_id),
        "period_labels": list_snapshots(client_id),
    }


@app.get("/snapshot")
@app.get("/api/snapshot")
@app.get("/snapshots/{period_label}")
@app.get("/api/snapshots/{period_label}")
def get_snapshot_by_label(
    period_label: Optional[str] = None,
    client_id: str = Query("kane-jones"),
):
    """Returns full analysis snapshot for a given period_label."""
    target_label = period_label or "2026-07"
    try:
        data = load_snapshot(client_id, target_label)
        return data
    except FileNotFoundError:
        # Fallback to analyzing sample data for July if not on disk
        if client_id == "kane-jones" and os.path.exists("sample_data/July_sales_report_v4.xlsx"):
            profile = kane_jones_profile()
            inv_df, li_df, anomalies_df = parse_workbook("sample_data/July_sales_report_v4.xlsx", profile)
            price_df = load_price_list("sample_data/July_sales_report_v4.xlsx", profile)
            matched_df = match_products(li_df, price_df, profile)
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

            unique_match_rows = matched_df[
                ["product_raw", "matched_sku", "match_score", "match_method"]
            ].drop_duplicates()
            match_method_counts = unique_match_rows["match_method"].value_counts().to_dict()
            unmatched_products = (
                unique_match_rows[unique_match_rows["match_method"] == "unmatched"][
                    "product_raw"
                ]
                .dropna()
                .tolist()
            )

            total_revenue = float(inv_df["gross_revenue"].sum())
            total_gross_profit = float(inv_df["gross_profit"].sum())
            total_leakage = float(bfp_df["revenue_opportunity"].sum()) if not bfp_df.empty else 0.0
            reconciled_invoices_count = int(len(inv_df)) - int(len(rec_check_df))
            underpriced_count = int((volume_df["audit_result"] == "underpriced").sum()) if not volume_df.empty else 0
            overpriced_count = int((volume_df["audit_result"] == "overpriced").sum()) if not volume_df.empty else 0
            correct_count = int((volume_df["audit_result"] == "correct").sum()) if not volume_df.empty else 0
            vol_rev_impact = float(volume_df["revenue_impact"].sum()) if not volume_df.empty else 0.0

            payload = {
                "meta": {
                    "client_id": profile.client_id,
                    "client_display_name": profile.display_name,
                    "period_label": target_label,
                    "audit_title": f"{target_label} Full Audit",
                    "currency_symbol": profile.currency_symbol,
                    "total_revenue": total_revenue,
                    "total_gross_profit": total_gross_profit,
                    "overall_margin_pct": float(total_gross_profit / total_revenue) if total_revenue > 0 else 0.0,
                    "date_range": {
                        "start": "2026-07-01",
                        "end": "2026-07-31",
                    },
                    "total_invoices": int(len(inv_df)),
                    "total_anomalies": int(len(anomalies_df)),
                    "total_recoverable_leakage": total_leakage,
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
                "audit_title": f"{target_label} Full Audit",
                "match_quality": {
                    "total_products": int(len(unique_match_rows)),
                    "counts": {
                        "exact": int(match_method_counts.get("exact", 0)),
                        "fuzzy": int(match_method_counts.get("fuzzy", 0)),
                        "manual_override": int(match_method_counts.get("manual_override", 0)),
                        "fuzzy_no_size_match": int(match_method_counts.get("fuzzy_no_size_match", 0)),
                        "unmatched": int(match_method_counts.get("unmatched", 0)),
                    },
                    "unmatched_products": unmatched_products,
                },
                "anomalies": df_to_records(anomalies_df),
                "reconciliation_discrepancies": df_to_records(rec_check_df),
                "loss_making_invoices": df_to_records(loss_inv_df),
                "loss_making_customers": df_to_records(loss_cust_df),
                "dominant_products": df_to_records(dominant_prod_df),
                "below_floor_pricing": df_to_records(bfp_df),
                "volume_tier_audit": df_to_records(volume_df),
                "daily_summary": df_to_records(daily_df),
                "weekly_summary": df_to_records(weekly_df),
                "product_revenue_ranking": df_to_records(prod_rank_df),
                "customer_margin_detail": df_to_records(cust_margin_df),
                "concentration_metrics": {
                    k: sanitize_val(v) for k, v in conc_metrics.items()
                },
            }
            save_snapshot(client_id, target_label, payload)
            return payload
        raise HTTPException(status_code=404, detail=f"Snapshot '{target_label}' not found.")


@app.delete("/snapshots")
@app.delete("/api/snapshots")
@app.delete("/snapshots/{period_label}")
@app.delete("/api/snapshots/{period_label}")
def delete_audit_snapshot_endpoint(
    period_label: Optional[str] = None,
    period: Optional[str] = Query(None, alias="period_label", description="Period label of audit to delete (e.g. '2026-07')"),
    client_id: str = Query("kane-jones", description="Client identifier / depot slug"),
):
    """Deletes an audit snapshot from Supabase DB, storage, and local cache."""
    target_label = period_label or period
    if not target_label:
        raise HTTPException(status_code=400, detail="Missing required parameter 'period_label'.")

    from engine.snapshots import delete_snapshot
    success = delete_snapshot(client_id=client_id, period_label=target_label)
    return {
        "status": "ok" if success else "error",
        "client_id": client_id,
        "period_label": target_label,
        "deleted": success,
    }


@app.post("/snapshots/rename")
@app.post("/api/snapshots/rename")
@app.post("/audits/rename")
@app.post("/api/audits/rename")
def rename_audit_endpoint(
    client_id: str = Form("kane-jones"),
    period_label: str = Form(...),
    new_audit_title: str = Form(...),
):
    """Renames an audit snapshot title in Supabase DB and local cache."""
    from engine.snapshots import rename_audit_snapshot
    success = rename_audit_snapshot(
        client_id=client_id,
        period_label=period_label,
        new_audit_title=new_audit_title,
    )
    return {
        "status": "ok" if success else "error",
        "client_id": client_id,
        "period_label": period_label,
        "new_audit_title": new_audit_title,
        "updated": success,
    }


@app.get("/report")
@app.get("/api/report")
def download_audit_report(
    client_id: str = Query("kane-jones", description="Client identifier"),
    period_label: str = Query("2026-07", description="Audit period label (e.g. '2026-07')"),
):
    """
    Generates and returns a PDF report for the specified audit period.

    Loads the existing stored snapshot from Supabase (the same data the dashboard
    reads) and renders it to PDF using ReportLab. NO business logic is re-run;
    every number in the PDF comes directly from the stored payload.
    """
    try:
        payload = load_snapshot(client_id, period_label)
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Snapshot '{period_label}' for client '{client_id}' not found.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load snapshot: {str(e)}",
        )

    try:
        pdf_bytes = generate_report_pdf(payload)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PDF generation failed: {str(e)}",
        )

    # Build a clean filename: e.g. "kane-jones_2026-07_audit_report.pdf"
    safe_client  = client_id.replace(" ", "-").lower()
    safe_period  = period_label.replace(" ", "_")
    filename     = f"{safe_client}_{safe_period}_audit_report.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pdf_bytes)),
        },
    )


@app.get("/report/pptx")
@app.get("/api/report/pptx")
@app.get("/presentation")
@app.get("/api/presentation")
@app.get("/pptx")
@app.get("/api/pptx")
def download_presentation_pptx_endpoint(
    client_id: str = Query("kane-jones", description="Client identifier"),
    period_label: str = Query("2026-07", description="Audit period label (e.g. '2026-07')"),
    module: Optional[str] = Query(None, description="Optional curated module: 'customers', 'products', 'marketers', or 'overview'"),
):
    """
    Generates and returns a PowerPoint presentation (.pptx) report
    for the specified audit period based directly on the stored audit snapshot.
    Supports curated module slide decks per spec §14.
    """
    try:
        payload = load_snapshot(client_id, period_label)
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Snapshot '{period_label}' for client '{client_id}' not found.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load snapshot: {str(e)}",
        )

    try:
        pptx_bytes = generate_presentation_pptx(payload, module=module)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PowerPoint generation failed: {str(e)}",
        )

    safe_client = client_id.replace(" ", "-").lower()
    safe_period = period_label.replace(" ", "_")
    mod_tag = f"_{module}" if module else ""
    filename = f"{safe_client}_{safe_period}{mod_tag}_management_intelligence.pptx"

    return Response(
        content=pptx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pptx_bytes)),
        },
    )


@app.post("/presentation")
@app.post("/api/presentation")
@app.post("/pptx")
@app.post("/api/pptx")
async def generate_presentation_pptx_post(
    payload: Dict[str, Any],
    module: Optional[str] = Query(None),
):
    """
    Renders PowerPoint presentation (.pptx) on-the-fly directly from uploaded JSON payload.
    Supports module="customers" | "products" | "marketers" | "overview".
    """
    try:
        mod = module or payload.get("_ppt_module") or payload.get("module")
        pptx_bytes = generate_presentation_pptx(payload, module=mod)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PowerPoint generation failed: {str(e)}",
        )

    client_id = payload.get("meta", {}).get("client_id", "kane-jones")
    period_label = payload.get("meta", {}).get("period_label", "snapshot")
    safe_client = client_id.replace(" ", "-").lower()
    safe_period = str(period_label).replace(" ", "_")
    mod_tag = f"_{mod}" if mod else ""
    filename = f"{safe_client}_{safe_period}{mod_tag}_management_intelligence.pptx"

    return Response(
        content=pptx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(pptx_bytes)),
        },
    )




from engine.snapshots import check_depot_exists, get_or_create_depot, update_depot

@app.get("/depots/check")
@app.get("/api/depots/check")
def check_depot_endpoint(
    client_id: str = Query(..., description="Client ID / depot slug to check"),
):
    """Checks whether a depot row exists in Supabase database without auto-creating."""
    result = check_depot_exists(client_id=client_id)
    return result


@app.post("/depots/register")
@app.post("/api/depots/register")
def register_depot_endpoint(
    client_id: str = Form(...),
    display_name: str = Form(...),
):
    """Registers or retrieves a depot row in Supabase depots table."""
    depot_id = get_or_create_depot(client_id=client_id, display_name=display_name)
    return {
        "status": "ok",
        "client_id": client_id,
        "display_name": display_name,
        "depot_id": depot_id,
    }


@app.post("/depots/update")
@app.post("/api/depots/update")
def update_depot_endpoint(
    client_id: str = Form(...),
    display_name: str = Form(...),
):
    """Updates display_name of existing depot row in Supabase depots table."""
    success = update_depot(client_id=client_id, display_name=display_name)
    return {
        "status": "ok" if success else "warning",
        "client_id": client_id,
        "display_name": display_name,
        "updated": success,
    }


