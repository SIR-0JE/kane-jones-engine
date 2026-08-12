"""
PDF Report Generator for Depot Sales Intelligence Engine.

Takes the already-computed audit JSON payload (from Supabase or local cache)
and renders it to a downloadable PDF using ReportLab.

NO business logic lives here. Every number comes directly from the stored
snapshot — the same object the dashboard reads.
"""

from io import BytesIO
from datetime import date
from typing import Any, Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ── Colour palette ────────────────────────────────────────────────────────────
SLATE_900 = colors.HexColor("#0f172a")
SLATE_700 = colors.HexColor("#334155")
SLATE_500 = colors.HexColor("#64748b")
SLATE_200 = colors.HexColor("#e2e8f0")
SLATE_50  = colors.HexColor("#f8fafc")
ROSE_700  = colors.HexColor("#be123c")
ROSE_50   = colors.HexColor("#fff1f2")
ROSE_200  = colors.HexColor("#fecdd3")
EMERALD_700 = colors.HexColor("#047857")
EMERALD_50  = colors.HexColor("#ecfdf5")
AMBER_600   = colors.HexColor("#d97706")
AMBER_50    = colors.HexColor("#fffbeb")
WHITE       = colors.white
# ─────────────────────────────────────────────────────────────────────────────


def _fmt_currency(amount: Optional[float], symbol: str = "₦") -> str:
    if amount is None:
        return "—"
    try:
        val = float(amount)
        abs_val = abs(val)
        # Format with commas, 2 dp
        formatted = f"{abs_val:,.2f}"
        return f"-{symbol}{formatted}" if val < 0 else f"{symbol}{formatted}"
    except (TypeError, ValueError):
        return "—"


def _fmt_pct(val: Optional[float], multiply: bool = True) -> str:
    if val is None:
        return "—"
    try:
        v = float(val)
        pct = v * 100 if multiply else v
        return f"{pct:.1f}%"
    except (TypeError, ValueError):
        return "—"


def _fmt_num(val: Optional[float]) -> str:
    if val is None:
        return "—"
    try:
        return f"{int(val):,}"
    except (TypeError, ValueError):
        return str(val)


def _styles() -> dict:
    """Returns a dict of ParagraphStyle objects."""
    base = getSampleStyleSheet()

    return {
        "cover_title": ParagraphStyle(
            "cover_title",
            fontName="Helvetica-Bold",
            fontSize=26,
            textColor=SLATE_900,
            spaceAfter=6,
            leading=32,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub",
            fontName="Helvetica",
            fontSize=13,
            textColor=SLATE_700,
            spaceAfter=4,
        ),
        "cover_meta": ParagraphStyle(
            "cover_meta",
            fontName="Helvetica",
            fontSize=10,
            textColor=SLATE_500,
            spaceAfter=3,
        ),
        "section_heading": ParagraphStyle(
            "section_heading",
            fontName="Helvetica-Bold",
            fontSize=13,
            textColor=SLATE_900,
            spaceBefore=16,
            spaceAfter=6,
        ),
        "sub_heading": ParagraphStyle(
            "sub_heading",
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=SLATE_700,
            spaceBefore=10,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "body",
            fontName="Helvetica",
            fontSize=9,
            textColor=SLATE_700,
            leading=13,
            spaceAfter=3,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            fontName="Helvetica",
            fontSize=9,
            textColor=SLATE_700,
            leading=14,
            leftIndent=12,
            spaceAfter=2,
        ),
        "kpi_label": ParagraphStyle(
            "kpi_label",
            fontName="Helvetica",
            fontSize=8,
            textColor=SLATE_500,
        ),
        "kpi_value": ParagraphStyle(
            "kpi_value",
            fontName="Helvetica-Bold",
            fontSize=15,
            textColor=SLATE_900,
        ),
        "kpi_value_rose": ParagraphStyle(
            "kpi_value_rose",
            fontName="Helvetica-Bold",
            fontSize=15,
            textColor=ROSE_700,
        ),
        "kpi_value_green": ParagraphStyle(
            "kpi_value_green",
            fontName="Helvetica-Bold",
            fontSize=15,
            textColor=EMERALD_700,
        ),
        "table_header": ParagraphStyle(
            "table_header",
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=SLATE_700,
        ),
        "table_cell": ParagraphStyle(
            "table_cell",
            fontName="Helvetica",
            fontSize=8,
            textColor=SLATE_900,
            leading=10,
        ),
        "table_cell_rose": ParagraphStyle(
            "table_cell_rose",
            fontName="Helvetica",
            fontSize=8,
            textColor=ROSE_700,
            leading=10,
        ),
        "table_cell_green": ParagraphStyle(
            "table_cell_green",
            fontName="Helvetica",
            fontSize=8,
            textColor=EMERALD_700,
            leading=10,
        ),
        "footer": ParagraphStyle(
            "footer",
            fontName="Helvetica",
            fontSize=7,
            textColor=SLATE_500,
            alignment=TA_CENTER,
        ),
    }


def _base_table_style(header_bg=SLATE_900, stripe=True) -> TableStyle:
    cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR",  (0, 0), (-1, 0), WHITE),
        ("FONTNAME",   (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, 0), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("GRID",      (0, 0), (-1, -1), 0.3, SLATE_200),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, SLATE_50] if stripe else [WHITE]),
        ("VALIGN",    (0, 0), (-1, -1), "MIDDLE"),
    ]
    return TableStyle(cmds)


def _page_header_footer(canvas, doc):
    """Draws a thin brand line at top and page number at bottom."""
    canvas.saveState()
    w, h = A4

    # Top rule
    canvas.setFillColor(SLATE_900)
    canvas.rect(2 * cm, h - 1.1 * cm, w - 4 * cm, 0.03 * cm, fill=1, stroke=0)

    # Footer
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(SLATE_500)
    canvas.drawCentredString(w / 2, 0.7 * cm, f"Page {doc.page}  ·  Depot Sales Intelligence Engine")
    canvas.restoreState()


# ── Section builders ─────────────────────────────────────────────────────────

def _build_cover(payload: Dict, S: dict) -> List:
    meta = payload.get("meta", {})
    depot = meta.get("client_display_name", "Depot")
    title = payload.get("audit_title") or meta.get("audit_title", "Audit Report")
    period = meta.get("period_label", "")
    dr = meta.get("date_range", {}) or {}
    date_str = ""
    if dr.get("start") and dr.get("end"):
        date_str = f"{dr['start']}  →  {dr['end']}"
    elif dr.get("start"):
        date_str = dr["start"]

    generated = date.today().strftime("%d %B %Y")

    elems = [
        Spacer(1, 2.5 * cm),
        Paragraph(depot, S["cover_title"]),
        Spacer(1, 0.3 * cm),
        HRFlowable(width="100%", thickness=1.5, color=SLATE_900, spaceAfter=10),
        Paragraph(title, S["cover_sub"]),
        Spacer(1, 0.2 * cm),
        Paragraph(f"Period: {period}  ·  {date_str}", S["cover_meta"]),
        Paragraph(f"Generated: {generated}", S["cover_meta"]),
        Spacer(1, 0.6 * cm),
        Paragraph(
            "This report is generated directly from the stored audit snapshot. "
            "All figures are identical to the live dashboard for the same audit period.",
            S["body"],
        ),
    ]
    return elems


def _kpi_row(label: str, value: str, sub: str, style, S: dict) -> Table:
    """Single KPI block as a mini 1-cell table with background."""
    content = [
        [Paragraph(label, S["kpi_label"])],
        [Paragraph(value, style)],
        [Paragraph(sub, S["kpi_label"])],
    ]
    t = Table(content, colWidths=[4.5 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SLATE_50),
        ("BOX", (0, 0), (-1, -1), 0.5, SLATE_200),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("ROUNDEDCORNERS", [4]),
    ]))
    return t


def _build_executive_summary(payload: Dict, S: dict) -> List:
    meta = payload.get("meta", {})
    currency = meta.get("currency_symbol", "₦")

    revenue = meta.get("total_revenue", 0) or 0
    gross_profit = meta.get("total_gross_profit", 0) or 0
    margin = meta.get("overall_margin_pct", 0) or 0
    leakage = meta.get("total_recoverable_leakage", 0) or 0
    invoices = meta.get("total_invoices", 0) or 0

    bfp_count = meta.get("below_floor_items_count", 0) or 0
    loss_cust_count = meta.get("loss_making_customers_count", 0) or 0
    dominant_count = meta.get("dominant_products_count", 0) or 0
    vol_counts = meta.get("volume_tier_counts", {}) or {}
    underpriced = vol_counts.get("underpriced", 0) or 0
    overpriced = vol_counts.get("overpriced", 0) or 0

    # Top dominant product
    dom = (payload.get("dominant_products") or [])
    dom_name = dom[0].get("product_raw", "—") if dom else "—"
    dom_pct = dom[0].get("pct_of_total", None) if dom else None

    # Loss customers (top name)
    lc = payload.get("loss_making_customers") or []
    top_loss_name = lc[0].get("customer", "—") if lc else "None"

    profit_style = S["kpi_value_green"] if gross_profit >= 0 else S["kpi_value_rose"]
    leakage_style = S["kpi_value_rose"]

    # KPI table (4 columns in one row)
    kpi_data = [[
        [Paragraph("Total Revenue", S["kpi_label"]),
         Paragraph(_fmt_currency(revenue, currency), S["kpi_value"]),
         Paragraph(f"{_fmt_num(invoices)} invoices", S["kpi_label"])],
        [Paragraph("Gross Profit", S["kpi_label"]),
         Paragraph(_fmt_currency(gross_profit, currency), profit_style),
         Paragraph(f"Margin: {_fmt_pct(margin)}", S["kpi_label"])],
        [Paragraph("Pricing Leakage", S["kpi_label"]),
         Paragraph(_fmt_currency(leakage, currency), leakage_style),
         Paragraph(f"below-floor recoverable", S["kpi_label"])],
        [Paragraph("Below-Floor Items", S["kpi_label"]),
         Paragraph(str(bfp_count), leakage_style),
         Paragraph("products under floor price", S["kpi_label"])],
    ]]

    col_w = (A4[0] - 4 * cm) / 4
    kpi_t = Table(kpi_data, colWidths=[col_w] * 4, rowHeights=[1.8 * cm])
    kpi_t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), SLATE_50),
        ("BOX",        (0, 0), (-1, -1), 0.4, SLATE_200),
        ("LINEAFTER",  (0, 0), (2, 0), 0.4, SLATE_200),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("VALIGN",    (0, 0), (-1, -1), "MIDDLE"),
    ]))

    # Bullet findings
    bullets = [
        f"• {bfp_count} product(s) sold below their distributor floor price "
        f"— representing {_fmt_currency(leakage, currency)} in recoverable revenue opportunity.",
        f"• {underpriced} volume-tier line items priced below the correct tier; "
        f"{overpriced} over-priced.",
        f"• Top concentration risk: <b>{dom_name}</b> ({_fmt_pct(dom_pct)}) "
        f"of total revenue — {dominant_count} product(s) flagged overall.",
        f"• {loss_cust_count} customer account(s) are loss-making; "
        f"highest: {top_loss_name}.",
    ]

    elems: List = [
        Paragraph("Executive Summary", S["section_heading"]),
        HRFlowable(width="100%", thickness=0.5, color=SLATE_200, spaceAfter=8),
        kpi_t,
        Spacer(1, 0.4 * cm),
        Paragraph("Key Findings", S["sub_heading"]),
    ]
    for b in bullets:
        elems.append(Paragraph(b, S["bullet"]))
    return elems


def _build_below_floor(payload: Dict, S: dict) -> List:
    currency = (payload.get("meta") or {}).get("currency_symbol", "₦")
    rows = payload.get("below_floor_pricing") or []

    elems: List = [
        PageBreak(),
        Paragraph("Below-Floor Pricing", S["section_heading"]),
        HRFlowable(width="100%", thickness=0.5, color=SLATE_200, spaceAfter=6),
        Paragraph(
            f"The following {len(rows)} product(s) were charged below their distributor floor price. "
            "All rows from the stored snapshot are included — no cap.",
            S["body"],
        ),
        Spacer(1, 0.3 * cm),
    ]

    if not rows:
        elems.append(Paragraph("No below-floor pricing issues detected.", S["body"]))
        return elems

    headers = ["Product", "Cases Sold", "Avg Rate Charged", "Floor Price", "Gap %", "Revenue Opp."]
    col_w = [(A4[0] - 4 * cm) * f for f in [0.32, 0.10, 0.15, 0.14, 0.10, 0.19]]

    data = [[Paragraph(h, S["table_header"]) for h in headers]]
    for r in rows:
        gap = r.get("gap_pct", None)
        data.append([
            Paragraph(str(r.get("product_raw", "")), S["table_cell"]),
            Paragraph(_fmt_num(r.get("cases_sold")), S["table_cell"]),
            Paragraph(_fmt_currency(r.get("avg_rate_charged"), currency), S["table_cell"]),
            Paragraph(_fmt_currency(r.get("distributor_price"), currency), S["table_cell"]),
            Paragraph(_fmt_pct(gap, multiply=False), S["table_cell_rose"]),
            Paragraph(_fmt_currency(r.get("revenue_opportunity"), currency), S["table_cell_rose"]),
        ])

    t = Table(data, colWidths=col_w, repeatRows=1)
    t.setStyle(_base_table_style())
    # Highlight gap_pct cells
    for i, r in enumerate(rows, start=1):
        gap = r.get("gap_pct", 0) or 0
        if abs(gap) >= 20:
            t.setStyle(TableStyle([
                ("BACKGROUND", (4, i), (4, i), ROSE_50),
                ("BACKGROUND", (5, i), (5, i), ROSE_50),
            ]))
    elems.append(t)
    return elems


def _build_volume_tier(payload: Dict, S: dict) -> List:
    currency = (payload.get("meta") or {}).get("currency_symbol", "₦")
    rows = payload.get("volume_tier_audit") or []
    vol_counts = (payload.get("meta") or {}).get("volume_tier_counts", {}) or {}

    total = vol_counts.get("total", len(rows))
    underpriced = vol_counts.get("underpriced", 0)
    overpriced  = vol_counts.get("overpriced", 0)
    correct     = vol_counts.get("correct", 0)
    rev_impact  = vol_counts.get("total_revenue_impact", 0)

    # Summary mini-table
    summary_data = [
        [Paragraph("Total Rows", S["table_header"]), Paragraph("Underpriced", S["table_header"]),
         Paragraph("Overpriced", S["table_header"]),  Paragraph("Correct", S["table_header"]),
         Paragraph("Revenue Impact", S["table_header"])],
        [Paragraph(_fmt_num(total), S["table_cell"]),
         Paragraph(_fmt_num(underpriced), S["table_cell_rose"]),
         Paragraph(_fmt_num(overpriced),  S["table_cell"]),
         Paragraph(_fmt_num(correct),     S["table_cell_green"]),
         Paragraph(_fmt_currency(rev_impact, currency), S["table_cell"])],
    ]
    sum_col_w = [(A4[0] - 4 * cm) / 5] * 5
    sum_t = Table(summary_data, colWidths=sum_col_w)
    sum_t.setStyle(_base_table_style(stripe=False))

    elems: List = [
        PageBreak(),
        Paragraph("Volume-Tier Pricing Audit", S["section_heading"]),
        HRFlowable(width="100%", thickness=0.5, color=SLATE_200, spaceAfter=6),
        Paragraph(
            "Each line-item invoice row is compared against the correct price tier for the "
            "ordered quantity. Results are drawn from the stored snapshot.",
            S["body"],
        ),
        Spacer(1, 0.25 * cm),
        sum_t,
        Spacer(1, 0.4 * cm),
        Paragraph(f"Full Detail — {len(rows)} rows (no cap)", S["sub_heading"]),
    ]

    if not rows:
        elems.append(Paragraph("No volume-tier rows found.", S["body"]))
        return elems

    headers = ["Invoice", "Date", "Customer", "Product", "Qty", "Rate", "Expected", "Diff%", "Impact", "Result"]
    col_w = [(A4[0] - 4 * cm) * f for f in [0.10, 0.08, 0.18, 0.18, 0.05, 0.08, 0.08, 0.07, 0.10, 0.08]]

    data = [[Paragraph(h, S["table_header"]) for h in headers]]
    RESULT_COLORS = {"underpriced": ROSE_700, "overpriced": AMBER_600, "correct": EMERALD_700}

    for r in rows:
        result = str(r.get("audit_result", "")).lower()
        result_style = ParagraphStyle(
            "res", fontName="Helvetica-Bold", fontSize=7.5,
            textColor=RESULT_COLORS.get(result, SLATE_900)
        )
        diff = r.get("price_diff_pct", None)
        data.append([
            Paragraph(str(r.get("invoice_no", "")),    S["table_cell"]),
            Paragraph(str(r.get("date", "")),           S["table_cell"]),
            Paragraph(str(r.get("customer", ""))[:28],  S["table_cell"]),
            Paragraph(str(r.get("product_raw", ""))[:28], S["table_cell"]),
            Paragraph(_fmt_num(r.get("quantity")),      S["table_cell"]),
            Paragraph(_fmt_currency(r.get("rate"), currency), S["table_cell"]),
            Paragraph(_fmt_currency(r.get("expected_price"), currency), S["table_cell"]),
            Paragraph(_fmt_pct(diff, multiply=False),   result_style),
            Paragraph(_fmt_currency(r.get("revenue_impact"), currency), S["table_cell"]),
            Paragraph(result.title(),                   result_style),
        ])

    t = Table(data, colWidths=col_w, repeatRows=1)
    style = _base_table_style()
    # Shade underpriced rows
    for i, r in enumerate(rows, start=1):
        res = str(r.get("audit_result", "")).lower()
        if res == "underpriced":
            style.add("BACKGROUND", (0, i), (-1, i), ROSE_50)
        elif res == "correct":
            style.add("BACKGROUND", (0, i), (-1, i), EMERALD_50)
    t.setStyle(style)
    elems.append(t)
    return elems


def _build_product_ranking(payload: Dict, S: dict) -> List:
    currency = (payload.get("meta") or {}).get("currency_symbol", "₦")
    rows = payload.get("product_revenue_ranking") or payload.get("product_ranking") or []

    elems: List = [
        PageBreak(),
        Paragraph("Product Revenue Ranking", S["section_heading"]),
        HRFlowable(width="100%", thickness=0.5, color=SLATE_200, spaceAfter=6),
        Paragraph(
            f"All {len(rows)} products ranked by revenue. ★ marks concentration-risk products "
            "(≥20% of total revenue).",
            S["body"],
        ),
        Spacer(1, 0.3 * cm),
    ]

    if not rows:
        elems.append(Paragraph("No product data.", S["body"]))
        return elems

    headers = ["#", "Product", "Cases Sold", "Revenue", "% of Total", "Risk"]
    col_w = [(A4[0] - 4 * cm) * f for f in [0.05, 0.42, 0.12, 0.18, 0.13, 0.10]]

    data = [[Paragraph(h, S["table_header"]) for h in headers]]
    for i, r in enumerate(rows, start=1):
        is_dom = bool(r.get("is_dominant", False))
        risk_cell = Paragraph("★ High", ParagraphStyle("rh", fontName="Helvetica-Bold",
                              fontSize=8, textColor=ROSE_700)) if is_dom else Paragraph("—", S["table_cell"])
        data.append([
            Paragraph(str(i), S["table_cell"]),
            Paragraph(str(r.get("product_raw", ""))[:46], S["table_cell"]),
            Paragraph(_fmt_num(r.get("cases_sold")),        S["table_cell"]),
            Paragraph(_fmt_currency(r.get("revenue"), currency), S["table_cell"]),
            Paragraph(_fmt_pct(r.get("pct_of_total"), multiply=False), S["table_cell"]),
            risk_cell,
        ])

    t = Table(data, colWidths=col_w, repeatRows=1)
    style = _base_table_style()
    for i, r in enumerate(rows, start=1):
        if r.get("is_dominant"):
            style.add("BACKGROUND", (0, i), (-1, i), ROSE_50)
    t.setStyle(style)
    elems.append(t)
    return elems


def _build_customer_margin(payload: Dict, S: dict) -> List:
    currency = (payload.get("meta") or {}).get("currency_symbol", "₦")
    rows = payload.get("customer_margin_detail") or []

    profitable   = [r for r in rows if not r.get("is_loss_making")]
    loss_making  = [r for r in rows if r.get("is_loss_making")]

    headers = ["Customer", "Invoices", "Revenue", "Cost", "Gross Profit", "Margin %", "Rev Share"]
    col_w = [(A4[0] - 4 * cm) * f for f in [0.28, 0.08, 0.15, 0.13, 0.14, 0.10, 0.12]]

    def _make_cust_table(data_rows, highlight_loss=False):
        data = [[Paragraph(h, S["table_header"]) for h in headers]]
        for r in data_rows:
            margin = r.get("margin_pct", 0) or 0
            gp = r.get("gross_profit", 0) or 0
            margin_style = S["table_cell_rose"] if margin < 0 else S["table_cell_green"]
            data.append([
                Paragraph(str(r.get("customer", ""))[:32], S["table_cell"]),
                Paragraph(_fmt_num(r.get("invoices")),           S["table_cell"]),
                Paragraph(_fmt_currency(r.get("revenue"), currency),       S["table_cell"]),
                Paragraph(_fmt_currency(r.get("cost"), currency),          S["table_cell"]),
                Paragraph(_fmt_currency(gp, currency),                     margin_style),
                Paragraph(_fmt_pct(margin, multiply=False),                margin_style),
                Paragraph(_fmt_pct(r.get("pct_of_total_revenue"), multiply=False), S["table_cell"]),
            ])
        t = Table(data, colWidths=col_w, repeatRows=1)
        style = _base_table_style()
        if highlight_loss:
            for i in range(1, len(data)):
                style.add("BACKGROUND", (0, i), (-1, i), ROSE_50)
        t.setStyle(style)
        return t

    elems: List = [
        PageBreak(),
        Paragraph("Customer Margin Detail", S["section_heading"]),
        HRFlowable(width="100%", thickness=0.5, color=SLATE_200, spaceAfter=6),
        Paragraph(
            f"All {len(rows)} customer accounts. Loss-making accounts are listed separately at the end.",
            S["body"],
        ),
        Spacer(1, 0.3 * cm),
    ]

    if profitable:
        elems.append(Paragraph(f"Profitable Accounts ({len(profitable)})", S["sub_heading"]))
        elems.append(_make_cust_table(profitable))
        elems.append(Spacer(1, 0.4 * cm))

    if loss_making:
        elems.append(Paragraph(f"Loss-Making Accounts — {len(loss_making)} customers", S["sub_heading"]))
        elems.append(Paragraph(
            "These accounts generated negative gross profit in this period.", S["body"]
        ))
        elems.append(Spacer(1, 0.2 * cm))
        elems.append(_make_cust_table(loss_making, highlight_loss=True))

    return elems


def _build_data_quality(payload: Dict, S: dict) -> List:
    anomalies = payload.get("anomalies") or []
    unmatched = (payload.get("match_quality") or {}).get("unmatched_products") or []
    recon     = payload.get("reconciliation_discrepancies") or []
    mq        = payload.get("match_quality") or {}
    counts    = mq.get("counts") or {}

    elems: List = [
        PageBreak(),
        Paragraph("Data Quality Appendix", S["section_heading"]),
        HRFlowable(width="100%", thickness=0.5, color=SLATE_200, spaceAfter=6),
        Paragraph(
            "This section mirrors the Data Quality dashboard screen. The report is transparent "
            "about its own data gaps so findings can be interpreted in context.",
            S["body"],
        ),
        Spacer(1, 0.3 * cm),
    ]

    # Match quality summary
    elems.append(Paragraph("Product Match Quality", S["sub_heading"]))
    mq_data = [
        [Paragraph(h, S["table_header"]) for h in ["Total Products", "Exact", "Fuzzy", "Override", "Fuzzy-no-size", "Unmatched"]],
        [
            Paragraph(_fmt_num(mq.get("total_products")), S["table_cell"]),
            Paragraph(_fmt_num(counts.get("exact")),             S["table_cell"]),
            Paragraph(_fmt_num(counts.get("fuzzy")),             S["table_cell"]),
            Paragraph(_fmt_num(counts.get("manual_override")),   S["table_cell"]),
            Paragraph(_fmt_num(counts.get("fuzzy_no_size_match")), S["table_cell"]),
            Paragraph(_fmt_num(counts.get("unmatched")),         S["table_cell_rose"]),
        ],
    ]
    col_w = [(A4[0] - 4 * cm) / 6] * 6
    mq_t = Table(mq_data, colWidths=col_w)
    mq_t.setStyle(_base_table_style(stripe=False))
    elems.append(mq_t)
    elems.append(Spacer(1, 0.3 * cm))

    # Unmatched products
    if unmatched:
        elems.append(Paragraph(f"Unmatched Products ({len(unmatched)}) — not included in pricing audit", S["sub_heading"]))
        for p in unmatched:
            elems.append(Paragraph(f"• {p}", S["bullet"]))
        elems.append(Spacer(1, 0.3 * cm))

    # Anomalies
    elems.append(Paragraph(f"Anomalies ({len(anomalies)})", S["sub_heading"]))
    if anomalies:
        anom_headers = ["Row", "Source Tab", "Reason"]
        anom_col_w   = [(A4[0] - 4 * cm) * f for f in [0.08, 0.18, 0.74]]
        anom_data    = [[Paragraph(h, S["table_header"]) for h in anom_headers]]
        for a in anomalies:
            anom_data.append([
                Paragraph(str(a.get("row", "")),        S["table_cell"]),
                Paragraph(str(a.get("source_tab", "")), S["table_cell"]),
                Paragraph(str(a.get("reason", ""))[:100], S["table_cell"]),
            ])
        anom_t = Table(anom_data, colWidths=anom_col_w, repeatRows=1)
        anom_t.setStyle(_base_table_style())
        elems.append(anom_t)
    else:
        elems.append(Paragraph("No anomalies detected.", S["body"]))
    elems.append(Spacer(1, 0.3 * cm))

    # Reconciliation discrepancies
    elems.append(Paragraph(f"Reconciliation Discrepancies ({len(recon)})", S["sub_heading"]))
    if recon:
        currency = (payload.get("meta") or {}).get("currency_symbol", "₦")
        rec_headers = ["Invoice", "Date", "Customer", "Revenue", "Computed", "Diff"]
        rec_col_w   = [(A4[0] - 4 * cm) * f for f in [0.12, 0.10, 0.28, 0.15, 0.15, 0.20]]
        rec_data    = [[Paragraph(h, S["table_header"]) for h in rec_headers]]
        for r in recon:
            rec_data.append([
                Paragraph(str(r.get("invoice_no", "")),  S["table_cell"]),
                Paragraph(str(r.get("date", "")),        S["table_cell"]),
                Paragraph(str(r.get("customer", ""))[:30], S["table_cell"]),
                Paragraph(_fmt_currency(r.get("gross_revenue"), currency), S["table_cell"]),
                Paragraph(_fmt_currency(r.get("computed_line_revenue"), currency), S["table_cell"]),
                Paragraph(_fmt_currency(r.get("diff"), currency), S["table_cell_rose"]),
            ])
        rec_t = Table(rec_data, colWidths=rec_col_w, repeatRows=1)
        rec_t.setStyle(_base_table_style())
        elems.append(rec_t)
    else:
        elems.append(Paragraph("No reconciliation discrepancies detected.", S["body"]))

    return elems


# ── Public entry point ────────────────────────────────────────────────────────

def generate_report_pdf(payload: Dict[str, Any]) -> bytes:
    """
    Accepts the exact same JSON payload that the /api/analyze endpoint returns
    (and that is stored in Supabase). Returns raw PDF bytes.

    Nothing in this function recomputes any number — it is a pure renderer.
    """
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=1.6 * cm,
        bottomMargin=1.6 * cm,
        title=(payload.get("audit_title") or (payload.get("meta") or {}).get("audit_title") or "Audit Report"),
        author="Depot Sales Intelligence Engine",
    )

    S = _styles()
    story = []

    story += _build_cover(payload, S)
    story += _build_executive_summary(payload, S)
    story += _build_below_floor(payload, S)
    story += _build_volume_tier(payload, S)
    story += _build_product_ranking(payload, S)
    story += _build_customer_margin(payload, S)
    story += _build_data_quality(payload, S)

    doc.build(story, onFirstPage=_page_header_footer, onLaterPages=_page_header_footer)
    return buf.getvalue()
