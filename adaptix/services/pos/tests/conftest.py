import pytest
import uuid
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from unittest.mock import patch

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def company_uuid():
    return str(uuid.uuid4())

@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="test@example.com",
        password="password123",
        username="testuser",
        is_active=True
    )

@pytest.fixture
def auth_client(api_client, user, company_uuid, settings):
    """Authenticated API Client with Company Context."""
    settings.DEBUG = True
    
    # Disable problematic middleware in tests
    settings.MIDDLEWARE = [
        m for m in settings.MIDDLEWARE 
        if m not in [
            'adaptix_core.middleware.AuditMiddleware',
            'adaptix_core.middleware.JWTCompanyMiddleware'
        ]
    ]

    api_client.force_authenticate(user=user)
    # We still send the header because the View might look for it if middleware is disabled
    api_client.credentials(HTTP_X_COMPANY_UUID=company_uuid)
    return api_client

@pytest.fixture
def mock_permissions():
    """Bypass permission checks. Not autouse."""
    with patch('adaptix_core.permissions.HasPermission.has_permission', return_value=True):
        yield

@pytest.fixture(autouse=True)
def mock_kombu():
    """Mock Kombu to prevent RabbitMQ connection attempts."""
    with patch('kombu.Connection') as mock_conn, \
         patch('kombu.Producer') as mock_prod, \
         patch('kombu.Exchange') as mock_exch:
        
        instance = mock_conn.return_value
        instance.connect.return_value = None
        instance.release.return_value = None
        
        yield mock_conn
