def test_document_router_exists():
    import os
    assert os.path.exists("app/api/documents.py")

def test_pdf_service_exists():
    import os
    assert os.path.exists("app/services/pdf_service.py")

def test_schemas_exist():
    import os
    assert os.path.exists("app/models/schemas.py")