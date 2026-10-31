def register_document(
    document_name,
    document_type,
    trade_reference,
    owner_role,
):
    return {
        "feature": "digital_documentation",
        "status": "pending_integration",
        "document_name": document_name,
        "document_type": document_type,
        "trade_reference": trade_reference,
        "owner_role": owner_role,
        "message": (
            "document storage, document IDs and QR generation."
        )
    }


def verify_document(document_id, expected_hash, submitted_hash):
    return {
        "feature": "document_verification",
        "status": "pending_integration",
        "document_id": document_id,
        "message": (
            "document hash comparison and verification records."
        )
    }