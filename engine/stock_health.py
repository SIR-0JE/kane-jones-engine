"""
Stock / Inventory Health Analysis Module for Distil Engine.
Implements Feature 1 of Distil Engineering Change Request (Phase 1 & 2):
- Trailing 30-day velocity with 45-day extension for low-transaction SKUs (<10 sales txns).
- Excludes returnable empties from velocity calculations.
- Lead time buffer (default 10 days), Safety Stock (10d), Reorder Point (20d).
- Stock Cover Days/Weeks & 6-Band Health Classification:
  * Dead Stock (sold=0, stock>0)
  * No Stock / No Sales (sold=0, stock=0)
  * Critical (stock-out risk) (cover < 1 week)
  * Low (1–2 weeks)
  * Healthy (2–4 weeks)
  * High / Monitor (4–6 weeks)
  * Excess (capital tied up) (>6 weeks)
- Automated 1-line action recommendations per product.
- Priority rankings:
  * Top Stock-Out Risk ranked by daily velocity (highest first)
  * Slow-Moving and Dead Stock ranked by capital tied up (₦)
  * Suggested Reorders (products <= ROP)
- Peak-Period Seasonal Guesstimate adjustments computed side-by-side.
"""

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
from engine.config import ClientProfile, kane_jones_profile
from engine.audit import is_empties


def _normalize_name(name: Any) -> str:
    if name is None or pd.isna(name):
        return ""
    return str(name).strip().upper()


def compute_stock_health(
    df_inventory: pd.DataFrame,
    line_items_df: pd.DataFrame,
    profile: Optional[ClientProfile] = None,
    as_of_date: Optional[Any] = None,
    lead_time_days: int = 10,
    peak_multiplier: float = 1.0,
    is_peak_active: bool = False,
    peak_name: str = "Peak Season Adjustment",
) -> Dict[str, Any]:
    """
    Computes complete stock health analysis per Section 1 of the Distil spec.
    """
    if profile is None:
        profile = kane_jones_profile()

    currency = getattr(profile, "currency_symbol", "₦")

    # 1. Clean sales line items & filter out empties
    if line_items_df is not None and not line_items_df.empty:
        li = line_items_df.copy()
        li["product_clean"] = li["product_raw"].apply(_normalize_name)
        li["quantity"] = pd.to_numeric(li["quantity"], errors="coerce").fillna(0.0)
        li["rate"] = pd.to_numeric(li["rate"], errors="coerce").fillna(0.0)

        # Exclude empties
        li = li[~li["product_raw"].apply(lambda p: is_empties(p, profile))]

        # Ensure date is datetime
        if not pd.api.types.is_datetime64_any_dtype(li["date"]):
            li["date"] = pd.to_datetime(li["date"], errors="coerce")
        li = li.dropna(subset=["date"])
    else:
        li = pd.DataFrame(columns=["date", "product_raw", "product_clean", "quantity", "rate", "cost", "invoice_no", "customer"])

    # 2. Determine "as of" date and trailing observation windows
    if as_of_date is not None:
        as_of = pd.to_datetime(as_of_date)
    elif not li.empty:
        as_of = li["date"].max()
    else:
        as_of = pd.Timestamp.now().normalize()

    # Window dates
    window_30_start = as_of - pd.Timedelta(days=29)
    window_45_start = as_of - pd.Timedelta(days=44)

    # Determine total available days in dataset to handle single-month files cleanly
    min_sales_date = li["date"].min() if not li.empty else as_of
    available_days = max(1, (as_of.normalize() - min_sales_date.normalize()).days + 1)

    # 3. Clean and map inventory stock positions
    inv_map: Dict[str, Dict[str, Any]] = {}
    if df_inventory is not None and not df_inventory.empty:
        for _, row in df_inventory.iterrows():
            item_raw = str(row.get("item_name", "")).strip()
            item_norm = _normalize_name(item_raw)
            if not item_norm or "TOTAL" in item_norm:
                continue

            units = float(row.get("units", 0.0) or 0.0)
            uom = str(row.get("uom", "Ctn") or "Ctn").strip()
            rate = float(row.get("rate_per_unit", 0.0) or 0.0)
            dpp = float(row.get("default_purchase_price", 0.0) or 0.0)
            unit_cost = rate if rate > 0 else (dpp if dpp > 0 else 0.0)

            # Avoid overwriting with zero stock if multiple rows exist
            if item_norm in inv_map:
                inv_map[item_norm]["units"] += units
                if unit_cost > 0 and inv_map[item_norm]["unit_cost"] == 0:
                    inv_map[item_norm]["unit_cost"] = unit_cost
            else:
                inv_map[item_norm] = {
                    "product_name": item_raw,
                    "units": units,
                    "uom": uom,
                    "unit_cost": unit_cost,
                    "reported_value": float(row.get("value", 0.0) or (units * unit_cost)),
                }

    # Also extract any active products in sales register that might not be in inventory extract
    all_product_keys = set(inv_map.keys())
    if not li.empty:
        for p_norm in li["product_clean"].unique():
            if p_norm and p_norm not in all_product_keys:
                sample_p = li[li["product_clean"] == p_norm].iloc[0]
                p_raw = sample_p["product_raw"]
                inv_map[p_norm] = {
                    "product_name": p_raw,
                    "units": 0.0,
                    "uom": "Ctn",
                    "unit_cost": 0.0,
                    "reported_value": 0.0,
                }
                all_product_keys.add(p_norm)

    # 4. Compute per-product velocity, cover, buffer, and status
    products_health: List[Dict[str, Any]] = []

    for p_norm, inv_info in inv_map.items():
        p_name = inv_info["product_name"]
        current_stock = inv_info["units"]
        unit_cost = inv_info["unit_cost"]
        uom = inv_info["uom"]

        # Sales history in 30 days
        p_sales_30 = li[(li["product_clean"] == p_norm) & (li["date"] >= window_30_start) & (li["date"] <= as_of)]
        txns_count_30 = len(p_sales_30)

        # 45 days extension rule (< 10 txns in 30 days)
        if txns_count_30 < 10:
            window_days = 45
            p_sales_window = li[(li["product_clean"] == p_norm) & (li["date"] >= window_45_start) & (li["date"] <= as_of)]
            window_type = "45_days (extended for low transactions)"
        else:
            window_days = 30
            p_sales_window = p_sales_30
            window_type = "30_days (standard)"

        units_sold = float(p_sales_window["quantity"].sum())
        txns_count = len(p_sales_window)

        # Daily sales velocity (units/day)
        daily_velocity = units_sold / float(window_days) if window_days > 0 else 0.0

        # Capital tied up
        capital_tied_up = current_stock * unit_cost

        # Lead time, safety stock, and reorder point (ROP)
        safety_stock = daily_velocity * float(lead_time_days)
        reorder_point = (daily_velocity * float(lead_time_days)) + safety_stock  # = daily_velocity * 20 by default
        suggested_reorder_qty = max(0.0, reorder_point - current_stock)

        # Stock cover days and weeks
        if daily_velocity > 0:
            stock_cover_days = current_stock / daily_velocity
            stock_cover_weeks = stock_cover_days / 7.0
        else:
            stock_cover_days = None
            stock_cover_weeks = None

        # Health status band classification
        if units_sold == 0 and current_stock > 0:
            status = "Dead Stock"
            status_order = 5
            action_recommendation = (
                f"Zero sales in window with {currency}{capital_tied_up:,.0f} tied up — "
                f"confirm if active or write off / liquidate"
            )
        elif units_sold == 0 and current_stock == 0:
            status = "No Stock / No Sales"
            status_order = 6
            action_recommendation = "No inventory on hand and zero sales in observation window"
        elif stock_cover_weeks is not None and stock_cover_weeks < 1.0:
            status = "Critical (stock-out risk)"
            status_order = 0
            action_recommendation = (
                f"Reorder now — {suggested_reorder_qty:,.0f} {uom} needed "
                f"(urgent stock-out risk; cover < 1 wk)"
            )
        elif stock_cover_weeks is not None and 1.0 <= stock_cover_weeks < 2.0:
            status = "Low"
            status_order = 1
            action_recommendation = (
                f"Plan replenishment — {suggested_reorder_qty:,.0f} {uom} buffer needed to reach safe ROP"
            )
        elif stock_cover_weeks is not None and 2.0 <= stock_cover_weeks <= 4.0:
            status = "Healthy"
            status_order = 2
            action_recommendation = (
                f"Optimal inventory level ({stock_cover_weeks:.1f} wks cover) — maintain standard replenishment rhythm"
            )
        elif stock_cover_weeks is not None and 4.0 < stock_cover_weeks <= 6.0:
            status = "High / Monitor"
            status_order = 3
            action_recommendation = (
                f"Slow movement ({stock_cover_weeks:.1f} wks cover) — monitor inventory levels and pause repeat orders"
            )
        else:  # stock_cover_weeks > 6.0
            status = "Excess (capital tied up)"
            status_order = 4
            cover_str = f"{stock_cover_weeks:.1f} wks" if stock_cover_weeks is not None else ">6 wks"
            action_recommendation = (
                f"Hold purchases — {currency}{capital_tied_up:,.0f} tied up ({cover_str} cover); review pricing or bundle"
            )

        # Peak period side-by-side computation
        peak_mult = float(peak_multiplier) if peak_multiplier and peak_multiplier > 0 else 1.0
        peak_daily_velocity = daily_velocity * peak_mult
        peak_safety_stock = peak_daily_velocity * float(lead_time_days)
        peak_reorder_point = (peak_daily_velocity * float(lead_time_days)) + peak_safety_stock
        peak_suggested_reorder_qty = max(0.0, peak_reorder_point - current_stock)
        peak_cover_days = (current_stock / peak_daily_velocity) if peak_daily_velocity > 0 else None
        peak_cover_weeks = (peak_cover_days / 7.0) if peak_cover_days is not None else None

        products_health.append({
            "product_name": p_name,
            "product_key": p_norm,
            "current_stock": round(current_stock, 2),
            "uom": uom,
            "unit_cost": round(unit_cost, 2),
            "capital_tied_up": round(capital_tied_up, 2),
            "units_sold_window": round(units_sold, 2),
            "transactions_count": int(txns_count),
            "window_days": int(window_days),
            "window_type": window_type,
            "daily_velocity": round(daily_velocity, 2),
            "lead_time_days": int(lead_time_days),
            "safety_stock": round(safety_stock, 2),
            "reorder_point": round(reorder_point, 2),
            "suggested_reorder_qty": round(suggested_reorder_qty, 2),
            "estimated_reorder_cost": round(suggested_reorder_qty * unit_cost, 2),
            "stock_cover_days": round(stock_cover_days, 1) if stock_cover_days is not None else None,
            "stock_cover_weeks": round(stock_cover_weeks, 2) if stock_cover_weeks is not None else None,
            "status": status,
            "status_order": status_order,
            "action_recommendation": action_recommendation,
            # Peak Season Adjusted Fields (Side-by-Side)
            "peak_adjusted": {
                "multiplier": peak_mult,
                "is_active": bool(is_peak_active),
                "peak_daily_velocity": round(peak_daily_velocity, 2),
                "peak_safety_stock": round(peak_safety_stock, 2),
                "peak_reorder_point": round(peak_reorder_point, 2),
                "peak_suggested_reorder_qty": round(peak_suggested_reorder_qty, 2),
                "peak_estimated_reorder_cost": round(peak_suggested_reorder_qty * unit_cost, 2),
                "peak_stock_cover_weeks": round(peak_cover_weeks, 2) if peak_cover_weeks is not None else None,
            },
        })

    # Filter out "No Stock / No Sales" from active operational lists per spec
    active_products = [p for p in products_health if p["status"] != "No Stock / No Sales"]

    # 5. Required Views per Section 1.5 of Spec
    top_stock_out_risk = sorted(
        [p for p in active_products if p["status"] == "Critical (stock-out risk)"],
        key=lambda x: x["daily_velocity"],
        reverse=True,
    )

    slow_moving_stock = sorted(
        [p for p in active_products if p["status"] in ("High / Monitor", "Excess (capital tied up)")],
        key=lambda x: x["capital_tied_up"],
        reverse=True,
    )

    dead_stock = sorted(
        [p for p in active_products if p["status"] == "Dead Stock"],
        key=lambda x: x["capital_tied_up"],
        reverse=True,
    )

    suggested_reorders = sorted(
        [p for p in active_products if p["suggested_reorder_qty"] > 0],
        key=lambda x: x["suggested_reorder_qty"],
        reverse=True,
    )

    # 6. Summary Counts and Capital per Health Band
    band_definitions = [
        {"status": "Critical (stock-out risk)", "color": "rose", "badge": "Critical"},
        {"status": "Low", "color": "amber", "badge": "Low"},
        {"status": "Healthy", "color": "emerald", "badge": "Healthy"},
        {"status": "High / Monitor", "color": "blue", "badge": "Monitor"},
        {"status": "Excess (capital tied up)", "color": "purple", "badge": "Excess"},
        {"status": "Dead Stock", "color": "slate", "badge": "Dead Stock"},
    ]

    summary_bands: Dict[str, Dict[str, Any]] = {}
    for b in band_definitions:
        st = b["status"]
        matching = [p for p in active_products if p["status"] == st]
        summary_bands[st] = {
            "status": st,
            "color": b["color"],
            "badge": b["badge"],
            "sku_count": len(matching),
            "total_capital_tied_up": round(sum(p["capital_tied_up"] for p in matching), 2),
            "total_units": round(sum(p["current_stock"] for p in matching), 2),
        }

    total_active_stock_value = round(sum(p["capital_tied_up"] for p in active_products), 2)
    total_suggested_reorder_units = round(sum(p["suggested_reorder_qty"] for p in active_products), 2)
    total_suggested_reorder_cost = round(sum(p["estimated_reorder_cost"] for p in active_products), 2)

    return {
        "as_of_date": as_of.strftime("%Y-%m-%d"),
        "lead_time_days": int(lead_time_days),
        "peak_config": {
            "name": peak_name,
            "multiplier": float(peak_multiplier),
            "is_active": bool(is_peak_active),
        },
        "summary": {
            "total_active_skus": len(active_products),
            "total_stock_value": total_active_stock_value,
            "critical_stock_out_count": len(top_stock_out_risk),
            "dead_stock_count": len(dead_stock),
            "dead_stock_capital": summary_bands["Dead Stock"]["total_capital_tied_up"],
            "excess_stock_capital": summary_bands["Excess (capital tied up)"]["total_capital_tied_up"],
            "slow_moving_capital": (
                summary_bands["High / Monitor"]["total_capital_tied_up"]
                + summary_bands["Excess (capital tied up)"]["total_capital_tied_up"]
            ),
            "suggested_reorder_skus_count": len(suggested_reorders),
            "suggested_reorder_units": total_suggested_reorder_units,
            "suggested_reorder_cost": total_suggested_reorder_cost,
        },
        "summary_bands": summary_bands,
        "top_stock_out_risk": top_stock_out_risk,
        "slow_moving_stock": slow_moving_stock,
        "dead_stock": dead_stock,
        "suggested_reorders": suggested_reorders,
        "all_products": sorted(active_products, key=lambda x: (x["status_order"], -x["capital_tied_up"])),
    }
