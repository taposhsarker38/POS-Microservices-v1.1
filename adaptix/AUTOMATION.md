# 🤖 Adaptix Automation Guide

## Overview

Adaptix includes comprehensive automation for CI/CD, monitoring, security, and business operations.

---

## 📋 Automation Summary

| Category         | Automation           | Schedule       |
| ---------------- | -------------------- | -------------- |
| **CI/CD**        | Build, Test, Deploy  | On push/PR     |
| **Backup**       | Database backup      | Daily 2 AM     |
| **Monitoring**   | Health checks        | Every 5 min    |
| **Security**     | Vulnerability scan   | Weekly         |
| **Dependencies** | Update check         | Weekly         |
| **Business**     | Sales reports        | Daily 6 AM     |
| **Business**     | Low stock alerts     | Every 30 min   |
| **Billing**      | Subscription renewal | Daily midnight |
| **Maintenance**  | Data cleanup         | Daily 3 AM     |
| **Maintenance**  | DB optimization      | Weekly         |

---

## 🔄 CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Push                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. 🔍 Lint & Code Quality                                  │
│     - Black (formatting)                                    │
│     - Flake8 (linting)                                      │
│     - Bandit (security)                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. 🧪 Run Tests                                            │
│     - Unit tests                                            │
│     - Integration tests                                     │
│     - Coverage report                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. 🏗️ Build Docker Images                                  │
│     - Build all 14 services                                 │
│     - Push to GitHub Container Registry                     │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
           ┌───────────────┐   ┌───────────────┐
           │   Staging     │   │  Production   │
           │  (develop)    │   │  (v* tags)    │
           └───────────────┘   └───────────────┘
```

---

## ⏰ Scheduled Tasks (Celery Beat)

### Sales & Reports

```python
# Daily sales report at 6 AM
'daily-sales-report': crontab(hour=6, minute=0)
```

### Inventory

```python
# Check low stock every 30 minutes
'low-stock-check': crontab(minute='*/30')

# Auto reorder when stock is low
auto_reorder.delay(product_id, company_uuid)
```

### Billing

```python
# Process subscriptions at midnight
'process-subscriptions': crontab(hour=0, minute=0)

# Trial expiry reminders at 9 AM
'trial-expiry-reminder': crontab(hour=9, minute=0)
```

### Maintenance

```python
# Cleanup old data at 3 AM
'cleanup-old-sessions': crontab(hour=3, minute=0)

# Optimize database weekly (Sunday 4 AM)
'optimize-database': crontab(hour=4, day_of_week=0)
```

---

## 🔔 Alerts & Notifications

### Slack Notifications

- Deployment success/failure
- Security scan results
- Health check failures
- Database backup status

### Email Notifications

- Daily sales reports (per company)
- Low stock alerts
- Trial expiry reminders
- Subscription invoices
- System alerts

### In-App Notifications

- Order updates
- Inventory alerts
- Payment confirmations

---

## 🛠️ Setup Instructions

### 1. Configure GitHub Secrets

Go to: `Settings → Secrets → Actions`

Required secrets:

```
PRODUCTION_HOST        - Production server IP
PRODUCTION_USER        - SSH username
PRODUCTION_SSH_KEY     - SSH private key
PRODUCTION_DOMAIN      - e.g., adaptix.io
SLACK_WEBHOOK          - Slack incoming webhook URL
SMTP_USER              - Email username
SMTP_PASSWORD          - Email password
ALERT_EMAIL            - Admin email for alerts
S3_BUCKET              - Backup storage bucket
```

### 2. Enable Workflows

Workflows are automatically enabled. Check:
`Actions` tab in GitHub

### 3. Configure Celery

In your `settings.py`:

```python
CELERY_BEAT_SCHEDULE = {
    'daily-sales-report': {
        'task': 'automation.tasks.generate_daily_sales_report',
        'schedule': crontab(hour=6, minute=0),
    },
    # ... other tasks
}
```

### 4. Start Celery Workers

```bash
# Worker
celery -A config worker -l info -Q default,high_priority

# Beat scheduler
celery -A config beat -l info
```

---

## 📊 Monitoring Dashboard

Access Grafana at: `https://your-domain:3000`

### Key Metrics:

- API response time
- Error rate
- Active users
- Orders per minute
- Database connections
- Memory/CPU usage

### Alerts:

- Response time > 2s
- Error rate > 1%
- Database connections > 80%
- Disk usage > 80%

---

## 🔒 Security Automation

### Weekly Security Scan

- Dependency vulnerabilities (Safety)
- Code analysis (CodeQL)
- Docker image scan (Trivy)
- Secrets detection (Gitleaks)

### Automatic Updates

- Dependabot creates PRs for outdated dependencies
- Review and merge weekly

---

## 🆘 Troubleshooting

### CI/CD fails

1. Check workflow logs in Actions tab
2. Common issues: test failures, Docker build errors

### Celery tasks not running

1. Check worker status: `docker-compose logs celery-worker`
2. Check Redis connection
3. Verify CELERY_BEAT_SCHEDULE in settings

### Slack notifications not working

1. Verify SLACK_WEBHOOK secret
2. Test webhook URL manually

---

_Last Updated: December 2024_
