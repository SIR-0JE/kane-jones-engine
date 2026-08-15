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


def parse_expenses_sheet(xlsx_path_or_wb: Any, profile: ClientProfile = None) -> Tuple[float, pd.DataFrame, list]:
    """
    Parses operating expenses from an expense workbook (e.g. july_expn.xlsx)
    or an in-workbook expenses sheet (e.g. 'July Expenses threshold ' or tmp6F17).
    
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
    
    # 1. Priority 1: Check for clean expense summary/threshold sheet (e.g. 'July Expenses threshold ')
    threshold_sheet = None
    for s in wb.sheetnames:
        clean = s.strip().lower()
        if "expense" in clean and ("threshold" in clean or "summary" in clean):
            threshold_sheet = s
            break
            
    if threshold_sheet:
        ws = wb[threshold_sheet]
        categories = []
        grand_total = 0.0
        for r in range(1, ws.max_row + 1):
            c1 = ws.cell(r, 1).value
            c2 = ws.cell(r, 2).value
            if not c1:
                continue
            str_c1 = str(c1).strip()
            if "category" in str_c1.lower():
                continue
            if "grand total" in str_c1.lower() or "total" in str_c1.lower():
                if c2 is not None:
                    try:
                        grand_total = float(str(c2).replace(",", ""))
                    except Exception:
                        pass
                continue
            if c2 is not None:
                try:
                    amt = float(str(c2).replace(",", ""))
                    categories.append({
                        "category": str_c1,
                        "amount": amt,
                        "source_row": r,
                    })
                except Exception:
                    pass
        df_exp = pd.DataFrame(categories)
        if grand_total == 0.0 and not df_exp.empty:
            grand_total = float(df_exp["amount"].sum())
        return grand_total, df_exp, anomalies

    # 2. Priority 2: Check for day-book expense sheet (e.g. 'tmp6F17' or sheets with 'exp')
    sheet_name = None
    target_name = getattr(profile, "expenses_sheet", "tmp6F17") if profile else "tmp6F17"
    if target_name in wb.sheetnames:
        sheet_name = target_name
    else:
        for name in wb.sheetnames:
            if "exp" in name.lower() or "6f17" in name.lower():
                sheet_name = name
                break

    if not sheet_name:
        return 0.0, pd.DataFrame(), anomalies

    ws = wb[sheet_name]
    expenses = []
    total_val = 0.0

    for r in range(1, ws.max_row + 1):
        c1 = ws.cell(r, 1).value
        c2 = ws.cell(r, 2).value
        c4 = ws.cell(r, 4).value
        c5 = ws.cell(r, 5).value
        c6 = ws.cell(r, 6).value

        # Check total row
        if c5 and "TOTAL" in str(c5).upper():
            if c6 is not None:
                try:
                    total_val = float(str(c6).replace(",", ""))
                except Exception:
                    pass
            continue

        if c6 is not None:
            c4_str = str(c4).strip().lower() if c4 else ""
            c2_str = str(c2).strip() if c2 else "General"
            if c4_str in ("payment", "journal") or "journal" in c2_str.lower() or (c1 and c2):
                try:
                    amt = float(str(c6).replace(",", ""))
                    expenses.append({
                        "date": str(c1)[:10] if c1 else "",
                        "category": c2_str,
                        "voucher_no": str(c5).strip() if c5 else "",
                        "amount": amt,
                        "row": r
                    })
                except Exception:
                    pass

    df_exp = pd.DataFrame(expenses)
    if total_val == 0.0 and not df_exp.empty:
        total_val = float(df_exp["amount"].sum())

    return total_val, df_exp, anomalies


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
    - total_cost (invoice-embedded, incl. empties)
    - net_gross_profit_loss
    - net_gross_margin_pct
    - total_operating_expenses
    - net_operating_profit_loss
    - product_returns_value
    - empties_returns_value
    - product_returns_qty
    - empties_returns_qty
    - return_rate (returns / gross_sales_revenue)
    """
    gross_sales_revenue = float(line_items_df["quantity"].mul(line_items_df["rate"]).sum()) if not line_items_df.empty else 0.0
    if gross_sales_revenue == 0.0 and invoices_df is not None and not invoices_df.empty:
        gross_sales_revenue = float(invoices_df["gross_revenue"].sum())

    # Total cost (invoice-embedded, incl. empties)
    total_cost_embedded = float(line_items_df["cost"].sum()) if not line_items_df.empty else 0.0
    if total_cost_embedded == 0.0 and invoices_df is not None and not invoices_df.empty and "invoice_cost" in invoices_df.columns:
        total_cost_embedded = float(invoices_df["invoice_cost"].sum())

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
    net_gross_profit_loss = net_sales_revenue - total_cost_embedded
    net_gross_margin_pct = (net_gross_profit_loss / net_sales_revenue) if net_sales_revenue > 0 else 0.0
    return_rate = (total_sales_returns / gross_sales_revenue) if gross_sales_revenue > 0 else 0.0

    net_operating_profit_loss = net_gross_profit_loss - (expenses_total or 0.0)

    return {
        "gross_sales_revenue": gross_sales_revenue,
        "total_sales_returns": total_sales_returns,
        "net_sales_revenue": net_sales_revenue,
        "total_cost_embedded": total_cost_embedded,
        "net_gross_profit_loss": net_gross_profit_loss,
        "net_gross_margin_pct": net_gross_margin_pct,
        "total_operating_expenses": float(expenses_total or 0.0),
        "net_operating_profit_loss": net_operating_profit_loss,
        "product_returns_value": product_returns_val,
        "product_returns_qty": product_returns_qty,
        "empties_returns_value": empties_returns_val,
        "empties_returns_qty": empties_returns_qty,
        "return_rate": return_rate,
    }
