import os
import openpyxl
import pytest
from engine.config import ClientProfile, kane_jones_profile
from engine.sheet_classifier import classify_workbook_sheets, ClassificationReport


@pytest.fixture
def sample_xlsx_path():
    path = os.path.join("sample_data", "July_sales_report_v6.xlsx")
    if not os.path.exists(path):
        pytest.skip(f"Sample data file not found at {path}")
    return path


def test_classify_standard_workbook(sample_xlsx_path):
    profile = kane_jones_profile()
    report: ClassificationReport = classify_workbook_sheets(sample_xlsx_path, profile)

    # 1. Sales sheets (both hierarchical raw dumps identified)
    assert "tmpA1A6" in report.sales_sheets
    assert "tmp32C7" in report.sales_sheets
    assert len(report.sales_sheets) == 2

    # 2. Inventory sheet
    assert report.inventory_sheet == "tmp3F5D"

    # 3. Sales returns sheet
    assert report.sales_returns_sheet == "tmpCEF3"

    # 4. Unclassified report/summary sheets (correctly skipped from contaminating raw parsing)
    assert len(report.unclassified_sheets) > 0
    unclassified_names = [u["sheet_name"] for u in report.unclassified_sheets]
    assert "Product" in unclassified_names
    assert "Marketers" in unclassified_names
    assert "July 1st Sales Report" in unclassified_names


def test_classify_dedicated_price_list(tmp_path):
    """Test dedicated 3-tier price list detection."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Master Price Matrix"
    ws.append(["SKU Description", "Distributor Price", "Sub-Distributor Price", "Retail Price"])
    ws.append(["Heineken 33cl", 12000, 12500, 13000])
    ws.append(["Goldberg 60cl", 8500, 8800, 9200])

    path = str(tmp_path / "pricing.xlsx")
    wb.save(path)

    profile = ClientProfile(client_id="test", display_name="Test Depot", price_list_sheet="")
    report = classify_workbook_sheets(path, profile)

    assert report.price_list_sheet == "Master Price Matrix"


def test_classify_renamed_sheets(sample_xlsx_path, tmp_path):
    """Stress test: sheets renamed to arbitrary names without profile hints."""
    wb = openpyxl.load_workbook(sample_xlsx_path)
    wb["tmpA1A6"].title = "tmpZZ99_Sales"
    wb["tmp32C7"].title = "tmpYY88_Sales"
    wb["tmp3F5D"].title = "tmpINV77_Stock"
    wb["tmpCEF3"].title = "tmpRET66_Returns"

    renamed_path = str(tmp_path / "renamed.xlsx")
    wb.save(renamed_path)

    # Generic profile with no sheet hints
    generic_profile = ClientProfile(
        client_id="generic",
        display_name="Generic Depot",
        raw_data_sheets=[],
        price_list_sheet="Price list",
        inventory_sheet="",
        sales_returns_sheet="",
        expenses_sheet="",
    )

    report = classify_workbook_sheets(renamed_path, generic_profile)

    assert "tmpZZ99_Sales" in report.sales_sheets
    assert "tmpYY88_Sales" in report.sales_sheets
    assert report.inventory_sheet == "tmpINV77_Stock"
    assert report.sales_returns_sheet == "tmpRET66_Returns"
