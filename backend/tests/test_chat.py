def test_rag_service_importable():
    from app.services import rag
    assert rag is not None

def test_llm_service_importable():
    from app.services import llm
    assert llm is not None