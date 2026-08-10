"""
Client profile schema.

Every depot/client gets one of these (stored as JSON in clients/<client_id>/profile.json).
This is what makes the engine reusable across clients instead of hardcoded to Kane-Jones:
- column aliases handle sheets that name things slightly differently
- volume tier thresholds are business policy, not universal truth
- raw tab names may differ (some clients may not keep a tmpXXXX raw dump at all)
"""

from dataclasses import dataclass, field
from typing import Optional
import json


# Canonical field names the engine works with internally.
# COLUMN_ALIASES maps a client's actual header text -> canonical name.
DEFAULT_COLUMN_ALIASES = {
    "date": ["VOUCHER DATE", "DATE", "TRANS DATE"],
    "customer": ["PARTICULARS", "CUSTOMER", "CLIENT"],
    "invoice_no": ["VCHNO", "INVOICE NO", "INV NO"],
    "po_no": ["PURCHASE ORDER NO", "PO NO"],
    "transaction_value": ["TRANSACTION VALUE", "TRANS VALUE", "TRANS. VALUE"],
    "received_amount": ["RECEIVED AMOUNT", "AMOUNT RECEIVED"],
    "outstanding_amount": ["OUTSTANDING AMOUNT", "OUTSTANDING", "BALANCE"],
    "gross_revenue": ["GROSS REVENUE", "REVENUE"],
    "invoice_cost": ["COST"],
    "gross_profit": ["GROSS PROFIT", "PROFIT"],
    "pct_profit": ["% PROFIT", "PROFIT %", "MARGIN %"],
    "narration": ["NARRATION", "NOTES", "REMARKS"],
    # item-block sub-table headers
    "item_service": ["ITEM/SERVICE", "ITEM", "SERVICE", "PRODUCT"],
    "quantity": ["QUANTITY", "QTY"],
    "rate": ["RATE", "UNIT PRICE"],
    "item_cost": ["COST"],
    "description": ["DESCRIPTION", "DESC"],
}

DEFAULT_VOLUME_TIERS = [
    # (min_cases, max_cases_or_None, price_tier)
    # price_tier must be one of: "distributor", "sub_distributor", "retail"
    (300, None, "distributor"),
    (50, 299, "sub_distributor"),
    (0, 49, "retail"),
]

# Rows/products to ignore when computing product-level revenue & audits
# (these are container/deposit lines, not sellable product).
DEFAULT_EMPTIES_KEYWORDS = ["EMPTIES", "EMPTY"]


@dataclass
class ClientProfile:
    client_id: str
    display_name: str
    currency_symbol: str = "\u20a6"  # Naira
    raw_data_sheets: list = field(default_factory=lambda: [])  # e.g. ["tmpA1A6", "tmp32C7"]
    price_list_sheet: str = "Price list"
    daily_sheet_pattern: Optional[str] = None  # e.g. "*Sales Report*" (informational; not required by engine)
    column_aliases: dict = field(default_factory=lambda: DEFAULT_COLUMN_ALIASES.copy())
    volume_tiers: list = field(default_factory=lambda: [t for t in DEFAULT_VOLUME_TIERS])
    empties_keywords: list = field(default_factory=lambda: DEFAULT_EMPTIES_KEYWORDS.copy())
    fuzzy_match_threshold: int = 80  # rapidfuzz score 0-100 below which a product match is rejected
    manual_overrides: dict = field(default_factory=dict)  # product_raw -> exact SKU string
    reconciliation_tolerance_pct: float = 0.01  # 1% tolerance between invoice gross_revenue and line item sum
    reconciliation_min_tolerance_amount: float = 100.0  # minimum naira tolerance for reconciliation check
    product_dominance_threshold: float = 0.20  # revenue share threshold (20%) above which a product is flagged as concentration risk

    def to_json(self, path: str):
        with open(path, "w") as f:
            json.dump(self.__dict__, f, indent=2)

    @classmethod
    def from_json(cls, path: str) -> "ClientProfile":
        with open(path) as f:
            data = json.load(f)
        return cls(**data)


def kane_jones_profile() -> ClientProfile:
    return ClientProfile(
        client_id="kane-jones",
        display_name="Kane-Jones Depot (Ogun State)",
        raw_data_sheets=["tmpA1A6", "tmp32C7"],
        price_list_sheet="Price list",
        daily_sheet_pattern="* Sales Report*",
        manual_overrides={
            "Amstel Bottle": "Amstel Malta Bottle 33cl",
            "Amstel Can": "Amstel Malta Sleek Can 33cl",
            "CLIMAX CAN": "Climax Sleek Can 33cl",
            "Fayrouz Bottle": "Fayrouz Pineapple Bottle 33cl",
            "Fayrouz Can": "Fayrouz Apple Watermelon Sleek Can",
        },
    )
