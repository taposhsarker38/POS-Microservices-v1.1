import requests
from django.conf import settings

class InventoryService:
    @staticmethod
    def increase_stock(order_item, company_uuid, warehouse_id, token):
        """
        Call Inventory Service Synchronously to adjust stock.
        """
        import requests
        
        from adaptix_core.service_registry import ServiceRegistry
        # Internal URL for Inventory Service (Docker Service Name)
        url = f"{ServiceRegistry.get_api_url('inventory')}/inventory/stocks/adjust/"
        
        payload = {
            "warehouse_id": warehouse_id,
            "product_uuid": str(order_item.product_uuid),
            "quantity": float(order_item.quantity),
            "type": "add",
            "notes": f"PO #{order_item.order.reference_number}"
        }
        
        headers = {
            "Authorization": token, # Pass through the JWT
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers)
            if response.status_code >= 400:
                print(f"Inventory Error: {response.text}")
                return False
            return True
        except Exception as e:
            print(f"Failed to call inventory service: {e}")
            return False

class RFQService:
    @staticmethod
    def auto_select_winner(rfq_id):
        """
        Logic to select the best quote based on lowest price.
        """
        from .models import RFQ, VendorQuote, PurchaseOrder, PurchaseOrderItem
        from django.db import transaction
        from django.utils import timezone
        
        try:
            with transaction.atomic():
                rfq = RFQ.objects.get(id=rfq_id)
                if rfq.status != 'open':
                    return None
                
                quotes = rfq.quotes.all().order_by('unit_price')
                if not quotes.exists():
                    return None
                
                winner = quotes.first()
                winner.is_winning_quote = True
                winner.save()
                
                rfq.selected_quote = winner
                rfq.status = 'converted'
                rfq.save()
                
                # Generate PO
                import uuid
                ref = f"PO-{str(uuid.uuid4())[:8].upper()}"
                
                po = PurchaseOrder.objects.create(
                    company_uuid=rfq.company_uuid,
                    vendor=winner.vendor,
                    reference_number=ref,
                    status='draft',
                    total_amount=winner.unit_price * rfq.quantity,
                    notes=f"Automatically generated from RFQ: {rfq.title}"
                )
                
                PurchaseOrderItem.objects.create(
                    company_uuid=rfq.company_uuid,
                    order=po,
                    product_uuid=rfq.product_uuid,
                    variant_uuid=rfq.variant_uuid,
                    quantity=rfq.quantity,
                    unit_cost=winner.unit_price
                )
                
                return po
        except Exception as e:
            print(f"Error in auto_select_winner: {e}")
            return None
