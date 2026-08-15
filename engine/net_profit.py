"""
Net Profit / Loss Bridge Module for Kane-Jones Depot.

Computes the official management bridge:
  Gross Sales Revenue (all invoices, incl. empties)
- Total Sales Returns (all credit notes, incl. empties)
= Net Sales Revenue
- Total Cost (invoice-embedded, incl. empties)
= Net Gross Profit / (Loss)
- Total Operating Expenses
= Net Operating Profit / (Loss)

Matches the exact structure of the 'Sales Return Analysis' reference sheet.
"""

from typing import Any, Dict, Optional, Tuple
import pandas as pd
import openpyxl
from engine.config import ClientProfile


def _parse_numeric(val: Any) -> Optional[float]:
    """Helper to cleanly parse numbers from formatted strings (e.g. '2,095,229', '₦10,000.00')."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).replace(",", "").replace("₦", "").replace("NGN", "").replace("$", "").replace("%", "").strip()
    try:
        return float(s)
    except Exception:
        return None


def parse_expenses_sheet(xlsx_path_or_wb: Any, profile: ClientProfile = None) -> Tuple[float, pd.DataFrame, list]:
    """
    Parses operating expenses from an expense workbook (e.g. july_expn.xlsx)
    or an in-workbook expenses sheet (e.g. 'July total Expenses', 'July Expenses threshold ', tmp6F17).
    
    Supports:
    1. Category / Summary Tables (Col 1 = Category, Col 2 = Amount, Grand Total row).
    2. Day-Book Ledger Format (Date, Category, Payment, Voucher Number, Amount).
    3. Content-based scanning across all sheets in the workbook.

    Returns:
    - total_expenses (float): Grand Total of all expenses (e.g. 2,095,229.00)
    - df_expenses (pd.DataFrame): Category breakdown
    - anomalies (list): Any parsing warnings
    """
    if isinstance(xlsx_path_or_wb, str):
        try:
            wb = openpyxl.load_workbook(xlsx_path_or_wb, data_only=True)
        except Exception:
            return 0.0, pd.DataFrame(), []
    elif hasattr(xlsx_path_or_wb, "sheetnames"):
        wb = xlsx_path_or_wb
    else:
        return 0.0, pd.DataFrame(), []

    anomalies = []
    
    # 1. Identify Candidate Sheets (Prioritizing clean expense summary sheets over ledgers)
    summary_candidates = []
    other_candidates = []
    
    for s in wb.sheetnames:
        clean = s.strip().lower()
        if any(kw in clean for kw in ["expense", "expn", "exp", "opex", "overhead", "spending"]):
            if any(skw in clean for kw in ["threshold", "summary", "total", "all", "cat"]):
                summary_candidates.append(s)
            else:
                other_candidates.append(s)
        elif any(kw in clean for kw in ["voucher", "payment", "6f17"]):
            other_candidates.append(s)
            
    # 2. Content scan fallback: check top rows of each sheet for expense headers
    for s in wb.sheetnames:
        if s in summary_candidates or s in other_candidates:
            continue
        clean = s.strip().lower()
        if any(skw in clean for skw in ["sales", "revenue", "price", "inventory", "aggregate", "customer", "marketer", "product"]):
            continue
        ws = wb[s]
        for r in range(1, min(ws.max_row or 1, 10) + 1):
            row_vals = [str(ws.cell(r, c).value or "").strip().lower() for c in range(1, min(ws.max_column or 1, 6) + 1)]
            if any("category" in v or "expense" in v or "particular" in v for v in row_vals) and any("amount" in v or "total" in v or "cost" in v for v in row_vals):
                summary_candidates.append(s)
                break

    candidate_sheets = summary_candidates + other_candidates

    # 3. Attempt parsing candidate sheets (Summary Table format first, then Day-book format)
    for sheet_name in candidate_sheets:
        ws = wb[sheet_name]
        
        # Check if first row/header looks like DayBook (VOUCHER DATE, DEBIT, CREDIT)
        is_daybook = False
        for r in range(1, min(ws.max_row or 1, 6) + 1):
            row_vals = [str(ws.cell(r, c).value or "").strip().upper() for c in range(1, min(ws.max_column or 1, 8) + 1)]
            if "VOUCHER DATE" in row_vals or "VCH TYPE" in row_vals or "DEBIT AMOUNT" in row_vals:
                is_daybook = True
                break
                
        if not is_daybook:
            # Test Format A: Category / Summary Table (e.g. 'July total Expenses', 'July Expenses threshold ')
            categories = []
            grand_total = 0.0
            is_summary_format = False
            
            for r in range(1, (ws.max_row or 1) + 1):
                c1 = ws.cell(r, 1).value
                c2 = ws.cell(r, 2).value
                if c1 is None and c2 is None:
                    continue
                str_c1 = str(c1 or "").strip()
                str_c2 = str(c2 or "").strip()
                
                # Header check
                if "category" in str_c1.lower() and ("amount" in str_c2.lower() or "%" in str_c2.lower() or "cost" in str_c2.lower()):
                    is_summary_format = True
                    continue
                    
                val2 = _parse_numeric(c2)
                # Grand Total check
                if "grand total" in str_c1.lower() or "total expense" in str_c1.lower() or (str_c1.lower() == "total" and val2 is not None):
                    is_summary_format = True
                    if val2 is not None and val2 > 0:
                        grand_total = val2
                    continue
                    
                # Category line item
                if str_c1 and val2 is not None and val2 > 0 and not str_c1.startswith("---"):
                    # Avoid day-book header / date rows
                    if not str_c1.lower().startswith("voucher") and not str_c1.lower().startswith("date") and not str_c1.lower().startswith("vch"):
                        categories.append({
                            "category": str_c1,
                            "amount": val2,
                            "source_row": r,
                        })
                        
            if categories and (is_summary_format or len(categories) >= 2):
                df_exp = pd.DataFrame(categories)
                if grand_total == 0.0 and not df_exp.empty:
                    grand_total = float(df_exp["amount"].sum())
                return grand_total, df_exp, anomalies

        # Test Format B: Day-Book Ledger Format (e.g. 'tmp6F17')
        daybook_expenses = []
        daybook_total = 0.0
        
        for r in range(1, (ws.max_row or 1) + 1):
            c1 = ws.cell(r, 1).value
            c2 = ws.cell(r, 2).value
            c4 = ws.cell(r, 4).value
            c5 = ws.cell(r, 5).value
            c6 = ws.cell(r, 6).value

            if c5 and "TOTAL" in str(c5).upper():
                total_parsed = _parse_numeric(c6)
                if total_parsed is not None:
                    daybook_total = total_parsed
                continue

            if c6 is not None:
                amt = _parse_numeric(c6)
                c4_str = str(c4).strip().lower() if c4 else ""
                c2_str = str(c2).strip() if c2 else "General"
                if amt is not None and amt > 0:
                    if c4_str in ("payment", "journal") or "journal" in c2_str.lower() or (c1 and c2):
                        daybook_expenses.append({
                            "date": str(c1)[:10] if c1 else "",
                            "category": c2_str,
                            "voucher_no": str(c5).strip() if c5 else "",
                            "amount": amt,
                            "source_row": r
                        })

        if daybook_expenses:
            df_daybook = pd.DataFrame(daybook_expenses)
            if daybook_total == 0.0 and not df_daybook.empty:
                daybook_total = float(df_daybook["amount"].sum())
            return daybook_total, df_daybook, anomalies

    return 0.0, pd.DataFrame(), anomalies


def compute_net_profit_bridge(
    invoices_df: pd.DataFrame,
    line_items_df: pd.DataFrame,
    df_returns: pd.DataFrame,
    expenses_total: float = 0.0,
    profile: ClientProfile = None
) -> Dict[str, Any]:
    """
    Computes the complete Net Profit / Loss bridge from raw transaction data.

    Returns a dict containing:
    - gross_sales_revenue (incl. empties)
    - total_sales_returns (incl. empties)
    - net_sales_revenue
    - total_cost (product cost only, excl. empties deposits)
    - net_gross_profit_loss (net sales - product COGS)
    - net_gross_margin_pct
    - total_operating_expenses
    - net_operating_profit_loss
    - product_returns_value
    - empties_returns_value
    - product_returns_qty
    - empties_returns_qty
    - return_rate (returns / gross_sales_revenue)
    """
    if profile is None:
        from engine.config import kane_jones_profile
        profile = kane_jones_profile()

    gross_sales_revenue = float(line_items_df["quantity"].mul(line_items_df["rate"]).sum()) if not line_items_df.empty else 0.0
    if gross_sales_revenue == 0.0 and invoices_df is not None and not invoices_df.empty:
        gross_sales_revenue = float(invoices_df["gross_revenue"].sum())

    # Total Product Cost (COGS, strictly excluding empties container deposits)
    empties_kws = [k.lower() for k in (getattr(profile, "empties_keywords", []) or [])]
    if not line_items_df.empty and "product_raw" in line_items_df.columns:
        is_empties = line_items_df["product_raw"].astype(str).str.lower().apply(
            lambda p: any(kw in p for kw in empties_kws)
        )
        product_lines = line_items_df[~is_empties]
        total_cost_product = float(product_lines["cost"].sum()) if not product_lines.empty else 0.0
    else:
        total_cost_product = float(line_items_df["cost"].sum()) if not line_items_df.empty else 0.0

    if total_cost_product == 0.0 and invoices_df is not None and not invoices_df.empty and "invoice_cost" in invoices_df.columns:
        total_cost_product = float(invoices_df["invoice_cost"].sum())

    # Sales returns breakdown
    total_sales_returns = 0.0
    product_returns_val = 0.0
    product_returns_qty = 0.0
    empties_returns_val = 0.0
    empties_returns_qty = 0.0

    if df_returns is not None and not df_returns.empty:
        total_sales_returns = float(df_returns["return_value"].sum())
        prod_ret = df_returns[df_returns["item_type"] == "Product"]
        emp_ret = df_returns[df_returns["item_type"] == "Empties"]
        product_returns_val = float(prod_ret["return_value"].sum())
        product_returns_qty = float(prod_ret["quantity"].sum())
        empties_returns_val = float(emp_ret["return_value"].sum())
        empties_returns_qty = float(emp_ret["quantity"].sum())

    net_sales_revenue = gross_sales_revenue - total_sales_returns
    net_gross_profit_loss = net_sales_revenue - total_cost_product
    net_gross_margin_pct = (net_gross_profit_loss / net_sales_revenue) if net_sales_revenue > 0 else 0.0
    return_rate = (total_sales_returns / gross_sales_revenue) if gross_sales_revenue > 0 else 0.0

    net_operating_profit_loss = net_gross_profit_loss - (expenses_total or 0.0)
    net_operating_margin_pct = (net_operating_profit_loss / net_sales_revenue) if net_sales_revenue > 0 else 0.0

    return {
        "gross_sales_revenue": gross_sales_revenue,
        "total_sales_returns": total_sales_returns,
        "net_sales_revenue": net_sales_revenue,
        "total_cost": total_cost_product,
        "total_cost_embedded": total_cost_product,  # alias for backwards compatibility
        "net_gross_profit_loss": net_gross_profit_loss,
        "net_gross_margin_pct": net_gross_margin_pct,
        "total_operating_expenses": float(expenses_total or 0.0),
        "net_operating_profit_loss": net_operating_profit_loss,
        "net_operating_margin_pct": net_operating_margin_pct,
        "product_returns_value": product_returns_val,
        "product_returns_qty": product_returns_qty,
        "empties_returns_value": empties_returns_val,
        "empties_returns_qty": empties_returns_qty,
        "return_rate": return_rate,
    }
