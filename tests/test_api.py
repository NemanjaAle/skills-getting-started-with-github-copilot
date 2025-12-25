import copy

import pytest
from fastapi.testclient import TestClient

from src.app import activities, app


ORIGINAL_ACTIVITIES = copy.deepcopy(activities)


@pytest.fixture(autouse=True)
def reset_activities_state():
    activities.clear()
    activities.update(copy.deepcopy(ORIGINAL_ACTIVITIES))


@pytest.fixture()
def client():
    return TestClient(app)


def test_get_activities_returns_data(client: TestClient):
    response = client.get("/activities")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, dict)
    assert "Soccer Team" in data
    assert "participants" in data["Soccer Team"]


def test_signup_adds_participant(client: TestClient):
    activity_name = "Chess Club"
    email = "new.student@mergington.edu"

    assert email not in activities[activity_name]["participants"]

    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )
    assert response.status_code == 200
    assert "Signed up" in response.json().get("message", "")

    assert email in activities[activity_name]["participants"]


def test_signup_rejects_duplicate_participant(client: TestClient):
    activity_name = "Soccer Team"
    email = "alex@mergington.edu"

    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )
    assert response.status_code == 400
    assert response.json().get("detail") == "Student already signed up for this activity"


def test_signup_activity_not_found(client: TestClient):
    response = client.post(
        "/activities/Does%20Not%20Exist/signup",
        params={"email": "someone@mergington.edu"},
    )
    assert response.status_code == 404
    assert response.json().get("detail") == "Activity not found"


def test_signup_requires_email_query_param(client: TestClient):
    response = client.post("/activities/Chess%20Club/signup")
    assert response.status_code == 422


def test_unregister_removes_participant(client: TestClient):
    activity_name = "Soccer Team"
    email = "alex@mergington.edu"

    assert email in activities[activity_name]["participants"]

    response = client.delete(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )
    assert response.status_code == 200
    assert "Unregistered" in response.json().get("message", "")

    assert email not in activities[activity_name]["participants"]


def test_unregister_activity_not_found(client: TestClient):
    response = client.delete(
        "/activities/Does%20Not%20Exist/signup",
        params={"email": "someone@mergington.edu"},
    )
    assert response.status_code == 404
    assert response.json().get("detail") == "Activity not found"


def test_unregister_missing_participant_returns_404(client: TestClient):
    response = client.delete(
        "/activities/Chess%20Club/signup",
        params={"email": "not.signed.up@mergington.edu"},
    )
    assert response.status_code == 404
    assert response.json().get("detail") == "Student is not signed up for this activity"


def test_unregister_requires_email_query_param(client: TestClient):
    response = client.delete("/activities/Chess%20Club/signup")
    assert response.status_code == 422
