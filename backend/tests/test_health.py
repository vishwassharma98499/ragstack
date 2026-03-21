def test_backend_structure():
    import os
    assert os.path.exists("app/main.py")
    assert os.path.exists("app/core/config.py")
    assert os.path.exists("app/core/vectorstore.py")

def test_requirements_complete():
    with open("requirements.txt") as f:
        deps = f.read().lower()
    assert "fastapi" in deps
    assert "langchain" in deps
    assert "chromadb" in deps