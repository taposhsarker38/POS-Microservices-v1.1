# 🚀 Adaptix Deployment Guide

## Welcome to Adaptix!

This guide will help you deploy Adaptix on your infrastructure.

---

## 📋 Prerequisites

- Docker 20.10 or higher
- Docker Compose 2.0 or higher
- Minimum 4GB RAM
- 20GB storage
- Linux server (Ubuntu 20.04+ recommended)

---

## 🔧 Installation Steps

### Step 1: Download Deployment Package

You will receive:

- `docker-compose.yml` - Deployment configuration
- `kong.yml` - API Gateway configuration
- `.env.example` - Environment template
- `keys/` - JWT signing keys (provided separately)

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

**Required settings:**

```env
DB_PASSWORD=your_strong_password
MQ_PASSWORD=your_mq_password
SECRET_KEY=your_50_char_secret_key
LICENSE_KEY=XXXX-XXXX-XXXX-XXXX  # Provided by Adaptix
```

### Step 3: Login to Docker Registry

```bash
# Login with credentials provided by Adaptix
docker login registry.adaptix.io
# Username: your_company
# Password: (provided)
```

### Step 4: Deploy

```bash
# Pull images and start
docker-compose up -d

# Wait for services to be ready (1-2 minutes)
docker-compose ps

# Check logs
docker-compose logs -f
```

### Step 5: Verify Installation

```bash
# Check all services are running
curl http://localhost/health

# Expected output: {"status": "ok"}
```

---

## 📊 Accessing Adaptix

| Interface         | URL                         |
| ----------------- | --------------------------- |
| API Gateway       | http://your-server          |
| API Documentation | http://your-server/api/docs |
| Admin Panel       | http://your-server/admin    |

---

## 🔐 SSL/HTTPS Setup

We strongly recommend using HTTPS in production.

### Option A: Let's Encrypt (Free)

```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Update docker-compose.yml with SSL paths
```

### Option B: Custom Certificate

Place your certificates in the `certs/` folder and update Kong configuration.

---

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale specific services
docker-compose up -d --scale pos=3 --scale inventory=2
```

### Database Optimization

For large deployments, consider:

- Managed PostgreSQL (AWS RDS, Azure Database)
- Redis cluster for caching

---

## 🔄 Updates

When a new version is released:

```bash
# Pull new images
docker-compose pull

# Restart services
docker-compose up -d

# Run migrations (if any)
docker-compose exec auth python manage.py migrate
```

---

## 🆘 Troubleshooting

### Services not starting

```bash
# Check logs
docker-compose logs auth

# Check resource usage
docker stats
```

### Database connection issues

```bash
# Test database connectivity
docker-compose exec postgres psql -U adaptix -c "SELECT 1"
```

### License issues

Contact: support@adaptix.io

---

## 📞 Support

- Email: support@adaptix.io
- Phone: +880-XXX-XXXXXXX
- Documentation: https://docs.adaptix.io

---

_© 2024 Adaptix. All rights reserved._
