from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from io import BytesIO
from datetime import datetime

class PDFService:
    @staticmethod
    def generate_daily_production_report(data):
        """
        data: {
             "date": "2026-01-04",
             "total_produced": 120,
             "total_passed": 115,
             "total_failed": 5,
             "defects": [
                 {"category": "Cooling", "count": 3},
                 {"category": "Body", "count": 2}
             ]
        }
        """
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        # Title
        p.setFont("Helvetica-Bold", 16)
        p.drawString(100, height - 50, f"Daily Production & QC Report - {data['date']}")
        
        p.setFont("Helvetica", 12)
        p.drawString(100, height - 80, f"Total Produced: {data['total_produced']} units")
        p.drawString(100, height - 100, f"Total Passed: {data['total_passed']} units")
        p.drawString(100, height - 120, f"Total Failed/Rework: {data['total_failed']} units")

        # Defects section
        p.setFont("Helvetica-Bold", 12)
        p.drawString(100, height - 150, "Defect Analysis:")
        
        y = height - 170
        p.setFont("Helvetica", 10)
        for defect in data.get('defects', []):
            p.drawString(120, y, f"- {defect['category']}: {defect['count']} units")
            y -= 20

        p.showPage()
        p.save()
        
        buffer.seek(0)
        return buffer

    @staticmethod
    def generate_customer_order_report(data):
        """
        data: {
            "customer": "Customer Name",
            "target": 500,
            "ready": 300,
            "in_production": 200,
            "shipped": 50,
            "due_amount": 25000
        }
        """
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        p.setFont("Helvetica-Bold", 18)
        p.drawString(100, height - 50, f"{data['customer']} - Order Progress Report")
        
        p.setFont("Helvetica", 12)
        p.drawString(100, height - 80, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        
        # Summary Table-like
        p.drawString(100, height - 120, f"Total Order Target: {data['target']} Units")
        p.drawString(100, height - 140, f"Units Ready (Passed QC): {data['ready']} Units")
        p.drawString(100, height - 160, f"Units in Production: {data['in_production']} Units")
        p.drawString(100, height - 180, f"Units Already Shipped: {data['shipped']} Units")
        
        # ProgressBar simulation
        progress = (data['ready'] / data['target']) * 100 if data['target'] > 0 else 0
        p.drawString(100, height - 220, f"Overall Progress: {progress:.1f}%")
        p.rect(100, height - 240, 400, 20)
        p.setFillColorRGB(0, 0.7, 0)
        p.rect(100, height - 240, 400 * (progress/100), 20, fill=1)
        
        # Payment info
        p.setFillColorRGB(0, 0, 0)
        p.setFont("Helvetica-Bold", 12)
        p.drawString(100, height - 280, f"Payment Status:")
        p.setFont("Helvetica", 12)
        p.drawString(100, height - 300, f"Outstanding Balance: ${data['due_amount']:.2f}")

        p.showPage()
        p.save()
        
        buffer.seek(0)
        return buffer

    @staticmethod
    def generate_qr_labels(units):
        """
        units: list of dict { "serial_number": "...", "model_name": "..." }
        """
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Grid settings
        cols = 3
        rows = 4
        label_width = 160
        label_height = 140
        margin_x = 50
        margin_y = 50
        
        for i, unit in enumerate(units):
            if i > 0 and i % (cols * rows) == 0:
                p.showPage()
            
            idx = i % (cols * rows)
            col = idx % cols
            row = idx // cols
            
            x = margin_x + (col * (label_width + 20))
            y = height - margin_y - ((row + 1) * (label_height + 20))
            
            # Draw Label Box
            p.setStrokeColorRGB(0.8, 0.8, 0.8)
            p.rect(x, y, label_width, label_height)
            
            # Draw QR Placeholder
            p.setStrokeColorRGB(0, 0, 0)
            p.rect(x + 30, y + 40, 100, 100)
            p.setFont("Helvetica-Bold", 10)
            p.drawCentredString(x + label_width/2, y + label_height - 20, "ADAPTIX QR ENGINE")
            
            p.setFont("Helvetica", 8)
            p.drawCentredString(x + label_width/2, y + 25, f"SERIAL: {unit['serial_number']}")
            p.drawCentredString(x + label_width/2, y + 15, f"MODEL: {unit.get('model_name', 'N/A')}")
            
        p.showPage()
        p.save()
        buffer.seek(0)
        return buffer
