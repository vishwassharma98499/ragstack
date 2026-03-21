def test_project_imports():
    from app.config import settings
    assert settings is not None

def test_settings_has_required_fields():
    from app.config import settings
    assert hasattr(settings, "EMBEDDING_MODEL")
    assert hasattr(settings, "CHROMA_PERSIST_DIR")