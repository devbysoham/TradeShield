from fastapi import FastAPI

from app.schemas import (
    CurrencyForecastRequest,
    ContractAdviceRequest,
    ShipmentRiskRequest,
    InsuranceRequest,
    DocumentRequest,
    DocumentVerifyRequest,
    ContractIntegrityRequest,
    WorkspaceRequest,
)

from app.services.currency import get_currency_forecast
from app.services.contracts import (
    get_contract_advice,
    verify_contract_integrity,
)
from app.services.shipment import analyze_shipment
from app.services.insurance import recommend_insurance
from app.services.documents import register_document, verify_document
from app.services.workspace import get_workspace


app = FastAPI()


# 1. Check whether the backend is running
@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }


# 2. Currency Intelligence
@app.post("/currency/forecast")
def currency_forecast(request: CurrencyForecastRequest):
    return get_currency_forecast(
        request.currency_pair,
        request.forecast_days,
    )


# 3. Forward Contract Advisor
@app.post("/contracts/advice")
def contract_advice(request: ContractAdviceRequest):
    return get_contract_advice(
        request.currency_pair,
        request.amount,
        request.current_rate,
        request.offered_forward_rate,
        request.payment_days,
    )


# 4. Shipment Risk
@app.post("/shipments/analyze")
def shipment_risk(request: ShipmentRiskRequest):
    return analyze_shipment(
        
        request.origin,
        request.destination,
        request.cargo_type,
        request.departure_date,
        request.transport_mode,
    )


# 5. Insurance Advisor
@app.post("/insurance/recommend")
def insurance_advice(request: InsuranceRequest):
    return recommend_insurance(
        request.cargo_type,
        request.cargo_value,
        request.currency,
        request.origin,
        request.destination,
        request.transport_mode,
    )


# 6. Digital Documentation
@app.post("/documents")
def create_document(request: DocumentRequest):
    return register_document(
        request.document_name,
        request.document_type,
        request.trade_reference,
        request.owner_role,
    )


@app.post("/documents/verify")
def document_verification(request: DocumentVerifyRequest):
    return verify_document(
        request.document_id,
        request.expected_hash,
        request.submitted_hash,
    )


# 7. Contract Integrity
@app.post("/contracts/verify-integrity")
def contract_integrity(request: ContractIntegrityRequest):
    return verify_contract_integrity(
        request.contract_id,
        request.contract_terms,
        request.expected_hash,
    )


# 8. Exporter / Importer Workspace
@app.post("/workspace")
def workspace(request: WorkspaceRequest):
    return get_workspace(request.role)