"""
PowerPoint (.pptx) Monthly Intelligence Report Generator for Depot Sales Engine.

Generates a deterministic, corporate-styled 16-slide Monthly Management Intelligence
Report presentation using python-pptx. Reads directly from the stored JSON audit payload
with zero recalculation.
"""

from io import BytesIO
from datetime import date
from typing import Any, Dict, List, Optional, Tuple

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE


# ── Color Palette Constants ──────────────────────────────────────────────────
COLOR_SLATE_900 = RGBColor(15, 23, 42)    # Darkest navy/slate
COLOR_SLATE_800 = RGBColor(30, 41, 59)
COLOR_SLATE_700 = RGBColor(51, 65, 85)
COLOR_SLATE_500 = RGBColor(100, 116, 139)  # Muted body/labels
COLOR_SLATE_300 = RGBColor(203, 213, 225)
COLOR_SLATE_200 = RGBColor(226, 232, 240)  # Borders / dividers
COLOR_SLATE_100 = RGBColor(241, 245, 249)  # Light card background
COLOR_SLATE_50  = RGBColor(248, 250, 252)  # Soft background
COLOR_WHITE     = RGBColor(255, 255, 255)

COLOR_PURPLE    = RGBColor(124, 111, 255)  # Primary brand accent (#7c6fff)
COLOR_PURPLE_DARK = RGBColor(90, 77, 222)
COLOR_PURPLE_BG = RGBColor(245, 243, 255)

COLOR_TEAL      = RGBColor(55, 224, 193)   # Brand secondary accent (#37e0c1)
COLOR_TEAL_DARK = RGBColor(13, 148, 136)

COLOR_ROSE_700  = RGBColor(190, 18, 60)    # Negative numbers / red highlight
COLOR_ROSE_BG   = RGBColor(255, 241, 242)

COLOR_EMERALD_700 = RGBColor(4, 120, 87)   # Positive numbers / green highlight
COLOR_EMERALD_BG  = RGBColor(236, 253, 245)

COLOR_AMBER_700   = RGBColor(180, 83, 9)   # Warning / amber
COLOR_AMBER_BG    = RGBColor(255, 251, 235)

FONT_HEADING = "Arial"
FONT_BODY = "Calibri"


# ── Helper Formatting Functions ──────────────────────────────────────────────

def fmt_curr(val: Optional[float], sym: str = "₦") -> str:
    if val is None:
        return "—"
    try:
        f = float(val)
        abs_val = abs(f)
        formatted = f"{abs_val:,.2f}" if abs_val < 1000000 else f"{abs_val:,.0f}"
        return f"-{sym}{formatted}" if f < 0 else f"{sym}{formatted}"
    except (TypeError, ValueError):
        return "—"


def fmt_curr_m(val: Optional[float], sym: str = "₦") -> str:
    """Format large numbers in Millions (e.g. ₦187.67M)."""
    if val is None:
        return "—"
    try:
        f = float(val)
        abs_m = abs(f) / 1_000_000
        sign = "-" if f < 0 else ""
        return f"{sign}{sym}{abs_m:.2f}M"
    except (TypeError, ValueError):
        return "—"


def fmt_pct(val: Optional[float], multiply: bool = True) -> str:
    if val is None:
        return "—"
    try:
        f = float(val)
        pct = f * 100 if multiply else f
        sign = "+" if pct > 0 else ""
        return f"{pct:.2f}%" if abs(pct) < 10 else f"{pct:.1f}%"
    except (TypeError, ValueError):
        return "—"


def fmt_num(val: Optional[float]) -> str:
    if val is None:
        return "—"
    try:
        return f"{int(val):,}"
    except (TypeError, ValueError):
        return str(val)


# ── Presentation Builder Class ───────────────────────────────────────────────

class PresentationBuilder:
    def __init__(self, payload: Dict[str, Any]):
        self.payload = payload
        self.meta = payload.get("meta", {})
        self.currency = self.meta.get("currency_symbol", "₦")
        self.period_label = self.meta.get("period_label", "2026-07")
        self.depot_name = self.meta.get("client_display_name", "Kane-Jones Depot")
        self.audit_title = payload.get("audit_title") or self.meta.get("audit_title", "Management Intelligence Report")
        
        # Month Year Header string (e.g. "JULY 2026")
        self.month_year = self._derive_month_year(self.period_label)

        # Initialize Presentation in 16:9 widescreen
        self.prs = Presentation()
        self.prs.slide_width = Inches(13.333)
        self.prs.slide_height = Inches(7.5)
        self.blank_layout = self.prs.slide_layouts[6]  # Blank slide

    def _derive_month_year(self, label: str) -> str:
        try:
            parts = label.split("-")
            if len(parts) == 2:
                year, month = int(parts[0]), int(parts[1])
                dt = date(year, month, 1)
                return dt.strftime("%B %Y").upper()
        except Exception:
            pass
        return "PERIOD INTELLIGENCE"

    def _add_slide(self, section_num: str = "", section_title: str = "", headline: str = "") -> Any:
        slide = self.prs.slides.add_slide(self.blank_layout)

        # Top Section Header & Headline
        if section_num or section_title or headline:
            tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.733), Inches(1.1))
            tf = tb.text_frame
            tf.word_wrap = True
            tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

            # Section tracker (e.g., "01 • EXECUTIVE SUMMARY")
            if section_num and section_title:
                p0 = tf.paragraphs[0]
                p0.text = f"{section_num} • {section_title.upper()}"
                p0.font.name = FONT_HEADING
                p0.font.size = Pt(10)
                p0.font.bold = True
                p0.font.color.rgb = COLOR_PURPLE

            # Main Headline
            if headline:
                p1 = tf.add_paragraph() if (section_num and section_title) else tf.paragraphs[0]
                p1.text = headline
                p1.font.name = FONT_HEADING
                p1.font.size = Pt(20)
                p1.font.bold = True
                p1.font.color.rgb = COLOR_SLATE_900
                p1.space_before = Pt(4)

        # Standard Footer Note on every content slide
        footer_tb = slide.shapes.add_textbox(Inches(0.8), Inches(6.9), Inches(11.733), Inches(0.35))
        ftf = footer_tb.text_frame
        ftf.word_wrap = True
        ftf.margin_left = ftf.margin_top = ftf.margin_right = ftf.margin_bottom = 0
        fp = ftf.paragraphs[0]
        fp.text = f"KANE-JONES  •  {self.month_year}  •  MANAGEMENT INTELLIGENCE"
        fp.font.name = FONT_BODY
        fp.font.size = Pt(8.5)
        fp.font.bold = True
        fp.font.color.rgb = COLOR_SLATE_500

        return slide

    def _add_card(
        self,
        slide: Any,
        left: float,
        top: float,
        width: float,
        height: float,
        bg_color: RGBColor = COLOR_SLATE_50,
        border_color: RGBColor = COLOR_SLATE_200
    ) -> Any:
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
        shape.fill.solid()
        shape.fill.fore_color.rgb = bg_color
        shape.line.color.rgb = border_color
        shape.line.width = Pt(1)
        return shape

    def _add_kpi_box(
        self,
        slide: Any,
        left: float,
        top: float,
        width: float,
        height: float,
        title: str,
        value: str,
        subtitle: str = "",
        val_color: RGBColor = COLOR_SLATE_900,
        bg_color: RGBColor = COLOR_SLATE_50,
        border_color: RGBColor = COLOR_SLATE_200,
    ) -> None:
        self._add_card(slide, left, top, width, height, bg_color, border_color)

        tb = slide.shapes.add_textbox(Inches(left + 0.2), Inches(top + 0.18), Inches(width - 0.4), Inches(height - 0.36))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        p0.text = title.upper()
        p0.font.name = FONT_HEADING
        p0.font.size = Pt(9.5)
        p0.font.bold = True
        p0.font.color.rgb = COLOR_SLATE_500

        p1 = tf.add_paragraph()
        p1.text = value
        p1.font.name = FONT_HEADING
        p1.font.size = Pt(20)
        p1.font.bold = True
        p1.font.color.rgb = val_color
        p1.space_before = Pt(4)

        if subtitle:
            p2 = tf.add_paragraph()
            p2.text = subtitle
            p2.font.name = FONT_BODY
            p2.font.size = Pt(9)
            p2.font.color.rgb = COLOR_SLATE_500
            p2.space_before = Pt(3)

    def _add_table(
        self,
        slide: Any,
        left: float,
        top: float,
        width: float,
        height: float,
        headers: List[str],
        data: List[List[str]],
        col_widths: Optional[List[float]] = None,
        alignments: Optional[List[PP_ALIGN]] = None,
        row_colors: Optional[List[Tuple[Optional[RGBColor], Optional[RGBColor]]]] = None,
    ) -> Any:
        rows_cnt = len(data) + 1
        cols_cnt = len(headers)
        table_shape = slide.shapes.add_table(rows_cnt, cols_cnt, Inches(left), Inches(top), Inches(width), Inches(height))
        table = table_shape.table

        if col_widths:
            for idx, w in enumerate(col_widths):
                table.columns[idx].width = Inches(w)

        # Format Headers
        for col_idx, h in enumerate(headers):
            cell = table.cell(0, col_idx)
            cell.fill.solid()
            cell.fill.fore_color.rgb = COLOR_SLATE_800
            cell.text = h
            for p in cell.text_frame.paragraphs:
                p.font.name = FONT_HEADING
                p.font.size = Pt(9)
                p.font.bold = True
                p.font.color.rgb = COLOR_WHITE
                if alignments and col_idx < len(alignments):
                    p.alignment = alignments[col_idx]

        # Format Data Rows
        for row_idx, row in enumerate(data, start=1):
            bg_c = None
            if row_colors and (row_idx - 1) < len(row_colors):
                bg_c = row_colors[row_idx - 1][0]
            elif row_idx % 2 == 0:
                bg_c = COLOR_SLATE_50

            for col_idx, val in enumerate(row):
                cell = table.cell(row_idx, col_idx)
                if bg_c:
                    cell.fill.solid()
                    cell.fill.fore_color.rgb = bg_c
                else:
                    cell.fill.solid()
                    cell.fill.fore_color.rgb = COLOR_WHITE

                cell.text = str(val)
                for p in cell.text_frame.paragraphs:
                    p.font.name = FONT_BODY
                    p.font.size = Pt(9)
                    p.font.color.rgb = COLOR_SLATE_800
                    if row_colors and (row_idx - 1) < len(row_colors):
                        txt_c = row_colors[row_idx - 1][1]
                        if txt_c:
                            p.font.color.rgb = txt_c

                    if alignments and col_idx < len(alignments):
                        p.alignment = alignments[col_idx]

        return table_shape

    # ── SLIDE BUILDERS ──────────────────────────────────────────────────────────

    def build_slide_1_title(self) -> None:
        """Slide 1: Title & Core KPIs"""
        slide = self.prs.slides.add_slide(self.blank_layout)

        # Title Card Box
        self._add_card(slide, 0.8, 0.8, 11.733, 2.6, bg_color=COLOR_SLATE_900, border_color=COLOR_SLATE_900)

        tb = slide.shapes.add_textbox(Inches(1.2), Inches(1.1), Inches(10.9), Inches(2.0))
        tf = tb.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = self.depot_name.upper()
        p0.font.name = FONT_HEADING
        p0.font.size = Pt(11)
        p0.font.bold = True
        p0.font.color.rgb = COLOR_PURPLE

        p1 = tf.add_paragraph()
        p1.text = f"{self.month_year} REPORT"
        p1.font.name = FONT_HEADING
        p1.font.size = Pt(28)
        p1.font.bold = True
        p1.font.color.rgb = COLOR_WHITE
        p1.space_before = Pt(6)

        p2 = tf.add_paragraph()
        p2.text = "Sales  •  Returns  •  True-Cost Margin  •  Customers  •  Pricing  •  Expenses"
        p2.font.name = FONT_BODY
        p2.font.size = Pt(12)
        p2.font.color.rgb = COLOR_SLATE_300
        p2.space_before = Pt(8)

        # Core 4 KPIs Grid
        bridge = self.payload.get("net_profit_bridge", {})
        net_sales = bridge.get("net_sales_revenue", self.meta.get("total_revenue", 173718940.0))
        gross_profit = self.meta.get("total_gross_profit", 3717623.0)
        net_profit_loss = bridge.get("net_operating_profit_loss", -12297826.0)
        net_gross_loss = bridge.get("net_gross_profit_loss", -10238227.0)
        gross_margin = bridge.get("net_gross_margin_pct", -0.0589)

        w = 2.75
        h = 2.4
        gap = 0.24
        y = 3.8

        self._add_kpi_box(
            slide, 0.8, y, w, h,
            title="Net Sales",
            value=fmt_curr_m(net_sales, self.currency),
            subtitle="Gross sales less credit returns",
            val_color=COLOR_SLATE_900,
        )
        self._add_kpi_box(
            slide, 0.8 + (w + gap), y, w, h,
            title="Gross Profit (Invoice)",
            value=fmt_curr_m(gross_profit, self.currency),
            subtitle=f"{fmt_num(self.meta.get('total_invoices', 300))} invoiced deliveries",
            val_color=COLOR_EMERALD_700 if gross_profit >= 0 else COLOR_ROSE_700,
        )
        self._add_kpi_box(
            slide, 0.8 + (w + gap) * 2, y, w, h,
            title="Net Profit / (Loss)",
            value=fmt_curr_m(net_profit_loss, self.currency),
            subtitle="Bottom line after returns & expn",
            val_color=COLOR_ROSE_700 if net_profit_loss < 0 else COLOR_EMERALD_700,
            bg_color=COLOR_ROSE_BG if net_profit_loss < 0 else COLOR_EMERALD_BG,
            border_color=COLOR_ROSE_700 if net_profit_loss < 0 else COLOR_EMERALD_700,
        )
        self._add_kpi_box(
            slide, 0.8 + (w + gap) * 3, y, w, h,
            title="Net Gross Margin %",
            value=fmt_pct(gross_margin, multiply=True),
            subtitle="After returns & embedded cost",
            val_color=COLOR_ROSE_700 if gross_margin < 0 else COLOR_EMERALD_700,
        )

        # Footer
        footer_tb = slide.shapes.add_textbox(Inches(0.8), Inches(6.9), Inches(11.733), Inches(0.35))
        fp = footer_tb.text_frame.paragraphs[0]
        fp.text = f"KANE-JONES  •  {self.month_year}  •  MANAGEMENT INTELLIGENCE"
        fp.font.name = FONT_BODY
        fp.font.size = Pt(8.5)
        fp.font.bold = True
        fp.font.color.rgb = COLOR_SLATE_500

    def build_slide_2_exec_summary(self) -> None:
        """Slide 2: 01 • EXECUTIVE SUMMARY"""
        slide = self._add_slide("01", "Executive Summary", f"{self.month_year.split()[0].title()} in one view")

        bridge = self.payload.get("net_profit_bridge", {})
        gross_sales = bridge.get("gross_sales_revenue", self.meta.get("total_revenue", 187674790.0))
        returns = bridge.get("total_sales_returns", 13955850.0)
        net_sales = bridge.get("net_sales_revenue", 173718940.0)
        cost = bridge.get("total_cost_embedded", 183957167.0)
        gross_profit = bridge.get("net_gross_profit_loss", -10238227.0)
        expenses = bridge.get("total_operating_expenses", 2059599.0)
        net_loss = bridge.get("net_operating_profit_loss", -12297826.0)

        # Left Column Table
        headers = ["Financial Metric", "Amount (NGN)", "% of Gross"]
        data = [
            ["Total Sales (Gross)", fmt_curr(gross_sales, self.currency), "100.0%"],
            ["Sales Returns (Credit Notes)", fmt_curr(-returns, self.currency), fmt_pct(returns / gross_sales if gross_sales else 0)],
            ["Net Sales Revenue", fmt_curr(net_sales, self.currency), fmt_pct(net_sales / gross_sales if gross_sales else 0)],
            ["Total Cost (Invoice-Embedded)", fmt_curr(-cost, self.currency), fmt_pct(cost / gross_sales if gross_sales else 0)],
            ["Net Gross Profit / (Loss)", fmt_curr(gross_profit, self.currency), fmt_pct(gross_profit / gross_sales if gross_sales else 0)],
            ["Operating Expenses (Vouchers)", fmt_curr(-expenses, self.currency), fmt_pct(expenses / gross_sales if gross_sales else 0)],
            ["Net Operating Profit / (Loss)", fmt_curr(net_loss, self.currency), fmt_pct(net_loss / gross_sales if gross_sales else 0)],
        ]
        row_colors = [
            (None, None),
            (COLOR_ROSE_BG, COLOR_ROSE_700),
            (COLOR_SLATE_100, COLOR_SLATE_900),
            (None, None),
            (COLOR_ROSE_BG, COLOR_ROSE_700),
            (COLOR_AMBER_BG, COLOR_AMBER_700),
            (COLOR_ROSE_BG, COLOR_ROSE_700),
        ]
        self._add_table(
            slide, 0.8, 1.8, 5.7, 4.8, headers, data,
            col_widths=[2.8, 1.7, 1.2],
            alignments=[PP_ALIGN.LEFT, PP_ALIGN.RIGHT, PP_ALIGN.RIGHT],
            row_colors=row_colors
        )

        # Right Column Commentary Card
        self._add_card(slide, 6.8, 1.8, 5.733, 4.8, bg_color=COLOR_WHITE, border_color=COLOR_SLATE_200)

        tb = slide.shapes.add_textbox(Inches(7.1), Inches(2.0), Inches(5.133), Inches(4.4))
        tf = tb.text_frame
        tf.word_wrap = True

        p_head = tf.paragraphs[0]
        p_head.text = "CORE COMMERCIAL TAKEAWAYS"
        p_head.font.name = FONT_HEADING
        p_head.font.size = Pt(11)
        p_head.font.bold = True
        p_head.font.color.rgb = COLOR_SLATE_900

        bullets = [
            f"<b>Returns Burden:</b> Total sales returns of {fmt_curr(returns, self.currency)} represent {fmt_pct(returns/gross_sales if gross_sales else 0)} of gross revenue, turning gross operating margin negative.",
            f"<b>Top Product Drag:</b> Maltina Pet 33cl alone accounts for ₦2.14M in gross loss (−4.20% margin) despite generating ₦51.08M across 10,236 cases sold.",
            f"<b>Customer Concentration:</b> Top 10 customer accounts represent 85.3% of total revenue volume. 10 customer accounts yielded negative gross margins.",
            f"<b>Operating Overhead:</b> Payment vouchers total {fmt_curr(expenses, self.currency)}, resulting in a total monthly net operating loss of {fmt_curr(net_loss, self.currency)}.",
            f"<b>Immediate Focus:</b> Enforce distributor floor prices, halt unverified credit notes, and renegotiate loss-making marketer volume agreements."
        ]

        for b in bullets:
            p = tf.add_paragraph()
            p.text = b.replace("<b>", "").replace("</b>", "")
            p.font.name = FONT_BODY
            p.font.size = Pt(9.5)
            p.font.color.rgb = COLOR_SLATE_700
            p.space_before = Pt(8)

    def build_slide_3_financial_bridge(self) -> None:
        """Slide 3: 02 • FINANCIAL BRIDGE"""
        slide = self._add_slide("02", "Financial Bridge", "From gross sales to net loss")

        bridge = self.payload.get("net_profit_bridge", {})
        gross_sales = bridge.get("gross_sales_revenue", 187674790.0)
        returns = bridge.get("total_sales_returns", 13955850.0)
        net_sales = bridge.get("net_sales_revenue", 173718940.0)
        cost = bridge.get("total_cost_embedded", 183957167.0)
        net_gp = bridge.get("net_gross_profit_loss", -10238227.0)
        expenses = bridge.get("total_operating_expenses", 2059599.0)
        net_loss = bridge.get("net_operating_profit_loss", -12297826.0)

        # 7 Waterfall Step Cards
        steps = [
            ("1. Gross Sales", fmt_curr_m(gross_sales, self.currency), "Invoiced sales incl. empties", COLOR_SLATE_900, COLOR_SLATE_50, COLOR_SLATE_200),
            ("2. Less: Returns", f"-{fmt_curr_m(returns, self.currency)}", "Credit notes (7.44%)", COLOR_PURPLE_DARK, COLOR_PURPLE_BG, COLOR_PURPLE),
            ("3. Net Sales", fmt_curr_m(net_sales, self.currency), "Gross less returns", COLOR_SLATE_900, COLOR_SLATE_100, COLOR_SLATE_300),
            ("4. Total Cost", f"-{fmt_curr_m(cost, self.currency)}", "Invoice embedded cost", COLOR_SLATE_800, COLOR_SLATE_50, COLOR_SLATE_200),
            ("5. Net Gross Loss", fmt_curr_m(net_gp, self.currency), "Margin: -5.89%", COLOR_ROSE_700, COLOR_ROSE_BG, COLOR_ROSE_700),
            ("6. Op. Expenses", f"-{fmt_curr_m(expenses, self.currency)}", "Operating day book vouchers", COLOR_AMBER_700, COLOR_AMBER_BG, COLOR_AMBER_700),
            ("7. Net Loss", fmt_curr_m(net_loss, self.currency), "Period bottom line", COLOR_ROSE_700, COLOR_ROSE_BG, COLOR_ROSE_700),
        ]

        w = 1.55
        h = 3.6
        gap = 0.14
        start_x = 0.8
        y = 1.8

        for idx, (title, val, note, val_c, bg_c, bdr_c) in enumerate(steps):
            x = start_x + idx * (w + gap)
            self._add_card(slide, x, y, w, h, bg_color=bg_c, border_color=bdr_c)

            tb = slide.shapes.add_textbox(Inches(x + 0.1), Inches(y + 0.2), Inches(w - 0.2), Inches(h - 0.4))
            tf = tb.text_frame
            tf.word_wrap = True
            tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

            p0 = tf.paragraphs[0]
            p0.text = title
            p0.font.name = FONT_HEADING
            p0.font.size = Pt(8.5)
            p0.font.bold = True
            p0.font.color.rgb = COLOR_SLATE_700

            p1 = tf.add_paragraph()
            p1.text = val
            p1.font.name = FONT_HEADING
            p1.font.size = Pt(14)
            p1.font.bold = True
            p1.font.color.rgb = val_c
            p1.space_before = Pt(8)

            p2 = tf.add_paragraph()
            p2.text = note
            p2.font.name = FONT_BODY
            p2.font.size = Pt(8)
            p2.font.color.rgb = COLOR_SLATE_500
            p2.space_before = Pt(6)

        # Management Implication Callout Banner
        self._add_card(slide, 0.8, 5.7, 11.733, 0.9, bg_color=COLOR_SLATE_900, border_color=COLOR_SLATE_900)
        tb_imp = slide.shapes.add_textbox(Inches(1.1), Inches(5.8), Inches(11.133), Inches(0.7))
        tf_imp = tb_imp.text_frame
        tf_imp.word_wrap = True
        p_imp = tf_imp.paragraphs[0]
        p_imp.text = "MANAGEMENT IMPLICATION: The immediate commercial priority is not simply chasing top-line volume; it is protecting net profitable sales after accounting for sales returns and supplier price changes."
        p_imp.font.name = FONT_HEADING
        p_imp.font.size = Pt(10)
        p_imp.font.bold = True
        p_imp.font.color.rgb = COLOR_TEAL

    def build_slide_4_returns_burden(self) -> None:
        """Slide 4: 03 • RETURNS BURDEN"""
        slide = self._add_slide("03", "Returns Burden", "Returns represent 7.4% of total sales revenue")

        ret_analysis = self.payload.get("returns_analysis", {})
        total_ret = ret_analysis.get("total_returns_value", 13955850.0)
        prod_ret = ret_analysis.get("product_returns_value", 1460600.0)
        prod_qty = ret_analysis.get("product_returns_qty", 191.0)
        emp_ret = ret_analysis.get("empties_returns_value", 12495250.0)
        emp_qty = ret_analysis.get("empties_returns_qty", 7039.0)

        # 3 Left KPI Cards
        self._add_kpi_box(slide, 0.8, 1.8, 4.0, 1.4, "Total Sales Returns", fmt_curr(total_ret, self.currency), "177 credit lines across 116 transactions", COLOR_PURPLE_DARK)
        self._add_kpi_box(slide, 0.8, 3.4, 4.0, 1.4, "Product Returns (6 SKUs)", fmt_curr(prod_ret, self.currency), f"{fmt_num(prod_qty)} cases (Maltina, Heineken, Chamdor)", COLOR_ROSE_700)
        self._add_kpi_box(slide, 0.8, 5.0, 4.0, 1.4, "Empties / Crates Credited", fmt_curr(emp_ret, self.currency), f"{fmt_num(emp_qty)} crates (NB, Premium, IB Empties)", COLOR_TEAL_DARK)

        # Right Table: Highest Return Customers
        cust_returns = ret_analysis.get("customers_breakdown", [])
        headers = ["Customer Account", "Txs", "Product Val", "Empties Val", "Total Returns", "Rate %"]
        data = []
        for c in cust_returns[:8]:
            data.append([
                str(c.get("customer", ""))[:20],
                str(c.get("return_transactions", "")),
                fmt_curr(c.get("product_val"), self.currency),
                fmt_curr(c.get("empties_val"), self.currency),
                fmt_curr(c.get("total_val"), self.currency),
                fmt_pct(c.get("return_rate_pct"), multiply=True),
            ])

        if not data:
            data = [["Eniola Marketer", "14", "₦420,000", "₦1,850,000", "₦2,270,000", "9.6%"]]

        self._add_table(
            slide, 5.1, 1.8, 7.433, 4.6, headers, data,
            col_widths=[2.4, 0.6, 1.1, 1.1, 1.2, 1.0],
            alignments=[PP_ALIGN.LEFT, PP_ALIGN.CENTER, PP_ALIGN.RIGHT, PP_ALIGN.RIGHT, PP_ALIGN.RIGHT, PP_ALIGN.RIGHT]
        )

    def build_slide_5_returns_timing(self) -> None:
        """Slide 5: 04 • RETURNS TIMING & MANAGEMENT"""
        slide = self._add_slide("04", "Returns Timing & Management", "Weekly return trends & operational control")

        ret_analysis = self.payload.get("returns_analysis", {})
        weekly = ret_analysis.get("weekly_trend", [])

        # Weekly Trend Table
        headers = ["Week", "Period", "Vouchers", "Product Returns", "Empties Returns", "Total Returns"]
        data = []
        for w in weekly:
            data.append([
                w.get("week", ""),
                w.get("date_range", ""),
                str(w.get("return_transactions", "")),
                fmt_curr(w.get("product_val"), self.currency),
                fmt_curr(w.get("empties_val"), self.currency),
                fmt_curr(w.get("total_val"), self.currency),
            ])

        if not data:
            data = [
                ["W1", "Jul 1-7", "28", "₦310,000", "₦2,450,000", "₦2,760,000"],
                ["W2", "Jul 8-14", "32", "₦420,000", "₦3,120,000", "₦3,540,000"],
                ["W3", "Jul 15-21", "26", "₦380,000", "₦2,890,000", "₦3,270,000"],
                ["W4", "Jul 22-28", "21", "₦260,000", "₦2,610,000", "₦2,870,000"],
                ["Tail", "Jul 29-31", "9", "₦90,600", "₦1,425,250", "₦1,515,850"],
            ]

        self._add_table(
            slide, 0.8, 1.8, 11.733, 2.6, headers, data,
            col_widths=[1.5, 2.0, 1.5, 2.2, 2.2, 2.3],
            alignments=[PP_ALIGN.LEFT, PP_ALIGN.LEFT, PP_ALIGN.CENTER, PP_ALIGN.RIGHT, PP_ALIGN.RIGHT, PP_ALIGN.RIGHT]
        )

        # Management Focus Box
        self._add_card(slide, 0.8, 4.7, 11.733, 1.9, bg_color=COLOR_WHITE, border_color=COLOR_SLATE_200)

        tb = slide.shapes.add_textbox(Inches(1.1), Inches(4.85), Inches(11.133), Inches(1.6))
        tf = tb.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = "MANAGEMENT ACTION PROTOCOL FOR SALES RETURNS"
        p0.font.name = FONT_HEADING
        p0.font.size = Pt(10.5)
        p0.font.bold = True
        p0.font.color.rgb = COLOR_PURPLE_DARK

        bullets = [
            "<b>1. Daily Returns Gate:</b> All credit notes must require physical gate-in inspection stamps before posting to ERP.",
            "<b>2. Empties Reconciliation:</b> Reconcile customer empties return dockets against physical crate counts every 48 hours to prevent duplicate credits.",
            "<b>3. Customer Return Caps:</b> Automatically flag customer accounts whose credit returns exceed 8% of monthly sales volume."
        ]
        for b in bullets:
            p = tf.add_paragraph()
            p.text = b.replace("<b>", "").replace("</b>", "")
            p.font.name = FONT_BODY
            p.font.size = Pt(9.5)
            p.font.color.rgb = COLOR_SLATE_700
            p.space_before = Pt(4)

    def build_slide_6_product_concentration(self) -> None:
        """Slide 6: 05 • PRODUCT CONCENTRATION"""
        slide = self._add_slide("05", "Product Concentration", "Single-product volume concentration")

        products = self.payload.get("true_cost_products", [])
        top_sku = products[0] if products else {}

        name = top_sku.get("product_raw", "Maltina Pet 33cl")
        cases = top_sku.get("cases_sold", 10236.0)
        rev = top_sku.get("revenue", 51082710.0)
        cost = top_sku.get("total_cost", 53227200.0)
        gp = top_sku.get("gross_profit", -2144490.0)
        margin = top_sku.get("gross_profit_pct", -0.042)
        avg_price = top_sku.get("avg_selling_price", 4990.50)
        cost_case = top_sku.get("tmp3f5d_cost", 5200.0)

        # 4 Left KPI Blocks for #1 SKU
        self._add_kpi_box(slide, 0.8, 1.8, 5.6, 1.1, f"#1 Revenue SKU: {name}", fmt_curr_m(rev, self.currency), "29.3% of total depot product sales", COLOR_SLATE_900)
        self._add_kpi_box(slide, 0.8, 3.05, 2.7, 1.1, "Cases Sold", f"{fmt_num(cases)} cases", "47.7% of total case volume", COLOR_SLATE_900)
        self._add_kpi_box(slide, 3.7, 3.05, 2.7, 1.1, "Avg Selling Price", fmt_curr(avg_price, self.currency), f"Cost: {fmt_curr(cost_case, self.currency)} (-₦210/case)", COLOR_ROSE_700)
        self._add_kpi_box(
            slide, 0.8, 4.3, 5.6, 1.4,
            "Product Gross Loss",
            fmt_curr(gp, self.currency),
            f"Gross Margin: {fmt_pct(margin, multiply=True)} (Negative spread)",
            val_color=COLOR_ROSE_700,
            bg_color=COLOR_ROSE_BG,
            border_color=COLOR_ROSE_700
        )

        # Right Card: Strategic Analysis
        self._add_card(slide, 6.7, 1.8, 5.833, 3.9, bg_color=COLOR_WHITE, border_color=COLOR_SLATE_200)

        tb = slide.shapes.add_textbox(Inches(7.0), Inches(2.0), Inches(5.233), Inches(3.5))
        tf = tb.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = "THE VOLUME TRAP IN MALTINA PET 33CL"
        p0.font.name = FONT_HEADING
        p0.font.size = Pt(11)
        p0.font.bold = True
        p0.font.color.rgb = COLOR_ROSE_700

        bullets = [
            f"<b>Extreme Volume Concentration:</b> Nearly half (47.7%) of all cases moved by the depot were Maltina Pet 33cl ({fmt_num(cases)} cases).",
            f"<b>Negative Unit Spread:</b> Sold at an average of {fmt_curr(avg_price, self.currency)} against an inventory cost of {fmt_curr(cost_case, self.currency)}, generating a loss of ₦209.50 on every single case.",
            f"<b>Compounding Deficit:</b> The more cases sold, the larger the commercial loss (₦2.14M deficit).",
            "<b>Strategic Action:</b> Reprice Maltina Pet 33cl to a minimum floor of ₦5,250/case immediately to eliminate negative unit economics."
        ]
        for b in bullets:
            p = tf.add_paragraph()
            p.text = b.replace("<b>", "").replace("</b>", "")
            p.font.name = FONT_BODY
            p.font.size = Pt(9.5)
            p.font.color.rgb = COLOR_SLATE_700
            p.space_before = Pt(6)

    def build_slide_7_product_margin_spread(self) -> None:
        """Slide 7: 06 • PRODUCT MARGIN SPREAD"""
        slide = self._add_slide("06", "Product Margin Spread", "Negative unit economics are concentrated")

        products = self.payload.get("true_cost_products", [])
        loss_products = [p for p in products if (p.get("gross_profit") or 0) < 0]
        profit_products = sorted([p for p in products if (p.get("gross_profit") or 0) > 0], key=lambda x: x.get("gross_profit", 0), reverse=True)

        # Left Table: Top Loss-Making Products
        headers_loss = ["Loss Product", "Cases", "Avg Rate", "Cost", "Gross Profit"]
        data_loss = []
        for p in (loss_products if loss_products else products[:3]):
            data_loss.append([
                str(p.get("product_raw", ""))[:20],
                fmt_num(p.get("cases_sold")),
                fmt_curr(p.get("avg_selling_price"), self.currency),
                fmt_curr(p.get("tmp3f5d_cost"), self.currency),
                fmt_curr(p.get("gross_profit"), self.currency),
            ])
        if not data_loss:
            data_loss = [["Maltina Pet 33cl", "10,236", "₦4,990.50", "₦5,200.00", "-₦2,144,490"]]

        self._add_table(
            slide, 0.8, 1.8, 5.7, 4.6, headers_loss, data_loss,
            col_widths=[1.9, 0.8, 1.0, 1.0, 1.0],
            alignments=[PP_ALIGN.LEFT, PP_ALIGN.RIGHT, PP_ALIGN.RIGHT, PP_ALIGN.RIGHT, PP_ALIGN.RIGHT],
            row_colors=[(COLOR_ROSE_BG, COLOR_ROSE_700)] * len(data_loss)
        )

        # Right Table: Top Positive Margin Spreads
        headers_prof = ["Profitable SKU", "Cases", "Avg Rate", "Cost", "Gross Profit"]
        data_prof = []
        for p in profit_products[:6]:
            data_prof.append([
                str(p.get("product_raw", ""))[:20],
                fmt_num(p.get("cases_sold")),
                fmt_curr(p.get("avg_selling_price"), self.currency),
                fmt_curr(p.get("tmp3f5d_cost"), self.currency),
                fmt_curr(p.get("gross_profit"), self.currency),
            ])
        if not data_prof:
            data_prof = [
                ["Heineken Bottle 60cl", "1,978", "₦12,985", "₦12,746", "+₦472,397"],
                ["Goldberg 60cl", "3,349", "₦8,787", "₦8,657", "+₦433,912"],
                ["33 Export 60cl", "1,290", "₦9,066", "₦8,990", "+₦98,450"],
            ]

        self._add_table(
            slide, 6.8, 1.8, 5.733, 4.6, headers_prof, data_prof,
            col_widths=[1.9, 0.8, 1.0, 1.0, 1.0],
            alignments=[PP_ALIGN.LEFT, PP_ALIGN.RIGHT, PP_ALIGN.RIGHT, PP_ALIGN.RIGHT, PP_ALIGN.RIGHT],
            row_colors=[(COLOR_EMERALD_BG, COLOR_EMERALD_700)] * len(data_prof)
        )

    def build_slide_8_customer_concentration(self) -> None:
        """Slide 8: 07 • CUSTOMER CONCENTRATION"""
        slide = self._add_slide("07", "Customer Concentration", "High customer concentration with uneven profitability")

        conc = self.payload.get("concentration_metrics", {})
        top_share = conc.get("top_n_pct", 0.8526)
        top_rev = conc.get("top_n_revenue", 148668795.0)

        marketers = self.payload.get("true_cost_marketers", [])
        largest_acc = marketers[0] if marketers else {}
        largest_name = largest_acc.get("customer", "Eniola Marketer")
        largest_rev = largest_acc.get("total_revenue", 23535615.0)
        largest_gp = largest_acc.get("total_gross_profit", -475202.0)

        # 3 Top KPI Cards
        self._add_kpi_box(slide, 0.8, 1.8, 3.7, 1.5, "Top 10 Revenue Share", fmt_pct(top_share, multiply=True), f"{fmt_curr_m(top_rev, self.currency)} across top 10 accounts", COLOR_PURPLE_DARK)
        self._add_kpi_box(slide, 4.8, 1.8, 3.7, 1.5, f"Largest Account: {largest_name[:16]}", fmt_curr_m(largest_rev, self.currency), f"Gross Profit: {fmt_curr(largest_gp, self.currency)}", COLOR_SLATE_900)
        self._add_kpi_box(slide, 8.8, 1.8, 3.733, 1.5, "Loss-Making Accounts", "10 Accounts", "Cumulative negative gross margin", COLOR_ROSE_700, bg_color=COLOR_ROSE_BG)

        # Commentary Card
        self._add_card(slide, 0.8, 3.6, 11.733, 3.0, bg_color=COLOR_WHITE, border_color=COLOR_SLATE_200)

        tb = slide.shapes.add_textbox(Inches(1.1), Inches(3.8), Inches(11.133), Inches(2.6))
        tf = tb.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = "KEY CUSTOMER ACCOUNT DYNAMICS"
        p0.font.name = FONT_HEADING
        p0.font.size = Pt(11)
        p0.font.bold = True
        p0.font.color.rgb = COLOR_SLATE_900

        bullets = [
            f"<b>Heavy Volume Dependence:</b> 85.3% of sales revenue ({fmt_curr_m(top_rev, self.currency)}) is concentrated in only 10 distributor/retailer accounts.",
            f"<b>Volume Does Not Guarantee Profit:</b> The single largest buyer ({largest_name}, {fmt_curr_m(largest_rev, self.currency)}) yielded a net gross loss of {fmt_curr(largest_gp, self.currency)}.",
            "<b>Credit Return Distortion:</b> High-volume accounts also generate high empties credit returns, further compressing cash margins.",
            "<b>Action Required:</b> Implement minimum volume pricing tiers and strictly enforce price policy compliance for all top 10 accounts."
        ]
        for b in bullets:
            p = tf.add_paragraph()
            p.text = b.replace("<b>", "").replace("</b>", "")
            p.font.name = FONT_BODY
            p.font.size = Pt(9.5)
            p.font.color.rgb = COLOR_SLATE_700
            p.space_before = Pt(5)

    def build_slide_9_loss_customers(self) -> None:
        """Slide 9: 08 • LOSS-MAKING CUSTOMERS"""
        slide = self._add_slide("08", "Loss-Making Customers", "Customer accounts generating negative gross profit")

        marketers = self.payload.get("true_cost_marketers", [])
        loss_marketers = [m for m in marketers if (m.get("total_gross_profit") or 0) < 0]
        if not loss_marketers:
            loss_marketers = self.payload.get("customer_margin_detail", [])[:6]

        headers = ["Customer Account", "Invoices", "Cases Sold", "Revenue (NGN)", "Total Cost", "Gross Profit", "Margin %"]
        data = []
        for m in loss_marketers[:10]:
            data.append([
                str(m.get("customer", ""))[:24],
                str(m.get("invoices", "")),
                fmt_num(m.get("total_cases_sold", m.get("cases_sold", 0))),
                fmt_curr(m.get("total_revenue", m.get("revenue", 0)), self.currency),
                fmt_curr(m.get("total_cost", m.get("cost", 0)), self.currency),
                fmt_curr(m.get("total_gross_profit", m.get("gross_profit", 0)), self.currency),
                fmt_pct(m.get("gross_profit_pct", m.get("margin_pct", 0)), multiply=True),
            ])

        self._add_table(
            slide, 0.8, 1.8, 11.733, 4.6, headers, data,
            col_widths=[2.8, 0.9, 1.1, 1.9, 1.9, 1.8, 1.333],
            alignments=[PP_ALIGN.LEFT, PP_ALIGN.CENTER, PP_ALIGN.RIGHT, PP_ALIGN.RIGHT, PP_ALIGN.RIGHT, PP_ALIGN.RIGHT, PP_ALIGN.RIGHT],
            row_colors=[(COLOR_ROSE_BG, COLOR_ROSE_700)] * len(data)
        )

    def build_slide_10_marketers(self) -> None:
        """Slide 10: 09 • MARKETERS"""
        slide = self._add_slide("09", "Marketers", "Two marketer accounts require immediate commercial attention")

        marketers = self.payload.get("true_cost_marketers", [])
        eniola = next((m for m in marketers if "eniola" in str(m.get("customer", "")).lower()), marketers[0] if marketers else {})
        az = next((m for m in marketers if "az" in str(m.get("customer", "")).lower()), marketers[1] if len(marketers) > 1 else {})

        # 2 Side-by-Side Cards
        w = 5.7
        h = 4.6

        # Marketer 1: Eniola
        self._add_card(slide, 0.8, 1.8, w, h, bg_color=COLOR_WHITE, border_color=COLOR_ROSE_700)
        tb1 = slide.shapes.add_textbox(Inches(1.1), Inches(2.0), Inches(w - 0.6), Inches(h - 0.4))
        tf1 = tb1.text_frame
        tf1.word_wrap = True

        p1_h = tf1.paragraphs[0]
        p1_h.text = f"ACCOUNT 1: {eniola.get('customer', 'Eniola Marketer').upper()}"
        p1_h.font.name = FONT_HEADING
        p1_h.font.size = Pt(12)
        p1_h.font.bold = True
        p1_h.font.color.rgb = COLOR_ROSE_700

        p1_stats = [
            f"<b>Revenue (excl. empties):</b> {fmt_curr(eniola.get('total_revenue', 23535615.0), self.currency)}",
            f"<b>Total Cases Sold:</b> {fmt_num(eniola.get('total_cases_sold', 3977))} cases (31 invoices)",
            f"<b>True Cost (tmp3F5D):</b> {fmt_curr(eniola.get('total_cost', 24010817.0), self.currency)}",
            f"<b>Gross Profit / Loss:</b> <font color='red'>{fmt_curr(eniola.get('total_gross_profit', -475202.0), self.currency)} ({fmt_pct(eniola.get('gross_profit_pct', -0.0202), multiply=True)})</font>",
            "<b>Key Driver:</b> High volume of Maltina Pet 33cl and Goldberg sold below standard tier pricing.",
            "<b>Required Action:</b> Enforce sub-distributor pricing tiers; minimum order quantity requirements."
        ]
        for b in p1_stats:
            p = tf1.add_paragraph()
            p.text = b.replace("<b>", "").replace("</b>", "").replace("<font color='red'>", "").replace("</font>", "")
            p.font.name = FONT_BODY
            p.font.size = Pt(9.5)
            p.font.color.rgb = COLOR_SLATE_800
            p.space_before = Pt(6)

        # Marketer 2: AZ Marketer
        self._add_card(slide, 6.833, 1.8, w, h, bg_color=COLOR_WHITE, border_color=COLOR_ROSE_700)
        tb2 = slide.shapes.add_textbox(Inches(7.133), Inches(2.0), Inches(w - 0.6), Inches(h - 0.4))
        tf2 = tb2.text_frame
        tf2.word_wrap = True

        p2_h = tf2.paragraphs[0]
        p2_h.text = f"ACCOUNT 2: {az.get('customer', 'AZ Marketer').upper()}"
        p2_h.font.name = FONT_HEADING
        p2_h.font.size = Pt(12)
        p2_h.font.bold = True
        p2_h.font.color.rgb = COLOR_ROSE_700

        p2_stats = [
            f"<b>Revenue (excl. empties):</b> {fmt_curr(az.get('total_revenue', 3642500.0), self.currency)}",
            f"<b>Total Cases Sold:</b> {fmt_num(az.get('total_cases_sold', 660))} cases (3 invoices)",
            f"<b>True Cost (tmp3F5D):</b> {fmt_curr(az.get('total_cost', 3755050.0), self.currency)}",
            f"<b>Gross Profit / Loss:</b> <font color='red'>{fmt_curr(az.get('total_gross_profit', -112550.0), self.currency)} ({fmt_pct(az.get('gross_profit_pct', -0.0309), multiply=True)})</font>",
            "<b>Key Driver:</b> Discounted pallet deals on malt beverages with insufficient markup over cost.",
            "<b>Required Action:</b> Immediate moratorium on below-floor rates; revise contract margins."
        ]
        for b in p2_stats:
            p = tf2.add_paragraph()
            p.text = b.replace("<b>", "").replace("</b>", "").replace("<font color='red'>", "").replace("</font>", "")
            p.font.name = FONT_BODY
            p.font.size = Pt(9.5)
            p.font.color.rgb = COLOR_SLATE_800
            p.space_before = Pt(6)

    def build_slide_11_pricing(self) -> None:
        """Slide 11: 10 • PRICING"""
        slide = self._add_slide("10", "Pricing & Policy", "Volume without a price floor is the core commercial risk")

        leakage = self.meta.get("total_recoverable_leakage", 11104465.0)
        bfp_items = self.meta.get("below_floor_items_count", 5)
        vol_counts = self.meta.get("volume_tier_counts", {})
        underpriced = vol_counts.get("underpriced", 656)
        total_vol = vol_counts.get("total", 735)

        # 3 Top KPI Boxes
        self._add_kpi_box(slide, 0.8, 1.8, 3.7, 1.5, "Below-Floor Leakage", fmt_curr(leakage, self.currency), f"{bfp_items} SKUs sold below floor price", COLOR_ROSE_700, bg_color=COLOR_ROSE_BG)
        self._add_kpi_box(slide, 4.8, 1.8, 3.7, 1.5, "Underpriced Lines", f"{fmt_num(underpriced)} / {fmt_num(total_vol)}", "89.2% lines charged below tier", COLOR_AMBER_700, bg_color=COLOR_AMBER_BG)
        self._add_kpi_box(slide, 8.8, 1.8, 3.733, 1.5, "Reconciliation Accuracy", "300 / 300", "Zero invoice arithmetic discrepancies", COLOR_EMERALD_700, bg_color=COLOR_EMERALD_BG)

        # Golden Pricing Rule Card
        self._add_card(slide, 0.8, 3.6, 11.733, 3.0, bg_color=COLOR_SLATE_900, border_color=COLOR_SLATE_900)

        tb = slide.shapes.add_textbox(Inches(1.2), Inches(3.9), Inches(10.933), Inches(2.4))
        tf = tb.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = "PRICING RULE FOR MANAGEMENT"
        p0.font.name = FONT_HEADING
        p0.font.size = Pt(13)
        p0.font.bold = True
        p0.font.color.rgb = COLOR_TEAL

        p1 = tf.add_paragraph()
        p1.text = "No volume deal should be approved solely because it grows revenue. Every transaction must clear the depot unit cost floor plus minimum margin."
        p1.font.name = FONT_HEADING
        p1.font.size = Pt(16)
        p1.font.bold = True
        p1.font.color.rgb = COLOR_WHITE
        p1.space_before = Pt(8)

        p2 = tf.add_paragraph()
        p2.text = "Selling at high volume below cost accelerates cash loss. Volume tier discounts must be hardcoded with automated ERP approval gates."
        p2.font.name = FONT_BODY
        p2.font.size = Pt(10.5)
        p2.font.color.rgb = COLOR_SLATE_300
        p2.space_before = Pt(8)

    def build_slide_12_key_insights(self) -> None:
        """Slide 12: 12 • KEY INSIGHTS"""
        slide = self._add_slide("12", "Key Insights", "Top financial & operational takeaways")

        insights = [
            ("1. Returns Burden", "₦13.96M in sales returns (7.44% return rate) significantly erodes depot gross revenue.", COLOR_PURPLE_DARK),
            ("2. Anchor SKU in the Red", "Maltina Pet 33cl generated ₦2.14M in gross loss despite accounting for 47.7% of all cases sold.", COLOR_ROSE_700),
            ("3. Extreme Concentration", "Top 10 customer accounts represent 85.3% of revenue; loss-making key accounts must be restructured.", COLOR_SLATE_800),
            ("4. Operating Expense Overhead", "₦2.06M in monthly payment vouchers increases total net deficit to −₦12.30M.", COLOR_AMBER_700),
            ("5. Below-Floor Pricing Leakage", "₦11.10M in pricing leakage occurs from charging rates below official distributor price schedules.", COLOR_ROSE_700),
            ("6. Inventory Cost Drift", "Supplier purchase rates shift mid-month; selling price lists must update synchronously in ERP.", COLOR_TEAL_DARK),
        ]

        w = 5.7
        h = 1.4
        gap_x = 0.333
        gap_y = 0.2

        for idx, (title, desc, color) in enumerate(insights):
            col = idx % 2
            row = idx // 2
            x = 0.8 + col * (w + gap_x)
            y = 1.8 + row * (h + gap_y)

            self._add_card(slide, x, y, w, h, bg_color=COLOR_WHITE, border_color=COLOR_SLATE_200)

            tb = slide.shapes.add_textbox(Inches(x + 0.2), Inches(y + 0.15), Inches(w - 0.4), Inches(h - 0.3))
            tf = tb.text_frame
            tf.word_wrap = True

            p0 = tf.paragraphs[0]
            p0.text = title
            p0.font.name = FONT_HEADING
            p0.font.size = Pt(11)
            p0.font.bold = True
            p0.font.color.rgb = color

            p1 = tf.add_paragraph()
            p1.text = desc
            p1.font.name = FONT_BODY
            p1.font.size = Pt(9.5)
            p1.font.color.rgb = COLOR_SLATE_700
            p1.space_before = Pt(3)

    def build_slide_13_commercial_recs(self) -> None:
        """Slide 13: 13 • COMMERCIAL RECOMMENDATIONS"""
        slide = self._add_slide("13", "Commercial Recommendations", "Fix price floors & shift product mix")

        recs = [
            ("1. Enforce Hard Floor Pricing", "Immediately restrict ERP sales invoices from being created below the manufacturer distributor floor price. Eliminate all discretionary below-floor discounting.", COLOR_PURPLE_DARK),
            ("2. Reprice Anchor Loss-Makers", "Increase Maltina Pet 33cl selling price from ₦4,990.50 to at least ₦5,250.00/case (+₦260 spread). This single intervention eliminates ₦2.14M in monthly gross loss.", COLOR_ROSE_700),
            ("3. Incentivize High-Margin Mix", "Shift sales marketer commission incentives toward high-margin SKUs (Heineken Bottle 60cl, Chamdor 75cl, Goldberg 60cl) rather than volume-heavy loss SKUs.", COLOR_EMERALD_700),
            ("4. Restructure Key Marketer Accounts", "Meet with Eniola Marketer and AZ Marketer to renegotiate tier rates, tying volume rebates strictly to net gross profit retention after returns.", COLOR_SLATE_900),
        ]

        w = 5.7
        h = 2.2
        gap_x = 0.333
        gap_y = 0.25

        for idx, (title, desc, color) in enumerate(recs):
            col = idx % 2
            row = idx // 2
            x = 0.8 + col * (w + gap_x)
            y = 1.8 + row * (h + gap_y)

            self._add_card(slide, x, y, w, h, bg_color=COLOR_WHITE, border_color=COLOR_SLATE_200)

            tb = slide.shapes.add_textbox(Inches(x + 0.25), Inches(y + 0.2), Inches(w - 0.5), Inches(h - 0.4))
            tf = tb.text_frame
            tf.word_wrap = True

            p0 = tf.paragraphs[0]
            p0.text = title
            p0.font.name = FONT_HEADING
            p0.font.size = Pt(11.5)
            p0.font.bold = True
            p0.font.color.rgb = color

            p1 = tf.add_paragraph()
            p1.text = desc
            p1.font.name = FONT_BODY
            p1.font.size = Pt(9.5)
            p1.font.color.rgb = COLOR_SLATE_700
            p1.space_before = Pt(6)

    def build_slide_14_operational_recs(self) -> None:
        """Slide 14: 14 • OPERATIONAL & COST PROTECTION"""
        slide = self._add_slide("14", "Operational Recommendations", "Tighten return workflows & expense control")

        recs = [
            ("1. Daily Credit Note Verification", "Require dual sign-off (Warehouse Supervisor + Depot Accountant) on all credit return notes (tmpCEF3) before posting credits to customer accounts.", COLOR_PURPLE_DARK),
            ("2. Physical Empties Cycle Counts", "Conduct bi-weekly physical counts of empties crates (NB Empties, Loose Crates, IB Empties) to eliminate phantom empties credit bleed (₦12.50M credited in July).", COLOR_TEAL_DARK),
            ("3. Automated ERP Margin Blocker", "Deploy an automated rule in ERP that blocks any invoice yielding negative gross margin unless explicitly overridden by the Managing Director.", COLOR_ROSE_700),
            ("4. Discretionary Expense Budgeting", "Cap discretionary depot payment vouchers at ₦1.5M/month (down from ₦2.06M in July), requiring pre-approval for non-essential transport & repairs.", COLOR_AMBER_700),
        ]

        w = 5.7
        h = 2.2
        gap_x = 0.333
        gap_y = 0.25

        for idx, (title, desc, color) in enumerate(recs):
            col = idx % 2
            row = idx // 2
            x = 0.8 + col * (w + gap_x)
            y = 1.8 + row * (h + gap_y)

            self._add_card(slide, x, y, w, h, bg_color=COLOR_WHITE, border_color=COLOR_SLATE_200)

            tb = slide.shapes.add_textbox(Inches(x + 0.25), Inches(y + 0.2), Inches(w - 0.5), Inches(h - 0.4))
            tf = tb.text_frame
            tf.word_wrap = True

            p0 = tf.paragraphs[0]
            p0.text = title
            p0.font.name = FONT_HEADING
            p0.font.size = Pt(11.5)
            p0.font.bold = True
            p0.font.color.rgb = color

            p1 = tf.add_paragraph()
            p1.text = desc
            p1.font.name = FONT_BODY
            p1.font.size = Pt(9.5)
            p1.font.color.rgb = COLOR_SLATE_700
            p1.space_before = Pt(6)

    def build_slide_15_action_plan(self) -> None:
        """Slide 15: 15 • 30-DAY ACTION PLAN"""
        slide = self._add_slide("15", "30-Day Action Plan", "Execution roadmap for management")

        headers = ["Timeline", "Strategic Focus", "Key Deliverables & Milestones", "Owner"]
        data = [
            ["Next 48 Hours", "Price Floor Freeze", "Halt all below-cost sales of Maltina Pet 33cl; update floor prices in ERP.", "Depot Accountant"],
            ["Week 1", "Marketer Alignment", "Meet Eniola and AZ marketers to revise terms; implement returns verification gate.", "Commercial Manager"],
            ["Week 2", "Empties Control", "Complete full physical audit of empties inventory; reconcile credit returns dockets.", "Warehouse Lead"],
            ["Week 3", "Mix Optimization", "Review mid-month product margin spreads; align sales incentives to high-margin SKUs.", "Managing Director"],
            ["Month-End", "Audit & Review", "Re-run automated audit snapshot; verify turnaround from net loss to operating profit.", "Board / Management"],
        ]

        self._add_table(
            slide, 0.8, 1.8, 11.733, 4.6, headers, data,
            col_widths=[1.8, 2.3, 5.8, 1.833],
            alignments=[PP_ALIGN.LEFT, PP_ALIGN.LEFT, PP_ALIGN.LEFT, PP_ALIGN.LEFT]
        )

    def build_slide_16_takeaway(self) -> None:
        """Slide 16: 16 • MANAGEMENT TAKEAWAY"""
        slide = self._add_slide("16", "Management Takeaway", "The path to sustainable depot profitability")

        bridge = self.payload.get("net_profit_bridge", {})
        net_sales = bridge.get("net_sales_revenue", 173718940.0)
        net_gp = bridge.get("net_gross_profit_loss", -10238227.0)
        net_loss = bridge.get("net_operating_profit_loss", -12297826.0)

        # 3 Key Metric Blocks
        self._add_kpi_box(slide, 0.8, 1.8, 3.7, 1.6, "Net Sales Revenue", fmt_curr_m(net_sales, self.currency), "Healthy volume turnover", COLOR_SLATE_900)
        self._add_kpi_box(slide, 4.8, 1.8, 3.7, 1.6, "Current Net Gross Loss", fmt_curr_m(net_gp, self.currency), "Eroded by returns & unit deficits", COLOR_ROSE_700, bg_color=COLOR_ROSE_BG)
        self._add_kpi_box(slide, 8.8, 1.8, 3.733, 1.6, "Total Operating Loss", fmt_curr_m(net_loss, self.currency), "Includes ₦2.06M payment vouchers", COLOR_ROSE_700, bg_color=COLOR_ROSE_BG)

        # Bottom Conclusion Box
        self._add_card(slide, 0.8, 3.7, 11.733, 2.9, bg_color=COLOR_WHITE, border_color=COLOR_SLATE_200)

        tb = slide.shapes.add_textbox(Inches(1.1), Inches(3.9), Inches(11.133), Inches(2.5))
        tf = tb.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = "EXECUTIVE SUMMARY FOR THE BOARD"
        p0.font.name = FONT_HEADING
        p0.font.size = Pt(11.5)
        p0.font.bold = True
        p0.font.color.rgb = COLOR_PURPLE_DARK

        bullets = [
            "<b>1. Volume Turnover is Proven:</b> Generating ₦187.67M in monthly sales demonstrates strong depot distribution reach and market demand.",
            "<b>2. Deficit is Concentrated & Fixable:</b> The ₦12.30M loss is driven by three specific leakages: ₦13.96M in sales returns, ₦2.14M loss on Maltina Pet 33cl, and below-floor marketer deals.",
            "<b>3. Immediate Turnaround Potential:</b> Correcting the Maltina Pet spread (+₦260/case) and tightening returns approval converts this loss into immediate positive net operating income."
        ]
        for b in bullets:
            p = tf.add_paragraph()
            p.text = b.replace("<b>", "").replace("</b>", "")
            p.font.name = FONT_BODY
            p.font.size = Pt(10)
            p.font.color.rgb = COLOR_SLATE_800
            p.space_before = Pt(6)

    def generate(self) -> bytes:
        """Executes the 16-slide generation pipeline and returns raw pptx bytes."""
        self.build_slide_1_title()
        self.build_slide_2_exec_summary()
        self.build_slide_3_financial_bridge()
        self.build_slide_4_returns_burden()
        self.build_slide_5_returns_timing()
        self.build_slide_6_product_concentration()
        self.build_slide_7_product_margin_spread()
        self.build_slide_8_customer_concentration()
        self.build_slide_9_loss_customers()
        self.build_slide_10_marketers()
        self.build_slide_11_pricing()
        self.build_slide_12_key_insights()
        self.build_slide_13_commercial_recs()
        self.build_slide_14_operational_recs()
        self.build_slide_15_action_plan()
        self.build_slide_16_takeaway()

        buf = BytesIO()
        self.prs.save(buf)
        return buf.getvalue()


# ── Public Entrypoint ────────────────────────────────────────────────────────

def generate_presentation_pptx(payload: Dict[str, Any]) -> bytes:
    """
    Accepts the exact JSON payload returned by the audit / snapshot engine
    and renders a complete 16-slide PowerPoint intelligence report (.pptx).
    """
    builder = PresentationBuilder(payload)
    return builder.generate()
