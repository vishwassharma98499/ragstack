def test_chat_router_exists():
    import os
    assert os.path.exists("app/api/chat.py")

def test_rag_service_exists():
    import os
    assert os.path.exists("app/services/rag_service.py")