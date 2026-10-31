from pydantic import BaseModel, Field
from typing import Literal, Optional


# Currency Intelligence
class CurrencyForecastRequest(BaseModel):
    currency_pair: str = "USD/INR"
    forecast_days: int = Field(default=15, ge=1, le=15)


# Forward Contract Advisor
class ContractAdviceRequest(BaseModel):
    currency_pair: str = "USD/INR"
    amount: float = Field(gt=0)
    current_rate: float = Field(gt=0)
    offered_forward_rate: float = Field(gt=0)
    payment_days: int = Field(gt=0)


# Shipment Risk
class ShipmentRiskRequest(BaseModel):
    origin: str
    destination: str
    cargo_type: str
    departure_date: str
    transport_mode: Literal["sea", "air", "land"] = "sea"


# Insurance Advisor
class InsuranceRequest(BaseModel):
    cargo_type: str
    cargo_value: float = Field(gt=0)
    currency: str = "USD"
    origin: str
    destination: str
    transport_mode: Literal["sea", "air", "land"] = "sea"


# Digital Documentation
class DocumentRequest(BaseModel):
    document_name: str
    document_type: Literal[
        "invoice",
        "packing_list",
        "insurance",
        "bill_of_lading",
        "other",
    ]
    trade_reference: str
    owner_role: Literal["exporter", "importer"]


class DocumentVerifyRequest(BaseModel):
    document_id: str
    expected_hash: str
    submitted_hash: str


# Contract Integrity
class ContractIntegrityRequest(BaseModel):
    contract_id: str
    contract_terms: str
    expected_hash: Optional[str] = None


# Exporter / Importer Workspace
class WorkspaceRequest(BaseModel):
    role: Literal["exporter", "importer"]