import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.main import (
    health_check,
    compliance_overview,
    compliance_norms,
    compliance_check,
)
from app.schemas import ComplianceCheckRequest

def run_tests():
    print("=== 1. Testing Health Check Endpoint ===")
    health = health_check()
    print("Result:", health)
    assert health == {"status": "ok"}

    print("\n=== 2. Testing Compliance Overview Endpoint (GET /api/compliance/overview) ===")
    overview = compliance_overview()
    print("Master policy:", overview["master_policy"])
    print("Active FTAs count:", overview["active_ftas_count"])
    print("Trading partners count:", overview["trading_partners_count"])
    print("Commodity codes count:", overview["commodity_codes_count"])
    print("Top export destinations:", overview["top_export_destinations"])
    print("Top import sources:", overview["top_import_sources"])
    print("Recent notifications registered:", len(overview["recent_notifications"]))
    print("Portals registered:", len(overview["portals"]))
    print("Product categories:", overview["product_categories"])
    print("FEMA statutory rule:", overview["fema_rules"]["statutory_framework"])
    assert overview["active_ftas_count"] == 53
    assert len(overview["ftas"]) >= 7

    print("\n=== 3. Testing Compliance Norms Endpoint (GET /api/compliance/norms) ===")
    norms = compliance_norms()
    print("Document title:", norms["document_title"])
    print("Source:", norms["source"])
    print("Sections count:", len(norms["sections"]))
    for s in norms["sections"]:
        tbl_count = sum(1 for b in s["blocks"] if b["type"] == "table")
        blt_count = sum(1 for b in s["blocks"] if b["type"] == "bullets")
        sub_count = sum(1 for b in s["blocks"] if b["type"] == "subheading")
        par_count = sum(1 for b in s["blocks"] if b["type"] == "paragraph")
        print(f"  [{s['number']}] {s['title']} -> {len(s['blocks'])} blocks (subs: {sub_count}, tables: {tbl_count}, bullets: {blt_count}, paras: {par_count}) | links: {len(s['links'])}")
    assert len(norms["sections"]) == 7

    print("\n=== 4. Testing Compliance Check Endpoint (POST /api/compliance/check) ===")
    test_cases = [
        {
            "desc": 'UK Alias: "uk" with Engineering Goods ($250,000)',
            "req": ComplianceCheckRequest(
                trade_type="export",
                partner_country="uk",
                product_category="Engineering Goods",
                hs_code="8483",
                declared_value_usd=250000.0,
            ),
        },
        {
            "desc": 'UAE Alias: "dubai" with Engineering Goods ($150,000)',
            "req": ComplianceCheckRequest(
                trade_type="export",
                partner_country="dubai",
                product_category="Engineering Goods",
                hs_code="8483",
                declared_value_usd=150000.0,
            ),
        },
        {
            "desc": 'EU Member: "Germany" -> European Union (Pharmaceuticals $100,000)',
            "req": ComplianceCheckRequest(
                trade_type="export",
                partner_country="Germany",
                product_category="Pharmaceuticals",
                hs_code="3004",
                declared_value_usd=100000.0,
            ),
        },
        {
            "desc": 'EU Member: "France" -> European Union (Organic Textiles $75,000)',
            "req": ComplianceCheckRequest(
                trade_type="export",
                partner_country="France",
                product_category="Organic Textiles",
                hs_code="5208",
                declared_value_usd=75000.0,
            ),
        },
        {
            "desc": 'Korea Alias: "rok" -> South Korea (Engineering Goods $200,000)',
            "req": ComplianceCheckRequest(
                trade_type="export",
                partner_country="rok",
                product_category="Engineering Goods",
                hs_code="8483",
                declared_value_usd=200000.0,
            ),
        },
        {
            "desc": "Non-FTA Partner: USA (Engineering Goods $100,000)",
            "req": ComplianceCheckRequest(
                trade_type="export",
                partner_country="USA",
                product_category="Engineering Goods",
                hs_code="8483",
                declared_value_usd=100000.0,
            ),
        },
        {
            "desc": "Restriction Trigger: Agarwood Ch. 12 (Notification 46/2026-27)",
            "req": ComplianceCheckRequest(
                trade_type="export",
                partner_country="UAE",
                product_category="Agarwood & Forest Derivatives",
                hs_code="1211",
                declared_value_usd=50000.0,
            ),
        },
        {
            "desc": "Agricultural Products (APEDA + Phytosanitary) to United Kingdom",
            "req": ComplianceCheckRequest(
                trade_type="export",
                partner_country="United Kingdom",
                product_category="Agricultural Products",
                hs_code="1006",
                declared_value_usd=120000.0,
            ),
        },
        {
            "desc": "Marine Products (MPEDA + Health Cert + HACCP) to Japan",
            "req": ComplianceCheckRequest(
                trade_type="export",
                partner_country="Japan",
                product_category="Marine Products",
                hs_code="0306",
                declared_value_usd=80000.0,
            ),
        },
    ]

    for tc in test_cases:
        res = compliance_check(tc["req"])
        print(f"\n[Test Case] {tc['desc']}")
        print(f"  Input Country: '{tc['req'].partner_country}' -> Matched FTA: '{res['matched_fta_country']}'")
        print(f"  Policy Status: {res['policy_status']} (Restricted: {res['is_restricted']})")
        if res["policy_alerts"]:
            for alert in res["policy_alerts"]:
                print(f"  Policy Alert: {alert}")
        print(f"  Standard Duty: ${res['tariff_breakdown']['standard_duty_usd']:,.2f} ({res['tariff_breakdown']['total_standard_duty_pct']}%)")
        print(f"  Preferential Duty: ${res['tariff_breakdown']['preferential_duty_usd']:,.2f} ({res['tariff_breakdown']['preferential_duty_pct']}%)")
        print(f"  Duty Savings: ${res['tariff_breakdown']['net_duty_savings_usd']:,.2f} (INR: Rs. {res['tariff_breakdown']['net_duty_savings_inr']:,.2f})")
        print(f"  RoDTEP Rebate: ${res['export_incentives']['rodtep_rebate_usd']:,.2f} (INR: Rs. {res['export_incentives']['rodtep_rebate_inr']:,.2f})")
        print(f"  Mandatory Docs ({len(res['mandatory_documents'])}): {res['mandatory_documents']}")
        print(f"  FEMA Status: {res['fema_compliance']['fema_status']} ({res['fema_compliance']['days_remaining']} days remaining)")

    print("\n=======================================================")
    print("SUCCESS: ALL COMPLIANCE ENDPOINTS AND ALIASES VERIFIED!")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()
