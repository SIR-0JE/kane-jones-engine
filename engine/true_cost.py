"""
True-Cost Profitability Engine for Kane-Jones Depot.

Computes product-level and marketer (customer) level margins using end-of-period
inventory cost basis (from tmp3F5D / RATE PER UNIT) excluding empties, alongside
sales return breakdowns (from tmpCEF3).

Note on Cost Nuance:
tmp3F5D cost represents the current inventory cost as of period end. For SKUs whose
cost changed mid-month (e.g. Goldberg 60cl), tmp3F5D reflects the closing rate.
"""

from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from engine.config import ClientProfile


def build_inventory_cost_maps(df_inventory: pd.DataFrame) -> Tuple[Dict[str, float], Dict[str, float]]:
    """Build normalized lookups for rate_per_unit and default_purchase_price."""
    cost_map = {}
    dpp_map = {}
    if df_inventory is None or df_inventory.empty:
        return cost_map, dpp_map

    for _, row in df_inventory.iterrows():
        name_k = str(row["item_name"]).strip().upper()
        cost_map[name_k] = float(row.get("rate_per_unit", 0.0) or 0.0)
        dpp_map[name_k] = float(row.get("default_purchase_price", 0.0) or 0.0)

    return cost_map, dpp_map


def resolve_sku_cost_maps(
    line_items_df: Optional[pd.DataFrame] = None,
    df_inventory: Optional[pd.DataFrame] = None,
    prefer_inventory: bool = False,
) -> Dict[str, float]:
    """
    Unified canonical cost lookup engine for both sales line items and returns.
    
    Parameters:
    - line_items_df: sales register line items DataFrame containing quantity, rate, and cost.
    - df_inventory: inventory stock valuation DataFrame (tmp3F5D) containing rate_per_unit and default_purchase_price.
    - prefer_inventory: if True (used for Product True Cost view), prioritizes inventory closing rate;
                        if False (used for Net Profit bridge & Returns credit costing), prioritizes invoice-embedded positive unit cost.
    
    Negative cost lines (data entry errors) are strictly filtered out (cost > 0).
    """
    cost_map: Dict[str, float] = {}

    inv_rates: Dict[str, float] = {}
    if df_inventory is not None and not df_inventory.empty:
        for _, row in df_inventory.iterrows():
            k = str(row.get("item_name", "")).strip().upper()
            rate = float(row.get("rate_per_unit", 0.0) or 0.0)
            dpp = float(row.get("default_purchase_price", 0.0) or 0.0)
            if rate > 0:
                inv_rates[k] = rate
            elif dpp > 0:
                inv_rates[k] = dpp

    invoice_unit_costs: Dict[str, float] = {}
    if line_items_df is not None and not line_items_df.empty and "product_raw" in line_items_df.columns:
        for p_name, grp in line_items_df.groupby("product_raw"):
            valid_grp = grp[grp["cost"] > 0]
            if not valid_grp.empty:
                tot_q = valid_grp["quantity"].sum()
                tot_c = valid_grp["cost"].sum()
                if tot_q > 0:
                    invoice_unit_costs[str(p_name).strip().upper()] = tot_c / tot_q

    if prefer_inventory:
        # Inventory first, fallback to invoice
        cost_map.update(invoice_unit_costs)
        cost_map.update(inv_rates)
    else:
        # Invoice first, fallback to inventory
        cost_map.update(inv_rates)
        cost_map.update(invoice_unit_costs)

    return cost_map


def resolve_return_unit_cost(
    item_name: str,
    cost_map: Dict[str, float],
) -> Tuple[Optional[float], Optional[Dict[str, Any]]]:
    """
    Resolves the unit cost for a returned SKU using the shared cost lookup map.
    
    If no positive cost is found in sales invoices or inventory valuation,
    returns (None, anomaly_dict) with exact label 'Missing Cost — Return',
    excluding it from the Cost of Returns total without estimating a replacement value.
    """
    key = str(item_name).strip().upper()
    unit_cost = cost_map.get(key)

    if unit_cost is not None and unit_cost > 0:
        return unit_cost, None

    # Missing Cost — Return Exception
    anomaly = {
        "type": "missing_cost_return",
        "label": "Missing Cost — Return",
        "item_name": item_name,
        "reason": f"Returned product/empties '{item_name}' has no matching sales invoice cost or inventory valuation. Excluded from Cost of Returns without estimating replacement value.",
    }
    return None, anomaly



def compute_product_profitability(
    line_items_df: pd.DataFrame,
    df_inventory: pd.DataFrame,
    profile: ClientProfile = None
) -> Tuple[pd.DataFrame, Dict[str, Any], List[Dict[str, Any]]]:
    """
    Computes product-level true-cost profitability excluding empties,
    reproducing the 'Product' reference sheet.

    Returns:
    - products_df: DataFrame of all 40 products sorted by revenue desc
    - summary: dict with overall product revenue, cost, gross profit, margin
    - anomalies: list of cost resolution warnings
    """
    if profile is None:
        from engine.config import kane_jones_profile
        profile = kane_jones_profile()

    anomalies = []
    if line_items_df is None or line_items_df.empty:
        return pd.DataFrame(), {}, anomalies

    # 1. Filter out empties lines
    empties_kws = [k.lower() for k in profile.empties_keywords]
    is_empties_col = line_items_df["product_raw"].apply(
        lambda p: any(kw in str(p).lower() for kw in empties_kws)
    )
    prod_items = line_items_df[~is_empties_col].copy()

    # 2. Map tmp3F5D costs
    cost_map, dpp_map = build_inventory_cost_maps(df_inventory)

    matched_costs = []
    for idx, r in prod_items.iterrows():
        p_str = str(r["product_raw"]).strip().upper()
        cost_val = None

        if p_str in cost_map and cost_map[p_str] > 0:
            cost_val = cost_map[p_str]
        elif p_str in dpp_map and dpp_map[p_str] > 0:
            cost_val = dpp_map[p_str]
        else:
            # Fallback to invoice-embedded unit cost
            qty = float(r.get("quantity", 0.0) or 0.0)
            inv_cost = float(r.get("cost", 0.0) or 0.0)
            if qty > 0 and inv_cost > 0:
                cost_val = inv_cost / qty
            else:
                cost_val = 0.0
                anomalies.append({
                    "type": "unresolved_product_cost",
                    "product": r["product_raw"],
                    "invoice_no": r.get("invoice_no"),
                    "reason": "Could not resolve inventory cost or invoice unit cost."
                })

        matched_costs.append(cost_val)

    prod_items["tmp3f5d_cost"] = matched_costs
    prod_items["line_revenue"] = prod_items["quantity"] * prod_items["rate"]
    prod_items["line_true_cost"] = prod_items["quantity"] * prod_items["tmp3f5d_cost"]

    # 3. Group by product
    grouped = prod_items.groupby("product_raw", as_index=False).agg(
        cases_sold=("quantity", "sum"),
        revenue=("line_revenue", "sum"),
        tmp3f5d_cost=("tmp3f5d_cost", "first")
    )

    grouped["avg_selling_price"] = grouped["revenue"] / grouped["cases_sold"]
    grouped["total_cost"] = grouped["cases_sold"] * grouped["tmp3f5d_cost"]
    grouped["price_diff"] = grouped["avg_selling_price"] - grouped["tmp3f5d_cost"]
    grouped["price_diff_pct"] = np.where(
        grouped["tmp3f5d_cost"] > 0,
        grouped["price_diff"] / grouped["tmp3f5d_cost"],
        0.0
    )
    grouped["gross_profit"] = grouped["revenue"] - grouped["total_cost"]
    grouped["gross_profit_pct"] = np.where(
        grouped["revenue"] > 0,
        grouped["gross_profit"] / grouped["revenue"],
        0.0
    )

    # Sort descending by revenue
    products_df = grouped.sort_values(by="revenue", ascending=False).reset_index(drop=True)

    summary = {
        "total_revenue": float(products_df["revenue"].sum()),
        "total_cost": float(products_df["total_cost"].sum()),
        "total_gross_profit": float(products_df["gross_profit"].sum()),
        "gross_profit_pct": float(products_df["gross_profit"].sum() / products_df["revenue"].sum()) if products_df["revenue"].sum() > 0 else 0.0,
        "total_cases_sold": float(products_df["cases_sold"].sum()),
        "product_count": len(products_df),
    }

    return products_df, summary, anomalies


def compute_marketer_profitability(
    line_items_df: pd.DataFrame,
    df_inventory: pd.DataFrame,
    profile: ClientProfile = None
) -> Tuple[pd.DataFrame, Dict[str, pd.DataFrame], Dict[str, Any]]:
    """
    Computes customer (marketer) level true-cost profitability excluding empties,
    reproducing the 'Marketers' reference sheet.

    Returns:
    - customer_summary_df: Summary per customer (revenue, cost, gross profit, cases, invoices)
    - customer_product_details: Dict of {customer_name: product_breakdown_df}
    - overall_summary: Total metrics across all customers
    """
    if profile is None:
        from engine.config import kane_jones_profile
        profile = kane_jones_profile()

    if line_items_df is None or line_items_df.empty:
        return pd.DataFrame(), {}, {}

    # 1. Filter out empties
    empties_kws = [k.lower() for k in profile.empties_keywords]
    is_empties_col = line_items_df["product_raw"].apply(
        lambda p: any(kw in str(p).lower() for kw in empties_kws)
    )
    prod_items = line_items_df[~is_empties_col].copy()

    # 2. Map tmp3F5D costs
    cost_map, dpp_map = build_inventory_cost_maps(df_inventory)

    matched_costs = []
    for idx, r in prod_items.iterrows():
        p_str = str(r["product_raw"]).strip().upper()
        if p_str in cost_map and cost_map[p_str] > 0:
            cost_val = cost_map[p_str]
        elif p_str in dpp_map and dpp_map[p_str] > 0:
            cost_val = dpp_map[p_str]
        else:
            qty = float(r.get("quantity", 0.0) or 0.0)
            inv_cost = float(r.get("cost", 0.0) or 0.0)
            cost_val = (inv_cost / qty) if qty > 0 and inv_cost > 0 else 0.0
        matched_costs.append(cost_val)

    prod_items["tmp3f5d_cost"] = matched_costs
    prod_items["revenue"] = prod_items["quantity"] * prod_items["rate"]
    prod_items["total_cost"] = prod_items["quantity"] * prod_items["tmp3f5d_cost"]
    prod_items["gross_profit"] = prod_items["revenue"] - prod_items["total_cost"]

    # 3. Customer Summary
    cust_summary = prod_items.groupby("customer", as_index=False).agg(
        total_revenue=("revenue", "sum"),
        total_cost=("total_cost", "sum"),
        total_gross_profit=("gross_profit", "sum"),
        total_cases_sold=("quantity", "sum"),
        invoices=("invoice_no", "nunique")
    )
    cust_summary["gross_profit_pct"] = np.where(
        cust_summary["total_revenue"] > 0,
        cust_summary["total_gross_profit"] / cust_summary["total_revenue"],
        0.0
    )
    cust_summary = cust_summary.sort_values(by="total_revenue", ascending=False).reset_index(drop=True)

    # 4. Detailed Per-Customer Product Breakdown
    customer_product_details = {}
    for cust in cust_summary["customer"]:
        c_items = prod_items[prod_items["customer"] == cust]
        cp_grouped = c_items.groupby("product_raw", as_index=False).agg(
            cases_sold=("quantity", "sum"),
            revenue=("revenue", "sum"),
            tmp3f5d_cost=("tmp3f5d_cost", "first")
        )
        cp_grouped["avg_selling_price"] = cp_grouped["revenue"] / cp_grouped["cases_sold"]
        cp_grouped["total_cost"] = cp_grouped["cases_sold"] * cp_grouped["tmp3f5d_cost"]
        cp_grouped["price_diff"] = cp_grouped["avg_selling_price"] - cp_grouped["tmp3f5d_cost"]
        cp_grouped["gross_profit"] = cp_grouped["revenue"] - cp_grouped["total_cost"]
        cp_grouped["gross_profit_pct"] = np.where(
            cp_grouped["revenue"] > 0,
            cp_grouped["gross_profit"] / cp_grouped["revenue"],
            0.0
        )
        customer_product_details[cust] = cp_grouped.sort_values(by="revenue", ascending=False).reset_index(drop=True)

    overall_summary = {
        "total_revenue": float(cust_summary["total_revenue"].sum()),
        "total_cost": float(cust_summary["total_cost"].sum()),
        "total_gross_profit": float(cust_summary["total_gross_profit"].sum()),
        "total_cases_sold": float(cust_summary["total_cases_sold"].sum()),
        "customer_count": len(cust_summary),
    }

    return cust_summary, customer_product_details, overall_summary


def compute_returns_analysis(
    df_returns: pd.DataFrame,
    gross_revenue: float,
    line_items_df: pd.DataFrame = None,
    profile: ClientProfile = None
) -> Dict[str, Any]:
    """
    Computes comprehensive sales returns analysis, reproducing the
    'Sales Return Analysis' reference sheet.
    """
    if df_returns is None or df_returns.empty:
        return {
            "total_returns_value": 0.0,
            "product_returns_value": 0.0,
            "product_returns_qty": 0.0,
            "empties_returns_value": 0.0,
            "empties_returns_qty": 0.0,
            "return_rate": 0.0,
            "items_breakdown": [],
            "customers_breakdown": [],
            "weekly_trend": [],
            "anomalies": []
        }

    total_val = float(df_returns["return_value"].sum())
    return_rate = (total_val / gross_revenue) if gross_revenue > 0 else 0.0

    prod_ret = df_returns[df_returns["item_type"] == "Product"]
    emp_ret = df_returns[df_returns["item_type"] == "Empties"]

    prod_val = float(prod_ret["return_value"].sum())
    prod_qty = float(prod_ret["quantity"].sum())
    emp_val = float(emp_ret["return_value"].sum())
    emp_qty = float(emp_ret["quantity"].sum())

    # 1. Item Breakdown
    item_grp = df_returns.groupby(["item_name", "item_type"], as_index=False).agg(
        qty_returned=("quantity", "sum"),
        value_returned=("return_value", "sum")
    )
    item_grp["pct_of_total_returns"] = np.where(total_val > 0, item_grp["value_returned"] / total_val, 0.0)
    item_grp = item_grp.sort_values(by="value_returned", ascending=False).reset_index(drop=True)
    items_breakdown = item_grp.to_dict(orient="records")

    # 2. Customer Breakdown
    cust_sales_map = {}
    if line_items_df is not None and not line_items_df.empty:
        line_items_df_copy = line_items_df.copy()
        line_items_df_copy["line_revenue"] = line_items_df_copy["quantity"] * line_items_df_copy["rate"]
        cust_sales_series = line_items_df_copy.groupby("customer")["line_revenue"].sum()
        cust_sales_map = cust_sales_series.to_dict()

    cust_records = []
    for cust, c_df in df_returns.groupby("customer"):
        c_prod = c_df[c_df["item_type"] == "Product"]
        c_emp = c_df[c_df["item_type"] == "Empties"]

        c_prod_qty = float(c_prod["quantity"].sum())
        c_prod_val = float(c_prod["return_value"].sum())
        c_emp_qty = float(c_emp["quantity"].sum())
        c_emp_val = float(c_emp["return_value"].sum())
        c_total_val = float(c_df["return_value"].sum())
        vch_count = int(c_df["voucher_no"].nunique())

        c_sales = float(cust_sales_map.get(cust, 0.0))
        c_return_rate = (c_total_val / c_sales) if c_sales > 0 else (1.0 if c_total_val > 0 else 0.0)

        # Risk flag
        if c_sales == 0 and c_total_val > 0:
            flag = "Returns with no matching sales invoice"
        elif c_return_rate > 0.15:
            flag = "High (>15%)"
        elif c_return_rate > 0.08:
            flag = "Elevated (>8%)"
        else:
            flag = "Normal"

        cust_records.append({
            "customer": cust,
            "return_transactions": vch_count,
            "product_qty": c_prod_qty,
            "product_val": c_prod_val,
            "empties_qty": c_emp_qty,
            "empties_val": c_emp_val,
            "total_val": c_total_val,
            "pct_of_total_returns": (c_total_val / total_val) if total_val > 0 else 0.0,
            "sales_revenue": c_sales,
            "return_rate_pct": c_return_rate,
            "risk_flag": flag
        })

    cust_records.sort(key=lambda x: x["total_val"], reverse=True)

    # 3. Weekly Trend (W1: Jul 1-7, W2: Jul 8-14, W3: Jul 15-21, W4: Jul 22-28, Tail: Jul 29-31)
    df_returns["dt"] = pd.to_datetime(df_returns["date"], errors="coerce")
    weekly_buckets = [
        ("W1", "Jul 1-7", 1, 7),
        ("W2", "Jul 8-14", 8, 14),
        ("W3", "Jul 15-21", 15, 21),
        ("W4", "Jul 22-28", 22, 28),
        ("Tail", "Jul 29-31", 29, 31),
    ]

    weekly_trend = []
    for w_code, d_range, day_min, day_max in weekly_buckets:
        w_mask = (df_returns["dt"].dt.day >= day_min) & (df_returns["dt"].dt.day <= day_max)
        w_df = df_returns[w_mask]
        w_prod = w_df[w_df["item_type"] == "Product"]
        w_emp = w_df[w_df["item_type"] == "Empties"]

        weekly_trend.append({
            "week": w_code,
            "date_range": d_range,
            "return_transactions": int(w_df["voucher_no"].nunique()),
            "product_val": float(w_prod["return_value"].sum()),
            "empties_val": float(w_emp["return_value"].sum()),
            "total_val": float(w_df["return_value"].sum())
        })

    # 4. Check for return volume exceeding recorded sales volume
    anomalies = []
    if line_items_df is not None and not line_items_df.empty:
        prod_sales_qty = prod_items.groupby("product_raw")["quantity"].sum().to_dict() if 'prod_items' in locals() else {}
        for _, r in item_grp[item_grp["item_type"] == "Product"].iterrows():
            p_name = r["item_name"]
            ret_q = r["qty_returned"]
            # find matching sales qty
            sales_q = 0.0
            for sp_name, sq in prod_sales_qty.items():
                if p_name.lower() in sp_name.lower() or sp_name.lower() in p_name.lower():
                    sales_q += sq
            if ret_q > sales_q and sales_q > 0:
                anomalies.append({
                    "type": "return_exceeds_sales",
                    "product": p_name,
                    "return_qty": ret_q,
                    "sales_qty": sales_q,
                    "reason": f"Returns quantity ({ret_q}) exceeds recorded sales quantity ({sales_q})"
                })

    return {
        "total_returns_value": total_val,
        "product_returns_value": prod_val,
        "product_returns_qty": prod_qty,
        "empties_returns_value": emp_val,
        "empties_returns_qty": emp_qty,
        "return_rate": return_rate,
        "items_breakdown": items_breakdown,
        "customers_breakdown": cust_records,
        "weekly_trend": weekly_trend,
        "anomalies": anomalies
    }
