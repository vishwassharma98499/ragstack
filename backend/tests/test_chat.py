def test_chat_requires_message(client):
    response = client.post("/api/chat", json={})
    assert response.status_code in [400, 422]

def test_chat_with_empty_message(client):
    response = client.post("/api/chat", json={"message": ""})
    assert response.status_code in [400, 422]
