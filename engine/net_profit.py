"""
Net Profit / Loss Bridge Module for Kane-Jones Depot.

Computes the official management bridge:
  Gross Sales Revenue (all invoices, incl. empties)
- Total Sales Returns (all credit notes, incl. empties)
= Net Sales Revenue
- Net Product COGS (Invoiced product cost - Cost of returned goods credited back)
= Net Gross Profit / (Loss)
- Total Operating Expenses
= Net Operating Profit / (Loss)

Matches the exact structure of the 'Sales Return Analysis' reference sheet.
"""

from typing import Any, Dict, List, Optional, Tuple
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


def parse_expenses_sheet(
    xlsx_path_or_wb: Any,
    profile: ClientProfile = None,
    classification_report: Optional[Any] = None,
) -> Tuple[float, pd.DataFrame, List[Dict[str, Any]]]:
    """
    Parses operating expenses from an expense workbook (e.g. july_expn.xlsx)
    or an in-workbook expenses sheet (e.g. 'July total Expenses', 'July Expenses threshold ', tmp6F17).
    
    Supports:
    1. Category / Summary Tables (Col 1 = Category, Col 2 = Amount, Grand Total row).
    2. Day-Book Ledger Format (Date, Category, Payment, Voucher Number, Amount).
    Returns: (total_expenses, categories_df, anomalies)
    """
    if profile is None:
        from engine.config import kane_jones_profile
        profile = kane_jones_profile()

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
    candidate_sheets = []
    
    # 0. Check classification report if provided
    if classification_report is not None:
        exp_sheet = getattr(classification_report, "expenses_sheet", None)
        if exp_sheet and exp_sheet in wb.sheetnames:
            candidate_sheets.append(exp_sheet)
        else:
            # If classifier explicitly ran and classified NO expenses sheet, do not scan other non-expense sheets
            if not getattr(profile, "expenses_sheet", None) or profile.expenses_sheet not in wb.sheetnames:
                return 0.0, pd.DataFrame(), []

    # 1. Identify Candidate Sheets (Prioritizing clean expense summary sheets over ledgers)
    summary_candidates = []
    other_candidates = []
    
    # Exclude sheets known to be non-expenses
    excluded_sheets = set()
    if classification_report is not None:
        for s_name, c_info in getattr(classification_report, "classifications", {}).items():
            if c_info.role in ("sales_invoice", "inventory_cost", "sales_returns", "price_list"):
                excluded_sheets.add(s_name)
        for s_name in getattr(classification_report, "sales_sheets", []):
            excluded_sheets.add(s_name)
    
    for s in wb.sheetnames:
        if s in candidate_sheets or s in excluded_sheets:
            continue
        clean = s.strip().lower()
        if any(skw in clean for skw in ["sales", "revenue", "price", "inventory", "aggregate", "customer", "marketer", "product", "credit", "return", "cash", "gtb"]):
            continue
        if any(kw in clean for kw in ["expense", "expn", "exp", "opex", "overhead", "spending"]):
            if any(kw in clean for kw in ["threshold", "summary", "total", "all", "cat"]):
                summary_candidates.append(s)
            else:
                other_candidates.append(s)
        elif any(kw in clean for kw in ["voucher", "payment", "6f17"]):
            other_candidates.append(s)

    if not candidate_sheets:
        candidate_sheets = summary_candidates + other_candidates
    else:
        for s in summary_candidates + other_candidates:
            if s not in candidate_sheets:
                candidate_sheets.append(s)

    # 2. Attempt parsing candidate sheets (Summary Table format first, then Day-book format)
    for sheet_name in candidate_sheets:
        ws = wb[sheet_name]
        
        # Check if first row/header looks like DayBook (VOUCHER DATE, DEBIT, CREDIT)
        is_daybook = False
        for r in range(1, min(ws.max_row or 1, 6) + 1):
            row_vals = [str(ws.cell(r, c).value or "").strip().upper() for c in range(1, min(ws.max_column or 1, 8) + 1)]
            if "DAY BOOK" in row_vals or ("DEBIT" in row_vals and "CREDIT" in row_vals and "VCH TYPE" in row_vals):
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
        if is_daybook:
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
                        if c4_str in ("payment", "journal") or "journal" in c2_str.lower():
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
    df_inv: Optional[pd.DataFrame] = None,
    cost_of_returns: Optional[float] = None,
    profile: ClientProfile = None
) -> Dict[str, Any]:
    """
    Computes the complete Net Profit / Loss bridge from raw transaction data.

    Follows the official company-level management bridge:
      Gross Sales Revenue (all 944 lines, incl. empties)
    - Total Sales Returns (all 177 credit notes, incl. empties)
    = Net Sales Revenue
    - Net Invoiced COGS (Full invoice-embedded cost - Cost of returned product & empties credited back)
    = Net Gross Profit / (Loss)
    - Total Operating Expenses (from clean Category Summary Grand Total)
    = Net Operating Profit / (Loss)
    """
    if profile is None:
        from engine.config import kane_jones_profile
        profile = kane_jones_profile()

    gross_sales_revenue = float(line_items_df["quantity"].mul(line_items_df["rate"]).sum()) if not line_items_df.empty else 0.0
    if gross_sales_revenue == 0.0 and invoices_df is not None and not invoices_df.empty:
        gross_sales_revenue = float(invoices_df["gross_revenue"].sum())

    # Full Invoice-Embedded COGS (all lines including empties, matching invoice header total cost)
    if not line_items_df.empty and "cost" in line_items_df.columns:
        gross_embedded_cost = float(line_items_df["cost"].sum())
    elif invoices_df is not None and not invoices_df.empty and "invoice_cost" in invoices_df.columns:
        gross_embedded_cost = float(invoices_df["invoice_cost"].sum())
    else:
        gross_embedded_cost = 0.0

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
        product_returns_val = float(prod_ret["return_value"].sum()) if not prod_ret.empty else 0.0
        product_returns_qty = float(prod_ret["quantity"].sum()) if not prod_ret.empty else 0.0
        empties_returns_val = float(emp_ret["return_value"].sum()) if not emp_ret.empty else 0.0
        empties_returns_qty = float(emp_ret["quantity"].sum()) if not emp_ret.empty else 0.0

    # Calculate Cost of Returns Credited Back (Product + Empties on invoice-embedded basis)
    if cost_of_returns is None:
        cost_of_returns = 0.0
        if not line_items_df.empty and df_returns is not None and not df_returns.empty:
            # Build unit cost maps from invoice line items
            unit_cost_map = {}
            for p_name, grp in line_items_df.groupby("product_raw"):
                tot_q = grp["quantity"].sum()
                tot_c = grp["cost"].sum()
                if tot_q > 0:
                    unit_cost_map[str(p_name).strip().upper()] = tot_c / tot_q

            # Fallback to df_inv true cost if line items didn't have the product
            if df_inv is not None and not df_inv.empty:
                from engine.true_cost import build_inventory_cost_maps
                inv_cost_map, inv_dpp_map = build_inventory_cost_maps(df_inv)
                for k, v in inv_cost_map.items():
                    if k not in unit_cost_map:
                        unit_cost_map[k] = v
                for k, v in inv_dpp_map.items():
                    if k not in unit_cost_map:
                        unit_cost_map[k] = v

            for _, r in df_returns.iterrows():
                item_k = str(r.get("item_name", "")).strip().upper()
                unit_c = unit_cost_map.get(item_k, 0.0)
                qty = float(r.get("quantity", 0.0) or 0.0)
                cost_of_returns += (qty * unit_c)

    # Net COGS = Full Gross Embedded Cost - Total Returns Cost Credited Back
    net_cogs = gross_embedded_cost - cost_of_returns

    net_sales_revenue = gross_sales_revenue - total_sales_returns
    net_gross_profit_loss = net_sales_revenue - net_cogs
    net_gross_margin_pct = (net_gross_profit_loss / net_sales_revenue) if net_sales_revenue > 0 else 0.0
    return_rate = (total_sales_returns / gross_sales_revenue) if gross_sales_revenue > 0 else 0.0

    net_operating_profit_loss = net_gross_profit_loss - (expenses_total or 0.0)
    net_operating_margin_pct = (net_operating_profit_loss / net_sales_revenue) if net_sales_revenue > 0 else 0.0

    return {
        "gross_sales_revenue": gross_sales_revenue,
        "total_sales_returns": total_sales_returns,
        "net_sales_revenue": net_sales_revenue,
        "gross_product_cost": gross_embedded_cost,
        "gross_embedded_cost": gross_embedded_cost,
        "cost_of_returns": cost_of_returns,
        "total_cost": net_cogs,
        "total_cost_embedded": net_cogs,  # alias for backwards compatibility
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
