# Depot Sales Intelligence Engine — MVP core

This is the analysis engine core, built and tested against the real Kane-Jones July file.
It's the risk-heavy part of the whole system (parsing a messy multi-block spreadsheet
reliably and matching products to prices correctly) — the dashboard and docx export are
NOT built yet. This is meant to be picked up in Antigravity and carried forward.

## What's here

```
engine/
  config.py        # ClientProfile — makes the engine reusable across clients, not Kane-Jones-only
  parser.py         # Raw invoice-block sheet -> normalized invoices_df + line_items_df
  price_match.py    # Fuzzy-matches product names to price list SKUs
  audit.py           # Below-floor pricing, volume-tier audit, daily/weekly trend,
                       product & customer ranking, concentration metrics
clients/
  kane-jones/        # (empty placeholder — save a profile.json here per client)
sample_data/
  July_sales_report_v4.xlsx   # the real file, for testing
```

## Status: tested against the real file

Run this to reproduce everything:

```bash
pip install pandas openpyxl rapidfuzz
python3 -c "
from engine.config import kane_jones_profile
from engine.parser import parse_workbook
from engine.price_match import load_price_list, match_products
from engine.audit import *

profile = kane_jones_profile()
inv_df, li_df, anomalies_df = parse_workbook('sample_data/July_sales_report_v4.xlsx', profile)
price_df = load_price_list('sample_data/July_sales_report_v4.xlsx', profile)
matched = match_products(li_df, price_df, profile)
print(below_floor_pricing(matched, profile))
"
```

Results so far:
- **Parser**: 300 invoices, 944 line items parsed correctly from the raw `tmpA1A6`/`tmp32C7`
  blocks. It correctly caught and isolated the exact "self-referencing SUM range" formula
  bug the original report flagged in Section 7 (row 216) as an anomaly instead of letting it
  corrupt the next invoice's data — that failure mode was caught and fixed during this build.
- **Revenue total**: engine computes ₦185.0M vs. the report's ₦186.1M. The ~1M gap matches
  a discrepancy the original report itself flagged (Section 7): July 29-31 data exists in two
  slightly different raw extracts (`tmp32C7` vs. the official daily sheets), and this engine
  currently only reads the raw tabs. Worth deciding which source is authoritative and
  encoding that choice into the client profile.
- **Price matching**: works well for exact/near-exact names (e.g. "Maltina Pet 33cl" → 100%
  exact match). **Known bug, not yet fixed**: pure text-similarity fuzzy matching can match
  the wrong pack size — "Goldberg 60cl" incorrectly matched "Goldberg Can 50cl" (80% text
  similarity) instead of the correct "Goldberg Bottle 60cl", because token_sort_ratio doesn't
  treat the size token as a hard constraint. This silently produced a wildly wrong below-floor
  number for Kane-Jones's #3 revenue product. **Fix before trusting any output**: extract
  pack size (cl/L/case-count) as a separate token via regex and require it to match exactly,
  falling back to fuzzy matching only for the remaining text. This is the single highest-value
  next task.
- **Audit logic**: below-floor pricing, volume-tier pricing audit, daily/weekly trend,
  product & customer ranking, and concentration metrics are all implemented and running —
  but their accuracy is only as good as the price-matching bug above gets fixed first.

## Design principles to keep as you extend this

- **Config-driven, not hardcoded.** Every client gets a `ClientProfile` (see `config.py`) —
  column name aliases, volume-tier thresholds, which sheets hold raw data, empties keywords.
  Adding a second depot should mean writing a new profile, not touching engine code.
- **Anomalies are collected, not swallowed.** The parser never guesses past something it
  doesn't understand — it logs it and moves on. Surface `anomalies_df` on the dashboard
  (e.g. "12 rows in this month's file needed manual review") so pricing/data errors in the
  source file get caught, not silently absorbed into wrong totals.
- **One source of truth for numbers.** Dashboard and docx export should both read from the
  same audit DataFrames — never let the LLM narration invent a number that isn't in the data.

## Next steps (suggested order)

1. Fix pack-size-aware product matching (see above) — this is the accuracy-critical piece.
2. Add a `ClientProfile` for a second, differently-shaped depot file to pressure-test the
   config-driven design before it calcifies around Kane-Jones's exact layout.
3. Wrap this in a FastAPI service: `POST /analyze` (upload xlsx + client_id) → returns JSON.
4. Build the Next.js dashboard reading that JSON (trend chart, product/customer tables,
   pricing-leak table, anomaly log).
5. Add the docx report generator (python-docx) reading the same audit tables, plus an LLM
   call for the executive-summary prose — grounded strictly in the computed numbers.
6. Add Postgres (Supabase) persistence so months/clients accumulate instead of being
   re-computed and discarded each upload.
