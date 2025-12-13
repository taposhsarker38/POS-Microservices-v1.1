# 🌐 Adaptix SaaS Hosting Guide

## Overview

This guide explains how to host Adaptix as a SaaS platform where you manage everything and customers just log in.

---

## 📊 SaaS Model

```
┌──────────────────────────────────────────────────────────────┐
│                    YOUR SERVER                               │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Single Adaptix Deployment              │    │
│  │                                                     │    │
│  │  Database: All companies share same DB              │    │
│  │  Data isolation: By company_uuid                    │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Company A  │  │  Company B  │  │  Company C  │
│ abc.adaptix │  │ xyz.adaptix │  │ 123.adaptix │
│     .io     │  │     .io     │  │     .io     │
└─────────────┘  └─────────────┘  └─────────────┘
```

---

## 🎯 Features

| Feature                 | Description                              |
| ----------------------- | ---------------------------------------- |
| **Subdomain Routing**   | Each customer gets: `company.adaptix.io` |
| **Custom Domains**      | Optional: `pos.customer.com`             |
| **Centralized Billing** | You handle all payments                  |
| **Easy Onboarding**     | Admin panel to create customers          |
| **Auto Scaling**        | Handle any number of customers           |
| **Single Maintenance**  | Update once, affects all                 |

---

## 🛠️ Setup Steps

### Step 1: Server Requirements

**Minimum (up to 100 customers):**

- 4 CPU cores
- 16 GB RAM
- 200 GB SSD
- Ubuntu 22.04

**Recommended (100-1000 customers):**

- 8 CPU cores
- 32 GB RAM
- 500 GB SSD
- Ubuntu 22.04

### Step 2: Domain Setup

1. **Buy domain**: `adaptix.io` (or your choice)
2. **DNS Setup**:
   ```
   A     adaptix.io          → your-server-ip
   A     *.adaptix.io        → your-server-ip  (Wildcard)
   A     admin.adaptix.io    → your-server-ip
   ```

### Step 3: SSL Certificate (Wildcard)

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Get wildcard certificate (requires DNS validation)
certbot certonly \
    --manual \
    --preferred-challenges dns \
    -d adaptix.io \
    -d *.adaptix.io
```

### Step 4: Deploy

```bash
# Clone repository
git clone https://github.com/yourusername/adaptix.git
cd adaptix/saas

# Configure environment
cp .env.example .env
nano .env

# Deploy
docker-compose -f docker-compose.saas.yml up -d

# Run migrations
docker-compose exec auth python manage.py migrate
docker-compose exec company python manage.py migrate
# ... repeat for all services
```

### Step 5: Start Admin Panel

```bash
cd admin-panel
docker build -t adaptix-admin .
docker run -d \
    -p 8600:8600 \
    -e ADMIN_TOKEN="your-secret-token" \
    -e DATABASE_URL="postgresql://adaptix:password@postgres:5432/adaptix_saas" \
    adaptix-admin
```

---

## 👥 Managing Customers

### Create New Customer

```bash
curl -X POST https://admin.adaptix.io/api/admin/tenants \
    -H "Authorization: Bearer your-admin-token" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "ABC Corporation",
        "email": "owner@abc-corp.com",
        "phone": "+8801712345678",
        "plan": "trial"
    }'

# Response:
{
    "id": "uuid-here",
    "code": "abc-corporation-a1b2",
    "subdomain_url": "https://abc-corporation-a1b2.adaptix.io",
    "admin_email": "owner@abc-corp.com",
    "temp_password": "random-password",
    "message": "Tenant created successfully"
}
```

### Customer Onboarding Email

Send to customer:

```
Welcome to Adaptix!

আপনার অ্যাকাউন্ট তৈরি হয়েছে:

Login URL: https://abc-corporation-a1b2.adaptix.io
Email: owner@abc-corp.com
Temporary Password: random-password

প্রথম লগইনে পাসওয়ার্ড পরিবর্তন করুন।

ধন্যবাদ,
Adaptix Team
```

---

## 💰 Pricing Plans

| Plan             | Users     | Branches  | Price/Month    |
| ---------------- | --------- | --------- | -------------- |
| **Trial**        | 5         | 1         | Free (14 days) |
| **Starter**      | 10        | 1         | ৳999           |
| **Professional** | 50        | 5         | ৳2,999         |
| **Enterprise**   | Unlimited | Unlimited | Custom         |

---

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale specific services
docker-compose -f docker-compose.saas.yml up -d --scale pos=5 --scale auth=3
```

### Database Scaling

For many customers:

1. **Read Replicas**: Add PostgreSQL replicas for read traffic
2. **Connection Pooling**: Use PgBouncer
3. **Sharding**: If needed, shard by company_uuid

---

## 🔍 Monitoring

Access Grafana: https://admin.adaptix.io:3000

Key metrics:

- Active users per tenant
- API response times
- Error rates
- Database connections

---

## 💳 Payment Integration

Add payment gateway (bKash, Nagad, SSL Commerz):

```python
# Example bKash integration
from bkash import BkashGateway

def process_subscription(tenant_id, amount):
    gateway = BkashGateway(
        username=os.environ['BKASH_USERNAME'],
        password=os.environ['BKASH_PASSWORD'],
        app_key=os.environ['BKASH_APP_KEY'],
        app_secret=os.environ['BKASH_APP_SECRET']
    )

    result = gateway.create_payment(
        amount=amount,
        invoice_number=f"INV-{tenant_id}-{datetime.now().strftime('%Y%m%d')}",
        callback_url="https://admin.adaptix.io/api/payment/callback"
    )

    return result
```

---

## 🆘 Support

- Documentation: https://docs.adaptix.io
- Email: support@adaptix.io

---

_© 2024 Adaptix. All rights reserved._
