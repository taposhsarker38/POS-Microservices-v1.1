"""
Adaptix Automated Background Tasks
==================================
Celery tasks for automated operations.
"""

from celery import shared_task
from celery.schedules import crontab
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger('automation')


# ============================================
# Scheduled Tasks Configuration
# ============================================

CELERY_BEAT_SCHEDULE = {
    # Daily Reports
    'daily-sales-report': {
        'task': 'automation.tasks.generate_daily_sales_report',
        'schedule': crontab(hour=6, minute=0),  # 6 AM daily
    },
    
    # Trial Expiry Reminders
    'trial-expiry-reminder': {
        'task': 'automation.tasks.send_trial_expiry_reminders',
        'schedule': crontab(hour=9, minute=0),  # 9 AM daily
    },
    
    # Low Stock Alerts
    'low-stock-check': {
        'task': 'automation.tasks.check_low_stock',
        'schedule': crontab(minute='*/30'),  # Every 30 minutes
    },
    
    # Cleanup Old Data
    'cleanup-old-sessions': {
        'task': 'automation.tasks.cleanup_old_data',
        'schedule': crontab(hour=3, minute=0),  # 3 AM daily
    },
    
    # Subscription Billing
    'process-subscriptions': {
        'task': 'automation.tasks.process_subscription_billing',
        'schedule': crontab(hour=0, minute=0),  # Midnight daily
    },
    
    # Database Optimization
    'optimize-database': {
        'task': 'automation.tasks.optimize_database',
        'schedule': crontab(hour=4, minute=0, day_of_week=0),  # Sunday 4 AM
    },
}


# ============================================
# Sales & Reports
# ============================================

@shared_task(name='automation.tasks.generate_daily_sales_report')
def generate_daily_sales_report():
    """Generate and email daily sales report to company admins."""
    from apps.core.models import Company
    from apps.sales.models import Order
    
    yesterday = timezone.now().date() - timedelta(days=1)
    
    companies = Company.objects.filter(is_active=True)
    
    for company in companies:
        try:
            orders = Order.objects.filter(
                company_uuid=company.id,
                created_at__date=yesterday
            )
            
            total_sales = sum(o.total for o in orders)
            order_count = orders.count()
            
            # Send email report
            send_mail(
                subject=f'Daily Sales Report - {yesterday}',
                message=f'''
                Daily Sales Report for {company.name}
                Date: {yesterday}
                
                Total Orders: {order_count}
                Total Sales: ৳{total_sales:,.2f}
                
                - Adaptix Team
                ''',
                from_email='reports@adaptix.io',
                recipient_list=[company.email],
                fail_silently=True
            )
            
            logger.info(f"Sent daily report to {company.name}")
            
        except Exception as e:
            logger.error(f"Failed to generate report for {company.name}: {e}")

    return f"Processed {companies.count()} companies"


# ============================================
# Inventory Automation
# ============================================

@shared_task(name='automation.tasks.check_low_stock')
def check_low_stock():
    """Check for low stock items and send alerts."""
    from apps.inventory.models import Inventory
    from apps.core.models import Company
    
    alerts_sent = 0
    
    companies = Company.objects.filter(is_active=True)
    
    for company in companies:
        low_stock = Inventory.objects.filter(
            company_uuid=company.id,
            quantity__lte=10  # Threshold
        )
        
        if low_stock.exists():
            items_list = "\n".join([
                f"- {item.product_name}: {item.quantity} remaining"
                for item in low_stock[:10]
            ])
            
            send_mail(
                subject='⚠️ Low Stock Alert',
                message=f'''
                The following items are running low:
                
                {items_list}
                
                Please reorder soon.
                
                - Adaptix Inventory System
                ''',
                from_email='alerts@adaptix.io',
                recipient_list=[company.email],
                fail_silently=True
            )
            
            alerts_sent += 1

    return f"Sent {alerts_sent} low stock alerts"


@shared_task(name='automation.tasks.auto_reorder')
def auto_reorder(product_id, company_uuid):
    """Automatically create purchase order for low stock items."""
    from apps.inventory.models import Inventory
    from apps.purchase.models import PurchaseOrder, PurchaseOrderItem
    
    try:
        inventory = Inventory.objects.get(
            product_id=product_id,
            company_uuid=company_uuid
        )
        
        if inventory.quantity <= inventory.reorder_level:
            # Create purchase order
            po = PurchaseOrder.objects.create(
                company_uuid=company_uuid,
                vendor_id=inventory.preferred_vendor_id,
                status='draft',
                notes='Auto-generated reorder'
            )
            
            PurchaseOrderItem.objects.create(
                order=po,
                product_id=product_id,
                quantity=inventory.reorder_quantity,
                unit_cost=inventory.last_purchase_price
            )
            
            logger.info(f"Auto-created PO {po.id} for {inventory.product_name}")
            return f"Created PO {po.id}"
            
    except Exception as e:
        logger.error(f"Auto-reorder failed: {e}")
        return f"Failed: {e}"


# ============================================
# Subscription & Billing
# ============================================

@shared_task(name='automation.tasks.send_trial_expiry_reminders')
def send_trial_expiry_reminders():
    """Send reminder emails for expiring trials."""
    from apps.core.models import Company
    
    # Trials expiring in 3 days
    expiry_date = timezone.now().date() + timedelta(days=3)
    
    expiring = Company.objects.filter(
        is_trial=True,
        is_active=True,
        trial_ends_at__date=expiry_date
    )
    
    for company in expiring:
        send_mail(
            subject='⏰ Your Adaptix Trial Expires in 3 Days',
            message=f'''
            Hi {company.name},
            
            Your Adaptix trial expires on {company.trial_ends_at.date()}.
            
            Upgrade now to continue using all features:
            https://adaptix.io/upgrade?company={company.code}
            
            Questions? Reply to this email.
            
            - Adaptix Team
            ''',
            from_email='billing@adaptix.io',
            recipient_list=[company.email],
            fail_silently=True
        )

    return f"Sent {expiring.count()} reminders"


@shared_task(name='automation.tasks.process_subscription_billing')
def process_subscription_billing():
    """Process daily subscription renewals."""
    from apps.core.models import Company
    from apps.billing.models import Invoice
    
    today = timezone.now().date()
    
    # Companies due for billing today
    due_companies = Company.objects.filter(
        is_active=True,
        is_trial=False,
        next_billing_date=today
    )
    
    processed = 0
    
    for company in due_companies:
        try:
            # Create invoice
            invoice = Invoice.objects.create(
                company=company,
                amount=company.monthly_price,
                due_date=today + timedelta(days=7),
                status='pending'
            )
            
            # TODO: Charge payment method (bKash, card, etc.)
            # payment_result = charge_customer(company, invoice.amount)
            
            # Update next billing date
            company.next_billing_date = today + timedelta(days=30)
            company.save()
            
            processed += 1
            
        except Exception as e:
            logger.error(f"Billing failed for {company.name}: {e}")

    return f"Processed {processed} subscriptions"


# ============================================
# Maintenance Tasks
# ============================================

@shared_task(name='automation.tasks.cleanup_old_data')
def cleanup_old_data():
    """Clean up old sessions, logs, and temporary data."""
    from django.contrib.sessions.models import Session
    
    # Delete expired sessions
    deleted_sessions = Session.objects.filter(
        expire_date__lt=timezone.now()
    ).delete()
    
    # Delete old audit logs (keep 90 days)
    from apps.audit.models import AuditLog
    cutoff = timezone.now() - timedelta(days=90)
    deleted_logs = AuditLog.objects.filter(
        created_at__lt=cutoff
    ).delete()
    
    logger.info(f"Cleanup: {deleted_sessions} sessions, {deleted_logs} logs")
    
    return "Cleanup complete"


@shared_task(name='automation.tasks.optimize_database')
def optimize_database():
    """Run database optimization (VACUUM, ANALYZE)."""
    from django.db import connection
    
    with connection.cursor() as cursor:
        cursor.execute("VACUUM ANALYZE;")
    
    logger.info("Database optimized")
    return "Database optimized"


# ============================================
# Notification Tasks
# ============================================

@shared_task(name='automation.tasks.send_notification')
def send_notification(user_id, title, message, notification_type='info'):
    """Send notification to user (email, push, in-app)."""
    from apps.notification.models import Notification
    from apps.accounts.models import User
    
    try:
        user = User.objects.get(id=user_id)
        
        # Create in-app notification
        Notification.objects.create(
            user=user,
            title=title,
            message=message,
            type=notification_type
        )
        
        # Send email
        send_mail(
            subject=title,
            message=message,
            from_email='notifications@adaptix.io',
            recipient_list=[user.email],
            fail_silently=True
        )
        
        return f"Notification sent to {user.email}"
        
    except Exception as e:
        logger.error(f"Notification failed: {e}")
        return f"Failed: {e}"


@shared_task(name='automation.tasks.send_bulk_notification')
def send_bulk_notification(company_uuid, title, message):
    """Send notification to all users in a company."""
    from apps.accounts.models import User
    
    users = User.objects.filter(company_uuid=company_uuid, is_active=True)
    
    for user in users:
        send_notification.delay(user.id, title, message)
    
    return f"Queued {users.count()} notifications"
