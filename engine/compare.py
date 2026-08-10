"""
Period-over-period comparison module for depot sales intelligence.

Supports comparisons across three granularities using a single entry point `compare_periods()`:
  - Day vs Day (e.g. Thursday 2026-07-02 vs Friday 2026-07-03)
  - Week vs Week (e.g. Week 1 vs Week 3)
  - Month vs Month (e.g. July 2026 vs August 2026)

Produces:
  - Metric diffs (revenue, gross profit, margin %, invoice count) with absolute & % changes
  - Product rank movements (#1 -> #1, revenue +12%), new entrants, and dropouts in top 10
  - Customer rank movements (#3 -> #7, revenue -40%), new entrants, and dropouts in top 10
  - Executive bullet-point highlights
"""

from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd


def _format_currency(amount: Optional[float], currency: str = "\u20a6", include_plus: bool = False) -> str:
    if amount is None or pd.isna(amount):
        return "N/A"
    if amount < 0:
        return f"-{currency}{abs(amount):,.2f}"
    elif amount > 0 and include_plus:
        return f"+{currency}{abs(amount):,.2f}"
    return f"{currency}{abs(amount):,.2f}"


def _format_pct(pct: Optional[float]) -> str:
    if pct is None or pd.isna(pct):
        return "N/A"
    sign = "+" if pct > 0 else ""
    return f"{sign}{pct * 100:.1f}%"


def _format_pts(pts: Optional[float]) -> str:
    if pts is None or pd.isna(pts):
        return "N/A"
    sign = "+" if pts > 0 else ""
    return f"{sign}{pts:.2f}% pts"


def _compute_metric_diff(
    val_a: Optional[float],
    val_b: Optional[float],
    is_currency: bool = True,
    currency: str = "\u20a6",
) -> Dict[str, Any]:
    a = float(val_a) if val_a is not None and not pd.isna(val_a) else 0.0
    b = float(val_b) if val_b is not None and not pd.isna(val_b) else 0.0
    diff = b - a
    pct_change = (diff / abs(a)) if a != 0 else (0.0 if b == 0 else (1.0 if b > 0 else -1.0))

    if is_currency:
        formatted = f"{_format_currency(diff, currency, include_plus=True)} ({_format_pct(pct_change)})"
    else:
        formatted = f"{int(diff):+d} ({_format_pct(pct_change)})" if float(diff).is_integer() else f"{diff:+.2f} ({_format_pct(pct_change)})"

    return {
        "period_a": a,
        "period_b": b,
        "absolute_change": diff,
        "pct_change": pct_change,
        "formatted": formatted,
    }


def _compute_margin_diff(
    margin_a: Optional[float], margin_b: Optional[float]
) -> Dict[str, Any]:
    a = float(margin_a) if margin_a is not None and not pd.isna(margin_a) else 0.0
    b = float(margin_b) if margin_b is not None and not pd.isna(margin_b) else 0.0
    diff = b - a
    diff_pct_points = diff * 100.0
    diff_bps = diff * 10000.0

    return {
        "period_a": a,
        "period_b": b,
        "diff_pct_points": diff_pct_points,
        "diff_bps": diff_bps,
        "formatted": f"{_format_pts(diff_pct_points)} ({diff_bps:+.0f} bps)",
    }


def _compare_rankings(
    items_a: List[Dict[str, Any]],
    items_b: List[Dict[str, Any]],
    key_field: str = "product_raw",
    revenue_field: str = "revenue",
    top_n: int = 10,
    currency: str = "\u20a6",
) -> Dict[str, Any]:
    """Computes rank movements, new entrants, and dropouts between two ranked lists."""
    # Build indexed map for A
    sorted_a = sorted(
        items_a, key=lambda x: float(x.get(revenue_field, 0.0) or 0.0), reverse=True
    )
    map_a = {}
    for idx, item in enumerate(sorted_a, 1):
        name = item.get(key_field)
        if name:
            map_a[name] = {
                "rank": idx,
                "revenue": float(item.get(revenue_field, 0.0) or 0.0),
                "item": item,
            }

    # Build indexed map for B
    sorted_b = sorted(
        items_b, key=lambda x: float(x.get(revenue_field, 0.0) or 0.0), reverse=True
    )
    map_b = {}
    for idx, item in enumerate(sorted_b, 1):
        name = item.get(key_field)
        if name:
            map_b[name] = {
                "rank": idx,
                "revenue": float(item.get(revenue_field, 0.0) or 0.0),
                "item": item,
            }

    all_names = list(dict.fromkeys(list(map_a.keys()) + list(map_b.keys())))

    movements = []
    for name in all_names:
        info_a = map_a.get(name)
        info_b = map_b.get(name)

        rank_a = info_a["rank"] if info_a else None
        rank_b = info_b["rank"] if info_b else None
        rev_a = info_a["revenue"] if info_a else 0.0
        rev_b = info_b["revenue"] if info_b else 0.0
        rev_diff = rev_b - rev_a
        rev_pct = (rev_diff / rev_a) if rev_a > 0 else (1.0 if rev_b > 0 else 0.0)

        # Rank movement description
        if rank_a is not None and rank_b is not None:
            rank_shift = rank_a - rank_b  # positive = climbed up
            movement_str = f"{name}: #{rank_a} -> #{rank_b}, revenue {_format_pct(rev_pct)}"
        elif rank_a is None and rank_b is not None:
            rank_shift = None
            movement_str = f"{name}: NEW ENTRANT -> #{rank_b} ({currency}{rev_b:,.2f})"
        else:
            rank_shift = None
            movement_str = f"{name}: #{rank_a} -> DROPOUT (previous {currency}{rev_a:,.2f})"

        movements.append({
            "name": name,
            "rank_a": rank_a,
            "rank_b": rank_b,
            "rank_shift": rank_shift,
            "revenue_a": rev_a,
            "revenue_b": rev_b,
            "revenue_diff": rev_diff,
            "revenue_pct_change": rev_pct,
            "movement_label": movement_str,
            "item_a": info_a["item"] if info_a else None,
            "item_b": info_b["item"] if info_b else None,
        })

    # Top-N analysis
    top_names_a = {name for name, info in map_a.items() if info["rank"] <= top_n}
    top_names_b = {name for name, info in map_b.items() if info["rank"] <= top_n}

    new_entrants = []
    for name in sorted(top_names_b - top_names_a, key=lambda n: map_b[n]["rank"]):
        prev_rank = map_a[name]["rank"] if name in map_a else None
        prev_str = f"previously #{prev_rank}" if prev_rank else "newly added"
        new_entrants.append({
            "name": name,
            "new_rank": map_b[name]["rank"],
            "previous_rank": prev_rank,
            "revenue": map_b[name]["revenue"],
            "label": f"{name} (entered top {top_n} at #{map_b[name]['rank']}, {prev_str})",
        })

    dropouts = []
    for name in sorted(top_names_a - top_names_b, key=lambda n: map_a[n]["rank"]):
        curr_rank = map_b[name]["rank"] if name in map_b else None
        curr_str = f"fell to #{curr_rank}" if curr_rank else "no sales"
        dropouts.append({
            "name": name,
            "previous_rank": map_a[name]["rank"],
            "new_rank": curr_rank,
            "previous_revenue": map_a[name]["revenue"],
            "label": f"{name} (dropped out of top {top_n} from #{map_a[name]['rank']}, {curr_str})",
        })

    # Sort movements: items in top of B first, then A
    movements.sort(key=lambda m: (m["rank_b"] if m["rank_b"] is not None else 9999, m["rank_a"] if m["rank_a"] is not None else 9999))

    return {
        "movements": movements,
        "new_entrants_top10": new_entrants,
        "dropouts_top10": dropouts,
    }


def compare_periods(
    snapshot_or_data_a: Any,
    snapshot_or_data_b: Any,
    granularity: str = "month",
    key_a: Optional[Any] = None,
    key_b: Optional[Any] = None,
    currency_symbol: str = "\u20a6",
) -> Dict[str, Any]:
    """Universal period-over-period comparison entry point.

    Granularity:
      - 'day' (or 'daily'): compares two specific days (from daily_summary or row dicts)
      - 'week' (or 'weekly'): compares two specific weeks (from weekly_summary or row dicts)
      - 'month' (or 'monthly'): compares two full snapshot periods

    Parameters:
      snapshot_or_data_a: Snapshot dict, list of summaries, or specific slice dict for period A
      snapshot_or_data_b: Snapshot dict, list of summaries, or specific slice dict for period B
      granularity: 'day' | 'week' | 'month'
      key_a: Date string (e.g. '2026-07-02') or week integer (e.g. 1) if pulling from snapshot
      key_b: Date string (e.g. '2026-07-03') or week integer (e.g. 3) if pulling from snapshot
      currency_symbol: Display currency symbol (defaults to ₦)
    """
    g = granularity.lower().strip()

    data_a = None
    data_b = None
    label_a = "Period A"
    label_b = "Period B"
    ranking_a: List[Dict[str, Any]] = []
    ranking_b: List[Dict[str, Any]] = []
    customer_a: List[Dict[str, Any]] = []
    customer_b: List[Dict[str, Any]] = []

    # 1. Resolve Day vs Day
    if g in ("day", "daily"):
        g_name = "day"

        def _find_day_row(source, key):
            if isinstance(source, dict):
                if "daily_summary" in source:
                    rows = source["daily_summary"]
                    if key is not None:
                        for r in rows:
                            if str(r.get("date_only", "")).startswith(str(key)):
                                return r
                    return rows[0] if rows else {}
                elif "date_only" in source or "revenue" in source:
                    return source
            return {}

        row_a = _find_day_row(snapshot_or_data_a, key_a)
        row_b = _find_day_row(snapshot_or_data_b, key_b)

        label_a = str(row_a.get("date_only", key_a or "Day A"))
        label_b = str(row_b.get("date_only", key_b or "Day B"))
        data_a = row_a
        data_b = row_b

    # 2. Resolve Week vs Week
    elif g in ("week", "weekly"):
        g_name = "week"

        def _find_week_row(source, key):
            if isinstance(source, dict):
                if "weekly_summary" in source:
                    rows = source["weekly_summary"]
                    if key is not None:
                        for r in rows:
                            if str(r.get("week", "")) == str(key):
                                return r
                    return rows[0] if rows else {}
                elif "week" in source or "revenue" in source:
                    return source
            return {}

        row_a = _find_week_row(snapshot_or_data_a, key_a)
        row_b = _find_week_row(snapshot_or_data_b, key_b)

        label_a = f"Week {row_a.get('week', key_a or 'A')}"
        label_b = f"Week {row_b.get('week', key_b or 'B')}"
        data_a = row_a
        data_b = row_b

    # 3. Resolve Month vs Month (Full Snapshot Comparison)
    else:
        g_name = "month"
        data_a = snapshot_or_data_a.get("meta", snapshot_or_data_a) if isinstance(snapshot_or_data_a, dict) else {}
        data_b = snapshot_or_data_b.get("meta", snapshot_or_data_b) if isinstance(snapshot_or_data_b, dict) else {}

        label_a = snapshot_or_data_a.get("period_label", key_a or "Period A") if isinstance(snapshot_or_data_a, dict) else "Period A"
        label_b = snapshot_or_data_b.get("period_label", key_b or "Period B") if isinstance(snapshot_or_data_b, dict) else "Period B"

        if isinstance(snapshot_or_data_a, dict):
            ranking_a = snapshot_or_data_a.get("product_ranking", snapshot_or_data_a.get("product_revenue_ranking", []))
            customer_a = snapshot_or_data_a.get("customer_margin_detail", [])
        if isinstance(snapshot_or_data_b, dict):
            ranking_b = snapshot_or_data_b.get("product_ranking", snapshot_or_data_b.get("product_revenue_ranking", []))
            customer_b = snapshot_or_data_b.get("customer_margin_detail", [])

    # If ranking/customer data passed in day/week slice, extract them
    if isinstance(snapshot_or_data_a, dict) and not ranking_a:
        ranking_a = snapshot_or_data_a.get("product_ranking", snapshot_or_data_a.get("product_revenue_ranking", []))
        customer_a = snapshot_or_data_a.get("customer_margin_detail", [])
    if isinstance(snapshot_or_data_b, dict) and not ranking_b:
        ranking_b = snapshot_or_data_b.get("product_ranking", snapshot_or_data_b.get("product_revenue_ranking", []))
        customer_b = snapshot_or_data_b.get("customer_margin_detail", [])

    # Extract scalar metrics
    rev_a = data_a.get("revenue", data_a.get("total_revenue", 0.0))
    rev_b = data_b.get("revenue", data_b.get("total_revenue", 0.0))
    gp_a = data_a.get("gross_profit", data_a.get("total_gross_profit", 0.0))
    gp_b = data_b.get("gross_profit", data_b.get("total_gross_profit", 0.0))
    margin_a = data_a.get("margin_pct", data_a.get("overall_margin_pct", 0.0))
    margin_b = data_b.get("margin_pct", data_b.get("overall_margin_pct", 0.0))
    inv_a = data_a.get("invoices", data_a.get("total_invoices", 0))
    inv_b = data_b.get("invoices", data_b.get("total_invoices", 0))

    summary_diff = {
        "revenue": _compute_metric_diff(rev_a, rev_b, is_currency=True, currency=currency_symbol),
        "gross_profit": _compute_metric_diff(gp_a, gp_b, is_currency=True, currency=currency_symbol),
        "margin_pct": _compute_margin_diff(margin_a, margin_b),
        "invoices": _compute_metric_diff(inv_a, inv_b, is_currency=False),
    }

    # Product rank movements
    product_comp = _compare_rankings(
        ranking_a, ranking_b, key_field="product_raw", revenue_field="revenue", top_n=10, currency=currency_symbol
    ) if (ranking_a or ranking_b) else {"movements": [], "new_entrants_top10": [], "dropouts_top10": []}

    # Customer rank movements
    customer_comp = _compare_rankings(
        customer_a, customer_b, key_field="customer", revenue_field="revenue", top_n=10, currency=currency_symbol
    ) if (customer_a or customer_b) else {"movements": [], "new_entrants_top10": [], "dropouts_top10": []}

    # Executive highlights
    highlights = []
    rev_a_fmt = _format_currency(rev_a, currency_symbol)
    rev_b_fmt = _format_currency(rev_b, currency_symbol)
    gp_a_fmt = _format_currency(gp_a, currency_symbol)
    gp_b_fmt = _format_currency(gp_b, currency_symbol)

    highlights.append(
        f"Revenue moved from {rev_a_fmt} ({label_a}) to {rev_b_fmt} ({label_b}): {summary_diff['revenue']['formatted']}."
    )
    highlights.append(
        f"Gross profit moved from {gp_a_fmt} to {gp_b_fmt} (margin {_format_pts(summary_diff['margin_pct']['diff_pct_points'])})."
    )
    inv_a_int = int(round(float(inv_a))) if inv_a is not None else 0
    inv_b_int = int(round(float(inv_b))) if inv_b is not None else 0
    highlights.append(
        f"Invoice volume: {inv_a_int} -> {inv_b_int} ({summary_diff['invoices']['formatted']})."
    )

    if product_comp["new_entrants_top10"]:
        entrants_str = ", ".join(e["label"] for e in product_comp["new_entrants_top10"])
        highlights.append(f"Top 10 Product New Entrants: {entrants_str}")

    if product_comp["dropouts_top10"]:
        dropouts_str = ", ".join(d["label"] for d in product_comp["dropouts_top10"])
        highlights.append(f"Top 10 Product Dropouts: {dropouts_str}")

    if customer_comp["new_entrants_top10"]:
        c_entrants_str = ", ".join(e["label"] for e in customer_comp["new_entrants_top10"])
        highlights.append(f"Top 10 Customer New Entrants: {c_entrants_str}")

    if customer_comp["dropouts_top10"]:
        c_dropouts_str = ", ".join(d["label"] for d in customer_comp["dropouts_top10"])
        highlights.append(f"Top 10 Customer Dropouts: {c_dropouts_str}")

    return {
        "granularity": g_name,
        "period_a_label": label_a,
        "period_b_label": label_b,
        "summary": summary_diff,
        "product_movements": product_comp,
        "customer_movements": customer_comp,
        "highlights": highlights,
    }
