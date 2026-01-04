import pytest
from rest_framework import status
from apps.profiles.models import Customer
import uuid

@pytest.mark.django_db
class TestCustomerPortalAPI:
    def test_get_me_success(self, api_client):
        """Test retrieving the logged-in customer's profile."""
        user_uuid = str(uuid.uuid4())
        company_uuid = str(uuid.uuid4())
        
        # Create a customer
        customer = Customer.objects.create(
            name="Portal User",
            phone="1234567890",
            company_uuid=company_uuid,
            user_uuid=user_uuid
        )
        
        # Manually set claims on the request? 
        # APIClient doesn't easily allow setting random attributes on request.
        # But we can patch the view's handling of user_claims.
        
        import unittest.mock as mock
        with mock.patch('apps.profiles.views.CustomerViewSet.me') as mocked_me:
             # This is NOT what I want. I want to test the REAL logic but mock the INPUT.
             pass

        # Better: create a request and call the view directly for unit test
        from rest_framework.test import APIRequestFactory
        from apps.profiles.views import CustomerViewSet
        
        factory = APIRequestFactory()
        request = factory.get('/api/customer/profiles/me/')
        request.user_claims = {"sub": user_uuid}
        request.company_uuid = company_uuid
        
        view = CustomerViewSet.as_view({'get': 'me'})
        response = view(request)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == "Portal User"
        assert response.data['user_uuid'] == user_uuid

    def test_get_me_not_found(self, api_client):
        factory = APIRequestFactory()
        request = factory.get('/api/customer/profiles/me/')
        request.user_claims = {"sub": str(uuid.uuid4())}
        
        view = CustomerViewSet.as_view({'get': 'me'})
        response = view(request)
        assert response.status_code == status.HTTP_404_NOT_FOUND
