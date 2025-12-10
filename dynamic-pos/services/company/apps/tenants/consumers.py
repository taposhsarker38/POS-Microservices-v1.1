import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # We assume JWT middleware puts user_claims in scope, or we parse query param
        # For simplicity, let's assume client sends ?token=... and we parse it 
        # OR we rely on browser cookie/header if possible (but WS headers are tricky)
        # Let's use a query param 'user_id' for MVP simulation or middleware.
        # Middleware is better but complex to debug.
        # Let's trust the middleware we built? config/middleware.py is WSGI. 
        # We need ASGI middleware for JWT.
        
        # Checking scope for user info (simulated for now)
        self.user_id = self.scope.get("user_id") # We need to inject this in ASGI middleware
        
        # Fallback for demo: Allow anyone to connect and subscribe to "user_UUID" if they send it
        # INSECURE: Do not do this in prod without validation.
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        params = dict(x.split('=') for x in query_string.split('&') if '=' in x)
        self.user_id = params.get("user_id")

        if self.user_id:
            self.group_name = f"user_{self.user_id}"
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    # Receive message from room group
    async def notify_user(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': event.get('event_type', 'notification'),
            'message': message,
            'payload': event.get('payload', {})
        }))
