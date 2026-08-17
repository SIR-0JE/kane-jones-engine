"""
The actual "intelligence" layer. Takes the parsed + price-matched data and produces
the numbers the report is built from:
  - below-floor pricing (avg rate charged vs. distributor price, per product)
  - volume-tier pricing audit (does order size match the price tier charged?)
  - daily / weekly revenue & margin trend
  - product revenue ranking + concentration
  - customer revenue ranking + concentration + negative-margin flagging

Every function here returns a DataFrame — nothing is pre-rendered to text. The report
narration (LLM call) and the dashboard both read from these same tables, so the numbers
a user sees on screen and in the downloaded doc can never drift apart.
"""

import pandas as pd
import numpy as np
from engine.config import ClientProfile


def is_empties(product_raw: str, profile: ClientProfile) -> bool:
    if not isinstance(product_raw, str):
        return False
    p = product_raw.upper()
    return any(kw in p for kw in profile.empties_keywords)


def below_floor_pricing(matched_line_items: pd.DataFrame, profile: ClientProfile) -> pd.DataFrame:
    if matched_line_items is None or matched_line_items.empty or "matched_sku" not in matched_line_items.columns:
        return pd.DataFrame(columns=["product_raw", "cases_sold", "avg_rate_charged", "distributor_price", "gap_pct", "revenue_opportunity"])
    df = matched_line_items[matched_line_items["matched_sku"].notna()].copy()
    if df.empty or "distributor_price" not in df.columns:
        return pd.DataFrame(columns=["product_raw", "cases_sold", "avg_rate_charged", "distributor_price", "gap_pct", "revenue_opportunity"])
    df = df[~df["product_raw"].apply(lambda p: is_empties(p, profile))]
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0)
    df["rate"] = pd.to_numeric(df["rate"], errors="coerce").fillna(0)
    df["distributor_price"] = pd.to_numeric(df["distributor_price"], errors="coerce")
    df = df.dropna(subset=["distributor_price"])
    if df.empty:
        return pd.DataFrame(columns=["product_raw", "cases_sold", "avg_rate_charged", "distributor_price", "gap_pct", "revenue_opportunity"])

    grouped = df.groupby("product_raw").apply(
        lambda g: pd.Series({
            "cases_sold": g["quantity"].sum(),
            "avg_rate_charged": np.average(g["rate"], weights=g["quantity"]) if g["quantity"].sum() > 0 else g["rate"].mean(),
            "distributor_price": g["distributor_price"].iloc[0],
        }),
        include_groups=False,
    ).reset_index()

    grouped = grouped.dropna(subset=["distributor_price"])
    if grouped.empty:
        return pd.DataFrame(columns=["product_raw", "cases_sold", "avg_rate_charged", "distributor_price", "gap_pct", "revenue_opportunity"])

    grouped["gap_pct"] = (grouped["avg_rate_charged"] - grouped["distributor_price"]) / grouped["distributor_price"]
    grouped["revenue_opportunity"] = (grouped["distributor_price"] - grouped["avg_rate_charged"]) * grouped["cases_sold"]

    below_floor = grouped[grouped["avg_rate_charged"] < grouped["distributor_price"]].copy()
    return below_floor.sort_values("revenue_opportunity", ascending=False)


def volume_tier_audit(matched_line_items: pd.DataFrame, profile: ClientProfile) -> pd.DataFrame:
    if matched_line_items is None or matched_line_items.empty or "matched_sku" not in matched_line_items.columns:
        return pd.DataFrame()
    df = matched_line_items[matched_line_items["matched_sku"].notna()].copy()
    if df.empty:
        return pd.DataFrame()
    df = df[~df["product_raw"].apply(lambda p: is_empties(p, profile))]
    if df.empty:
        return pd.DataFrame()
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0)
    df["rate"] = pd.to_numeric(df["rate"], errors="coerce").fillna(0)

    def expected_tier(qty):
        for lo, hi, tier in profile.volume_tiers:
            if hi is None and qty >= lo:
                return tier
            if hi is not None and lo <= qty <= hi:
                return tier
        return None

    tier_price_col = {"distributor": "distributor_price", "sub_distributor": "sub_distributor_price",
                       "retail": "retail_price"}

    df["expected_tier"] = df["quantity"].apply(expected_tier)
    df["expected_price"] = df.apply(
        lambda r: r.get(tier_price_col.get(r["expected_tier"])) if r["expected_tier"] else None, axis=1
    )
    df["expected_price"] = pd.to_numeric(df["expected_price"], errors="coerce")

    df = df.dropna(subset=["expected_price"])
    df["price_diff"] = df["rate"] - df["expected_price"]
    df["price_diff_pct"] = df["price_diff"] / df["expected_price"]

    def classify(pct):
        if pct < -0.01:
            return "underpriced"
        if pct > 0.01:
            return "overpriced"
        return "correct"

    df["audit_result"] = df["price_diff_pct"].apply(classify)
    df["revenue_impact"] = df["price_diff"] * df["quantity"]
    return df


def daily_summary(invoices_df: pd.DataFrame) -> pd.DataFrame:
    df = invoices_df.copy()
    df["date_only"] = df["date"].dt.date
    daily = df.groupby("date_only").agg(
        revenue=("gross_revenue", "sum"),
        gross_profit=("gross_profit", "sum"),
        invoices=("invoice_no", "count"),
    ).reset_index()
    daily["margin_pct"] = daily["gross_profit"] / daily["revenue"]
    return daily.sort_values("date_only")


def weekly_summary(daily_df: pd.DataFrame) -> pd.DataFrame:
    df = daily_df.copy()
    df["date_only"] = pd.to_datetime(df["date_only"])
    df["week"] = ((df["date_only"].dt.day - 1) // 7) + 1
    weekly = df.groupby("week").agg(
        revenue=("revenue", "sum"),
        gross_profit=("gross_profit", "sum"),
        invoices=("invoices", "sum"),
    ).reset_index()
    weekly["margin_pct"] = weekly["gross_profit"] / weekly["revenue"]
    return weekly


def product_revenue_ranking(matched_line_items: pd.DataFrame, profile: ClientProfile) -> pd.DataFrame:
    df = matched_line_items[~matched_line_items["product_raw"].apply(lambda p: is_empties(p, profile))].copy()
    df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(0)
    df["rate"] = pd.to_numeric(df["rate"], errors="coerce").fillna(0)
    df["line_revenue"] = df["quantity"] * df["rate"]

    ranked = df.groupby("product_raw").agg(
        cases_sold=("quantity", "sum"),
        revenue=("line_revenue", "sum"),
    ).reset_index().sort_values("revenue", ascending=False)

    total_revenue = ranked["revenue"].sum()
    ranked["pct_of_total"] = ranked["revenue"] / total_revenue if total_revenue else 0.0
    threshold = profile.product_dominance_threshold if hasattr(profile, "product_dominance_threshold") else 0.20
    ranked["is_dominant"] = ranked["pct_of_total"] >= threshold
    return ranked


def dominant_products(ranking_df: pd.DataFrame, profile: ClientProfile = None) -> pd.DataFrame:
    """Returns products whose revenue share exceeds the dominance threshold (concentration risk)."""
    threshold = 0.20
    if profile is not None and hasattr(profile, "product_dominance_threshold"):
        threshold = profile.product_dominance_threshold
    dominant = ranking_df[ranking_df["pct_of_total"] >= threshold].copy()
    return dominant.sort_values("pct_of_total", ascending=False)


def customer_margin_detail(invoices_df: pd.DataFrame) -> pd.DataFrame:
    df = invoices_df.groupby("customer").agg(
        invoices=("invoice_no", "count"),
        revenue=("gross_revenue", "sum"),
        cost=("invoice_cost", "sum"),
        gross_profit=("gross_profit", "sum"),
    ).reset_index().sort_values("revenue", ascending=False)
    df["margin_pct"] = df["gross_profit"] / df["revenue"]
    total_revenue = df["revenue"].sum()
    df["pct_of_total_revenue"] = df["revenue"] / total_revenue if total_revenue else 0.0
    df["is_loss_making"] = df["gross_profit"] < 0
    return df


def loss_making_invoices(invoices_df: pd.DataFrame) -> pd.DataFrame:
    """Surfaces all individual invoices with negative gross profit."""
    loss_df = invoices_df[invoices_df["gross_profit"] < 0].copy()
    cols = [c for c in ["invoice_no", "source_tab", "date", "customer", "gross_revenue", "invoice_cost", "gross_profit", "pct_profit"] if c in loss_df.columns]
    if cols:
        loss_df = loss_df[cols]
    return loss_df.sort_values("gross_profit", ascending=True)


def loss_making_customers(customer_margin_or_invoices_df: pd.DataFrame) -> pd.DataFrame:
    """Surfaces customer accounts with net negative gross profit."""
    if "invoices" in customer_margin_or_invoices_df.columns and "gross_profit" in customer_margin_or_invoices_df.columns:
        df = customer_margin_or_invoices_df
    else:
        df = customer_margin_detail(customer_margin_or_invoices_df)
    loss_df = df[df["gross_profit"] < 0].copy()
    return loss_df.sort_values("gross_profit", ascending=True)


def reconciliation_check(invoices_df: pd.DataFrame, line_items_df: pd.DataFrame, profile: ClientProfile = None) -> pd.DataFrame:
    """Compares invoice-level gross_revenue against sum(quantity * rate) of its line items.
    Flags any invoice where difference exceeds configurable tolerance (1% or fixed min naira)."""
    tol_pct = 0.01
    min_amount = 100.0
    if profile is not None:
        if hasattr(profile, "reconciliation_tolerance_pct"):
            tol_pct = profile.reconciliation_tolerance_pct
        if hasattr(profile, "reconciliation_min_tolerance_amount"):
            min_amount = profile.reconciliation_min_tolerance_amount

    li = line_items_df.copy()
    li["quantity"] = pd.to_numeric(li["quantity"], errors="coerce").fillna(0.0)
    li["rate"] = pd.to_numeric(li["rate"], errors="coerce").fillna(0.0)
    li["line_rev"] = li["quantity"] * li["rate"]

    line_rev_sum = li.groupby("invoice_no")["line_rev"].sum().reset_index().rename(
        columns={"line_rev": "computed_line_revenue"}
    )

    inv = invoices_df.copy()
    inv["gross_revenue"] = pd.to_numeric(inv["gross_revenue"], errors="coerce").fillna(0.0)

    merged = inv.merge(line_rev_sum, on="invoice_no", how="left")
    merged["computed_line_revenue"] = merged["computed_line_revenue"].fillna(0.0)
    merged["diff"] = merged["computed_line_revenue"] - merged["gross_revenue"]
    merged["abs_diff"] = merged["diff"].abs()
    merged["tolerance"] = np.maximum(merged["gross_revenue"].abs() * tol_pct, min_amount)
    merged["diff_pct"] = np.where(merged["gross_revenue"] != 0, merged["diff"] / merged["gross_revenue"], 0.0)
    merged["is_discrepancy"] = merged["abs_diff"] > merged["tolerance"]

    flagged = merged[merged["is_discrepancy"]].copy()
    cols = [c for c in ["invoice_no", "source_tab", "date", "customer", "gross_revenue", "computed_line_revenue", "diff", "diff_pct", "tolerance"] if c in flagged.columns]
    if cols:
        flagged = flagged[cols]
    return flagged.sort_values("diff", ascending=True)


def concentration_metrics(ranking_df: pd.DataFrame, top_n: int = 10) -> dict:
    total = ranking_df["revenue"].sum()
    top = ranking_df.nlargest(top_n, "revenue")["revenue"].sum()
    return {"top_n": top_n, "top_n_revenue": top, "total_revenue": total,
            "top_n_pct": top / total if total else 0}
