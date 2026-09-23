"""
Weekly Financial Reporting Engine for Distil.
Implements Feature 2 of Distil Engineering Change Request (Phase 1 & 2):
- Applies the exact P&L calculation chain across weekly slices:
  * Gross Sales Revenue
  * Less: Sales Returns (product + empties)
  * = Net Sales Revenue
  * Less: Invoiced Cost of Goods Sold (COGS)
  * = Gross Profit & Gross Margin %
  * Less: Total Operating Expenses (Opex)
  * = Net Operating Profit & Net Margin %
- Calendar weeks (Mon–Sun standard ISO) and depot trading weeks.
- Supporting breakdowns per week:
  * Daily audit rows within the week
  * Top products for the week
  * Top customers for the week
  * Returns log for the week
  * Operating expenses for the week
- Week-over-Week (WoW) comparative metrics with percentage variances and basis point margin deltas.
- Automated weekly narrative insight generation ("What this means").
"""

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
from engine.config import ClientProfile, kane_jones_profile
from engine.audit import is_empties


def _format_money(val: float, currency: str = "₦") -> str:
    abs_v = abs(val)
    if abs_v >= 1_000_000_000:
        return f"{currency}{val / 1_000_000_000:,.2f}B"
    if abs_v >= 1_000_000:
        return f"{currency}{val / 1_000_000:,.2f}M"
    if abs_v >= 1_000:
        return f"{currency}{val / 1_000:,.1f}k"
    return f"{currency}{val:,.0f}"


def _generate_weekly_insight(
    week_label: str,
    pnl: Dict[str, Any],
    wow: Optional[Dict[str, Any]],
    top_products: List[Dict[str, Any]],
    returns_val: float,
    currency: str = "₦",
) -> str:
    """Generates an executive narrative commentary scaled to the week's performance."""
    rev = pnl["gross_sales_revenue"]
    gp = pnl["gross_profit"]
    gp_pct = pnl["gross_margin_pct"]
    np_val = pnl["net_profit"]
    np_pct = pnl["net_margin_pct"]

    rev_str = _format_money(rev, currency)
    gp_str = _format_money(gp, currency)
    np_str = _format_money(np_val, currency)

    sentences = []

    # WoW velocity
    if wow and wow.get("has_previous"):
        rev_pct = wow["revenue_diff_pct"]
        direction = "up" if rev_pct >= 0 else "down"
        sign = "+" if rev_pct >= 0 else ""
        sentences.append(
            f"{week_label} generated {rev_str} in gross sales revenue ({sign}{rev_pct:.1f}% WoW)."
        )
    else:
        sentences.append(f"{week_label} opened the observation period with {rev_str} in gross sales revenue.")

    # Top product drivers
    if top_products:
        top_names = [p["product_raw"] for p in top_products[:2]]
        top_share = sum(p["pct_of_week_revenue"] for p in top_products[:2])
        sentences.append(
            f"Volume was led by {', '.join(top_names)}, contributing {top_share * 100.0:.1f}% of weekly turnover."
        )

    # Margins and profitability
    if returns_val > 0:
        ret_str = _format_money(returns_val, currency)
        sentences.append(
            f"Sales returns absorbed {ret_str}. Gross profit closed at {gp_str} ({gp_pct:.1f}% margin), "
            f"yielding a net operating profit of {np_str} ({np_pct:.1f}% net margin) after operating overhead."
        )
    else:
        sentences.append(
            f"Gross profit reached {gp_str} ({gp_pct:.1f}% margin) and net operating profit stood at {np_str} ({np_pct:.1f}% net margin)."
        )

    return " ".join(sentences)


def compute_weekly_financials(
    invoices_df: Optional[pd.DataFrame] = None,
    line_items_df: Optional[pd.DataFrame] = None,
    df_returns: Optional[pd.DataFrame] = None,
    df_expenses: Optional[pd.DataFrame] = None,
    profile: Optional[ClientProfile] = None,
    expenses_total: float = 0.0,
    week_mode: str = "calendar",  # 'calendar' (Mon-Sun) or 'trading' (7-day cycles from day 1)
    inv_df: Optional[pd.DataFrame] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    Computes complete weekly financial reporting, applying the full P&L calculation chain.
    """
    if invoices_df is None and inv_df is not None:
        invoices_df = inv_df

    if profile is None:
        profile = kane_jones_profile()

    currency = getattr(profile, "currency_symbol", "₦")

    if invoices_df is None or invoices_df.empty:
        return {
            "calendar_weeks": [],
            "trading_weeks": [],
            "active_mode": week_mode,
            "period_summary": {},
        }

    inv = invoices_df.copy()
    if not pd.api.types.is_datetime64_any_dtype(inv["date"]):
        inv["date"] = pd.to_datetime(inv["date"], errors="coerce")
    inv = inv.dropna(subset=["date"]).sort_values("date")

    if inv.empty:
        return {
            "calendar_weeks": [],
            "trading_weeks": [],
            "active_mode": week_mode,
            "period_summary": {},
        }

    # Ensure numeric columns
    inv["gross_revenue"] = pd.to_numeric(inv["gross_revenue"], errors="coerce").fillna(0.0)
    inv["invoice_cost"] = pd.to_numeric(inv.get("invoice_cost", 0.0), errors="coerce").fillna(0.0)
    inv["gross_profit"] = pd.to_numeric(inv.get("gross_profit", 0.0), errors="coerce").fillna(0.0)

    # Clean line items
    li = pd.DataFrame()
    if line_items_df is not None and not line_items_df.empty:
        li = line_items_df.copy()
        if not pd.api.types.is_datetime64_any_dtype(li["date"]):
            li["date"] = pd.to_datetime(li["date"], errors="coerce")
        li["quantity"] = pd.to_numeric(li["quantity"], errors="coerce").fillna(0.0)
        li["rate"] = pd.to_numeric(li["rate"], errors="coerce").fillna(0.0)
        li["cost"] = pd.to_numeric(li.get("cost", 0.0), errors="coerce").fillna(0.0)
        li["line_revenue"] = li["quantity"] * li["rate"]

    # Clean returns
    ret = pd.DataFrame()
    if df_returns is not None and not df_returns.empty:
        ret = df_returns.copy()
        if "date" in ret.columns and not pd.api.types.is_datetime64_any_dtype(ret["date"]):
            ret["date"] = pd.to_datetime(ret["date"], errors="coerce")
        ret["return_value"] = pd.to_numeric(ret.get("return_value", 0.0), errors="coerce").fillna(0.0)
        ret["quantity"] = pd.to_numeric(ret.get("quantity", 0.0), errors="coerce").fillna(0.0)

    # Clean expenses
    exp_df = pd.DataFrame()
    total_period_expenses = float(expenses_total or 0.0)
    if df_expenses is not None and not df_expenses.empty:
        exp_df = df_expenses.copy()
        exp_df["amount"] = pd.to_numeric(exp_df.get("amount", 0.0), errors="coerce").fillna(0.0)
        if total_period_expenses == 0.0:
            total_period_expenses = float(exp_df["amount"].sum())

    min_date = inv["date"].min().normalize()
    max_date = inv["date"].max().normalize()
    total_period_days = max(1, (max_date - min_date).days + 1)

    # --- Mode 1: Calendar Weeks (Mon-Sun bounded) ---
    def build_calendar_weeks() -> List[Dict[str, Any]]:
        # Find every Monday start on or before min_date
        current_start = min_date - pd.Timedelta(days=min_date.weekday())  # Monday of first week
        week_slices = []
        week_idx = 1

        while current_start <= max_date:
            current_end = current_start + pd.Timedelta(days=6)  # Sunday
            # Clip to actual period boundaries for labelling & day count
            effective_start = max(min_date, current_start)
            effective_end = min(max_date, current_end)

            if effective_start <= effective_end:
                week_slices.append({
                    "week_number": week_idx,
                    "label": f"Week {week_idx} ({effective_start.strftime('%d %b')} – {effective_end.strftime('%d %b')})",
                    "start_date": effective_start,
                    "end_date": effective_end,
                    "calendar_days": (effective_end - effective_start).days + 1,
                })
                week_idx += 1
            current_start += pd.Timedelta(days=7)

        return week_slices

    # --- Mode 2: Trading Weeks (7-day blocks starting from day 1) ---
    def build_trading_weeks() -> List[Dict[str, Any]]:
        week_slices = []
        week_idx = 1
        current_start = min_date

        while current_start <= max_date:
            current_end = min(max_date, current_start + pd.Timedelta(days=6))
            week_slices.append({
                "week_number": week_idx,
                "label": f"Trading Wk {week_idx} ({current_start.strftime('%d %b')} – {current_end.strftime('%d %b')})",
                "start_date": current_start,
                "end_date": current_end,
                "calendar_days": (current_end - current_start).days + 1,
            })
            week_idx += 1
            current_start = current_end + pd.Timedelta(days=1)

        return week_slices

    def process_weeks(slices: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        reports = []
        prev_pnl = None

        for sl in slices:
            w_start = sl["start_date"]
            w_end = sl["end_date"] + pd.Timedelta(days=1) - pd.Timedelta(nanoseconds=1)  # end of day
            w_days = sl["calendar_days"]

            # Filter data for this week
            w_inv = inv[(inv["date"] >= w_start) & (inv["date"] <= w_end)]
            w_inv_nos = set(w_inv["invoice_no"].unique()) if not w_inv.empty else set()

            if not li.empty:
                w_li = li[(li["date"] >= w_start) & (li["date"] <= w_end)]
                if w_li.empty and w_inv_nos:
                    w_li = li[li["invoice_no"].isin(w_inv_nos)]
            else:
                w_li = pd.DataFrame()

            # Filter returns for this week
            w_ret = pd.DataFrame()
            if not ret.empty:
                if "date" in ret.columns and ret["date"].notna().any():
                    w_ret = ret[(ret["date"] >= w_start) & (ret["date"] <= w_end)]
                else:
                    # Allocate proportional to sales revenue if returns are undated
                    w_rev_share = (w_inv["gross_revenue"].sum() / inv["gross_revenue"].sum()) if inv["gross_revenue"].sum() > 0 else (w_days / total_period_days)
                    w_ret = ret.copy()
                    w_ret["return_value"] = w_ret["return_value"] * w_rev_share
                    w_ret["quantity"] = w_ret["quantity"] * w_rev_share

            # 1. Gross Revenue
            gross_revenue = float(w_inv["gross_revenue"].sum()) if not w_inv.empty else 0.0

            # 2. Sales Returns
            sales_returns = float(w_ret["return_value"].sum()) if not w_ret.empty else 0.0
            prod_returns_val = float(w_ret[w_ret.get("item_type", "") == "Product"]["return_value"].sum()) if not w_ret.empty and "item_type" in w_ret.columns else sales_returns
            emp_returns_val = float(w_ret[w_ret.get("item_type", "") == "Empties"]["return_value"].sum()) if not w_ret.empty and "item_type" in w_ret.columns else 0.0

            # 3. Net Revenue
            net_revenue = gross_revenue - sales_returns

            # 4. COGS
            if not w_inv.empty and "invoice_cost" in w_inv.columns and w_inv["invoice_cost"].sum() > 0:
                cogs = float(w_inv["invoice_cost"].sum())
            elif not w_li.empty and "cost" in w_li.columns:
                cogs = float(w_li["cost"].sum())
            else:
                cogs = 0.0

            # 5. Gross Profit
            gross_profit = net_revenue - cogs
            gross_margin_pct = (gross_profit / net_revenue * 100.0) if net_revenue > 0 else 0.0

            # 6. Weekly Operating Expenses
            # If expenses have dated rows, filter; otherwise allocate by calendar days in week vs total period days
            if not exp_df.empty and "date" in exp_df.columns and exp_df["date"].notna().any():
                w_exp = exp_df[(exp_df["date"] >= w_start) & (exp_df["date"] <= w_end)]
                week_expenses = float(w_exp["amount"].sum())
                week_exp_categories = w_exp.groupby("category")["amount"].sum().reset_index().to_dict(orient="records")
            else:
                day_ratio = w_days / float(total_period_days)
                week_expenses = total_period_expenses * day_ratio
                week_exp_categories = []
                if not exp_df.empty:
                    for _, er in exp_df.iterrows():
                        cat = str(er.get("category", "General Operating Expenses")).strip()
                        cat_amt = float(er.get("amount", 0.0) or 0.0) * day_ratio
                        week_exp_categories.append({"category": cat, "amount": round(cat_amt, 2)})

            # 7. Net Profit
            net_profit = gross_profit - week_expenses
            net_margin_pct = (net_profit / net_revenue * 100.0) if net_revenue > 0 else 0.0

            invoices_count = int(len(w_inv))
            # Cases sold excluding empties
            if not w_li.empty:
                w_li_no_emp = w_li[~w_li["product_raw"].apply(lambda p: is_empties(p, profile))]
                cases_sold = float(w_li_no_emp["quantity"].sum())
            else:
                cases_sold = 0.0

            pnl = {
                "gross_sales_revenue": round(gross_revenue, 2),
                "total_sales_returns": round(sales_returns, 2),
                "product_returns_val": round(prod_returns_val, 2),
                "empties_returns_val": round(emp_returns_val, 2),
                "net_sales_revenue": round(net_revenue, 2),
                "cogs": round(cogs, 2),
                "gross_profit": round(gross_profit, 2),
                "gross_margin_pct": round(gross_margin_pct, 2),
                "total_operating_expenses": round(week_expenses, 2),
                "net_profit": round(net_profit, 2),
                "net_margin_pct": round(net_margin_pct, 2),
                "invoices_count": invoices_count,
                "cases_sold": round(cases_sold, 2),
            }

            # Week-over-Week (WoW) comparison
            if prev_pnl is not None:
                rev_diff = pnl["gross_sales_revenue"] - prev_pnl["gross_sales_revenue"]
                rev_pct = (rev_diff / prev_pnl["gross_sales_revenue"] * 100.0) if prev_pnl["gross_sales_revenue"] > 0 else 0.0

                gp_diff = pnl["gross_profit"] - prev_pnl["gross_profit"]
                gp_pct = (gp_diff / abs(prev_pnl["gross_profit"]) * 100.0) if prev_pnl["gross_profit"] != 0 else 0.0

                np_diff = pnl["net_profit"] - prev_pnl["net_profit"]
                np_pct = (np_diff / abs(prev_pnl["net_profit"]) * 100.0) if prev_pnl["net_profit"] != 0 else 0.0

                margin_bps = (pnl["gross_margin_pct"] - prev_pnl["gross_margin_pct"]) * 100.0

                wow = {
                    "has_previous": True,
                    "previous_week_number": prev_pnl.get("week_number"),
                    "revenue_diff": round(rev_diff, 2),
                    "revenue_diff_pct": round(rev_pct, 2),
                    "gross_profit_diff": round(gp_diff, 2),
                    "gross_profit_diff_pct": round(gp_pct, 2),
                    "net_profit_diff": round(np_diff, 2),
                    "net_profit_diff_pct": round(np_pct, 2),
                    "gross_margin_bps": round(margin_bps, 1),
                    "invoices_diff": pnl["invoices_count"] - prev_pnl["invoices_count"],
                    "cases_diff": round(pnl["cases_sold"] - prev_pnl["cases_sold"], 2),
                }
            else:
                wow = {
                    "has_previous": False,
                    "revenue_diff": 0.0,
                    "revenue_diff_pct": 0.0,
                    "gross_profit_diff": 0.0,
                    "gross_profit_diff_pct": 0.0,
                    "net_profit_diff": 0.0,
                    "net_profit_diff_pct": 0.0,
                    "gross_margin_bps": 0.0,
                    "invoices_diff": 0,
                    "cases_diff": 0.0,
                }

            # Supporting Breakdowns
            # 1. Daily audit rows
            daily_rows = []
            if not w_inv.empty:
                w_inv["date_only"] = w_inv["date"].dt.strftime("%Y-%m-%d")
                w_inv["day_name"] = w_inv["date"].dt.day_name()
                for d_str, d_grp in w_inv.groupby("date_only"):
                    d_rev = float(d_grp["gross_revenue"].sum())
                    d_cost = float(d_grp["invoice_cost"].sum())
                    d_gp = float(d_grp["gross_profit"].sum())
                    d_margin = (d_gp / d_rev * 100.0) if d_rev > 0 else 0.0
                    daily_rows.append({
                        "date": d_str,
                        "day_name": d_grp["day_name"].iloc[0],
                        "invoices_count": len(d_grp),
                        "gross_revenue": round(d_rev, 2),
                        "cogs": round(d_cost, 2),
                        "gross_profit": round(d_gp, 2),
                        "margin_pct": round(d_margin, 2),
                    })
                daily_rows.sort(key=lambda x: x["date"])

            # 2. Top products for week
            top_products = []
            if not w_li.empty:
                w_li_no_emp = w_li[~w_li["product_raw"].apply(lambda p: is_empties(p, profile))]
                prod_grp = w_li_no_emp.groupby("product_raw").agg(
                    cases_sold=("quantity", "sum"),
                    revenue=("line_revenue", "sum"),
                ).reset_index().sort_values("revenue", ascending=False)

                w_tot_rev = prod_grp["revenue"].sum()
                for _, r in prod_grp.head(10).iterrows():
                    p_rev = float(r["revenue"])
                    top_products.append({
                        "product_raw": r["product_raw"],
                        "cases_sold": round(float(r["cases_sold"]), 2),
                        "revenue": round(p_rev, 2),
                        "pct_of_week_revenue": round(p_rev / w_tot_rev, 4) if w_tot_rev > 0 else 0.0,
                    })

            # 3. Top customers for week
            top_customers = []
            if not w_inv.empty:
                cust_grp = w_inv.groupby("customer").agg(
                    invoices_count=("invoice_no", "count"),
                    revenue=("gross_revenue", "sum"),
                    cogs=("invoice_cost", "sum"),
                    gross_profit=("gross_profit", "sum"),
                ).reset_index().sort_values("revenue", ascending=False)

                w_tot_cust_rev = cust_grp["revenue"].sum()
                for _, cr in cust_grp.head(10).iterrows():
                    c_rev = float(cr["revenue"])
                    c_gp = float(cr["gross_profit"])
                    c_margin = (c_gp / c_rev * 100.0) if c_rev > 0 else 0.0
                    top_customers.append({
                        "customer": cr["customer"],
                        "invoices_count": int(cr["invoices_count"]),
                        "revenue": round(c_rev, 2),
                        "cogs": round(float(cr["cogs"]), 2),
                        "gross_profit": round(c_gp, 2),
                        "margin_pct": round(c_margin, 2),
                        "pct_of_week_revenue": round(c_rev / w_tot_cust_rev, 4) if w_tot_cust_rev > 0 else 0.0,
                    })

            # 4. Returns breakdown for week
            returns_breakdown = []
            if not w_ret.empty:
                for _, rr in w_ret.head(20).iterrows():
                    returns_breakdown.append({
                        "voucher_no": str(rr.get("voucher_no", "")),
                        "customer": str(rr.get("customer", "")),
                        "item_name": str(rr.get("item_name", "")),
                        "item_type": str(rr.get("item_type", "Product")),
                        "quantity": float(rr.get("quantity", 0.0) or 0.0),
                        "return_value": float(rr.get("return_value", 0.0) or 0.0),
                    })

            # 5. Narrative insight
            narrative = _generate_weekly_insight(
                week_label=sl["label"],
                pnl=pnl,
                wow=wow,
                top_products=top_products,
                returns_val=sales_returns,
                currency=currency,
            )

            report_item = {
                "week_number": sl["week_number"],
                "week_label": sl["label"],
                "date_range": {
                    "start": sl["start_date"].strftime("%Y-%m-%d"),
                    "end": sl["end_date"].strftime("%Y-%m-%d"),
                },
                "calendar_days": int(w_days),
                "pnl": pnl,
                "wow": wow,
                "narrative_insight": narrative,
                "daily_breakdown": daily_rows,
                "top_products": top_products,
                "top_customers": top_customers,
                "returns": returns_breakdown,
                "expenses": week_exp_categories,
            }

            reports.append(report_item)
            pnl["week_number"] = sl["week_number"]
            prev_pnl = pnl

        return reports

    calendar_weeks = process_weeks(build_calendar_weeks())
    trading_weeks = process_weeks(build_trading_weeks())

    return {
        "calendar_weeks": calendar_weeks,
        "trading_weeks": trading_weeks,
        "active_mode": week_mode,
        "period_summary": {
            "total_weeks": len(calendar_weeks),
            "period_start": min_date.strftime("%Y-%m-%d"),
            "period_end": max_date.strftime("%Y-%m-%d"),
            "total_calendar_days": total_period_days,
            "total_revenue": round(float(inv["gross_revenue"].sum()), 2),
            "total_gross_profit": round(float(inv["gross_profit"].sum()), 2),
            "total_operating_expenses": round(total_period_expenses, 2),
            "total_invoices": int(len(inv)),
        },
    }
