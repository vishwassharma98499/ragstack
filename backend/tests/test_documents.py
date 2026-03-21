def test_upload_requires_file(client):
    response = client.post("/api/documents/upload")
    assert response.status_code in [400, 422]

def test_list_documents(client):
    response = client.get("/api/documents")
    assert response.status_code in [200, 401]
