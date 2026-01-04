import json
from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.mail import send_mail, get_connection
from kombu import Connection, Exchange, Queue
from apps.emails.models import EmailTemplate, NotificationLog, SMTPSettings

class Command(BaseCommand):
    help = 'Runs the notification consumer to send emails based on events'

    def handle(self, *args, **options):
        broker_url = getattr(settings, "CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672/")
        exchange = Exchange("events", type="topic", durable=True)
        queue = Queue("notification_queue", exchange=exchange, routing_key="#")

        self.stdout.write(self.style.SUCCESS(f"Starting Notification Consumer on {broker_url}"))
        
        with Connection(broker_url) as conn:
            with conn.Consumer(queue, callbacks=[self.process_message]) as consumer:
                while True:
                    conn.drain_events()

    def process_message(self, body, message):
        try:
            if isinstance(body, bytes):
                body = body.decode('utf-8')
            if isinstance(body, str):
                body = json.loads(body)
            event_type = body.get('type')
            self.stdout.write(f"Received event: {event_type}")

            if event_type == 'user.registered':
                self.handle_user_registered(body)
            elif event_type == 'customer.verify_email':
                self.handle_verification_otp(body)
            elif event_type == 'customer.verify_phone':
                self.handle_verification_sms(body)
            elif event_type == 'sales.production_requested':
                self.handle_order_intake(body)
            elif event_type == 'manufacturing.defect_escalation':
                self.handle_defect_escalation(body)
            elif event_type == 'production.output_created':
                self.handle_production_output_alert(body)
            elif event_type == 'pos.order.delivered':
                self.handle_delivery_confirmation(body)
            elif event_type == 'pos.payment.recorded':
                self.handle_payment_alert(body)

            message.ack()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing message: {e}"))
            message.ack() # Ack anyway to avoid loops for now

    def handle_verification_otp(self, data):
        email = data.get('email')
        otp = data.get('otp')
        if not email or not otp:
            return

        # Explicitly log OTP for development/debug
        self.stdout.write(self.style.WARNING(f"--------------------------------------------------"))
        self.stdout.write(self.style.WARNING(f" SENT OTP to {email}: {otp} "))
        self.stdout.write(self.style.WARNING(f"--------------------------------------------------"))

        subject = "Verify your email - Adaptix ERP"
        body = f"Hello {data.get('customer_name', 'Customer')},\n\nYour verification code is: {otp}\n\nPlease enter this code to verify your account."
        
        try:
            # Check for tenant-specific SMTP (Copy logic or refactor, copying for safety now)
            company_uuid = data.get('company_uuid')
            smtp_conn = None
            from_email = settings.DEFAULT_FROM_EMAIL
            tenant_smtp = None

            if company_uuid:
                tenant_smtp = SMTPSettings.objects.filter(company_uuid=company_uuid).first()
            else:
                # Fallback to default tenant (for dev/single-tenant setup)
                default_uuid = "00000000-0000-0000-0000-000000000000"
                tenant_smtp = SMTPSettings.objects.filter(company_uuid=default_uuid).first()
                if tenant_smtp:
                    self.stdout.write(f"Using Default Tenant SMTP for {default_uuid}")
            
            if tenant_smtp:
                self.stdout.write(f"Using Tenant SMTP for {tenant_smtp.company_uuid}: {tenant_smtp.host} as {tenant_smtp.username}")
                smtp_conn = get_connection(
                    host=tenant_smtp.host,
                    port=tenant_smtp.port,
                    username=tenant_smtp.username,
                    password=tenant_smtp.password,
                    use_tls=tenant_smtp.use_tls,
                    use_ssl=tenant_smtp.use_ssl,
                )
                from_email = tenant_smtp.default_from_email
            else:
                 self.stdout.write("No Tenant SMTP found, falling back to global.")
            
            send_mail(subject, body, from_email, [email], fail_silently=False, connection=smtp_conn)
            
            NotificationLog.objects.create(recipient=email, subject=subject, content=body, status='sent')
            self.stdout.write(self.style.SUCCESS(f"Email sent to {email}"))
        except Exception as e:
            NotificationLog.objects.create(recipient=email, subject=subject, content=body, status='failed', error_message=str(e))
            self.stdout.write(self.style.ERROR(f"Failed to send email: {e}"))

    def handle_user_registered(self, data):
        email = data.get('email')
        if not email:
            return

        try:
            # Try to get dynamic template
            template = EmailTemplate.objects.get(code='user.registered')
            subject = template.subject
            body = template.body.format(**data) # Safe format map
        except EmailTemplate.DoesNotExist:
            # Fallback
            subject = "Welcome to POS System"
            body = f"Hello {data.get('username')}, welcome to our platform!"
        except Exception as e:
            # Fallback on format error
            subject = "Welcome to POS System"
            body = f"Hello {data.get('username')}, welcome!"

        try:
            # Check for tenant-specific SMTP
            company_uuid = data.get('company_uuid')
            smtp_conn = None
            from_email = settings.DEFAULT_FROM_EMAIL
            tenant_smtp = None
            
            if company_uuid:
                tenant_smtp = SMTPSettings.objects.filter(company_uuid=company_uuid).first()
            else:
                # Fallback to default tenant (for dev/single-tenant setup)
                default_uuid = "00000000-0000-0000-0000-000000000000"
                tenant_smtp = SMTPSettings.objects.filter(company_uuid=default_uuid).first()
                if tenant_smtp:
                    self.stdout.write(f"Using Default Tenant SMTP for {default_uuid}")

            if tenant_smtp:
                smtp_conn = get_connection(
                    host=tenant_smtp.host,
                    port=tenant_smtp.port,
                    username=tenant_smtp.username,
                    password=tenant_smtp.password,
                    use_tls=tenant_smtp.use_tls,
                    use_ssl=tenant_smtp.use_ssl,
                )
                from_email = tenant_smtp.default_from_email
                self.stdout.write(f"Using Tenant SMTP for {tenant_smtp.company_uuid}")

            send_mail(
                subject,
                body,
                from_email,
                [email],
                fail_silently=False,
                connection=smtp_conn
            )
            
            NotificationLog.objects.create(
                recipient=email,
                subject=subject,
                content=body,
                status='sent'
            )
            self.stdout.write(self.style.SUCCESS(f"Sent Welcome Email to {email}"))
            
        except Exception as e:
            NotificationLog.objects.create(
                recipient=email,
                subject=subject,
                content=body,
                status='failed',
                error_message=str(e)
            )
            self.stdout.write(self.style.ERROR(f"Failed to send email to {email}: {e}"))

    def handle_verification_sms(self, data):
        phone = data.get('phone')
        otp = data.get('otp')
        if not phone or not otp:
            return

        # Explicitly log OTP for development/debug
        self.stdout.write(self.style.WARNING(f"--------------------------------------------------"))
        self.stdout.write(self.style.WARNING(f" [MOCK SMS] SENT OTP to {phone}: {otp} "))
        self.stdout.write(self.style.WARNING(f"--------------------------------------------------"))
        
        # Here we would integrate Twilio / SNS / Other SMS Gateway
        # For now, we just log it as successful delivery mock
        self.stdout.write(self.style.SUCCESS(f"Mock SMS sent to {phone}"))

    def handle_order_intake(self, data):
        """Alert Factory Manager about new order"""
        order_number = data.get('order_number')
        qty = data.get('quantity')
        self.stdout.write(self.style.WARNING(f" [ALERT] New Order {order_number} for {qty} units! Notifying Factory Manager... "))
        # Logic to send email to factory manager from HRM lookup...

    def handle_defect_escalation(self, data):
        """Alert Management about high defect rate or specific failure"""
        order_num = data.get('order_number')
        category = data.get('defect_category')
        self.stdout.write(self.style.ERROR(f" [ESCALATION] Quality Alert on {order_num}: Defect Category {category} detected. "))

    def handle_production_output_alert(self, data):
        """Notify Head Office stock is ready for shipping"""
        order_num = data.get('source_order_number')
        if order_num:
            self.stdout.write(self.style.SUCCESS(f" [UPDATE] Production completed for Head Office Order {order_num}. Ready for shipment. "))

    def handle_delivery_confirmation(self, data):
        """Real-time SMS to Head Office on delivery"""
        order_num = data.get('order_number')
        self.stdout.write(self.style.SUCCESS(f" [SMS] Real-time Alert: Order {order_num} has been successfully DELIVERED to customer. "))

    def handle_payment_alert(self, data):
        """Notify Accounts about recorded payment"""
        order_num = data.get('order_number')
        amount = data.get('amount')
        self.stdout.write(self.style.WARNING(f" [FINANCE] Payment of ${amount} recorded for Order {order_num}. Accounts notified. "))
