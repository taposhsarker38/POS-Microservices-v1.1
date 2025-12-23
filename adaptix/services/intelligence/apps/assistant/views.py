from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import BasePermission
from .nlp_engine import NLPEngine
import logging

logger = logging.getLogger(__name__)

class IsJWTAuthenticated(BasePermission):
    """
    Allows access if JWTCompanyMiddleware successfully validated the token.
    """
    def has_permission(self, request, view):
        # Check if user_claims were populated by middleware
        return bool(getattr(request, 'user_claims', None))

class ChatView(APIView):
    permission_classes = [IsJWTAuthenticated]

    def post(self, request):
        """
        Handle chat messages from the frontend assistant.
        Payload: { "message": "..." }
        """
        # Get Company UUID from request (Middleware adds this)
        if not hasattr(request, 'company_uuid'):
            # Fallback if middleware not active or superuser without company
            return Response({"error": "Company context missing"}, status=400)
            
        message = request.data.get("message", "")
        if not message:
            return Response({"error": "Message is required"}, status=400)

        engine = NLPEngine(company_uuid=request.company_uuid)
        response_data = engine.process_message(message)

        return Response(response_data)
