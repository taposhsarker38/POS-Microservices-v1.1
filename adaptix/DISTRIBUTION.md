# 🏭 Adaptix Distribution Guide

## Overview

This guide explains how to build and distribute Adaptix to customers without giving them source code.

---

## 📋 Distribution Workflow

```
┌──────────────────────────────────────────────────────────────┐
│                    YOUR DEVELOPMENT                          │
├──────────────────────────────────────────────────────────────┤
│  1. Develop & Test source code                               │
│  2. Build production Docker images (bytecode only)           │
│  3. Push to private Docker registry                          │
│  4. Create customer deployment package                       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    CUSTOMER RECEIVES                         │
├──────────────────────────────────────────────────────────────┤
│  ✅ docker-compose.yml (deployment config)                   │
│  ✅ .env.example (configuration template)                    │
│  ✅ README.md (installation guide)                           │
│  ✅ License key                                              │
│  ✅ Docker registry credentials                              │
│  ❌ NO source code                                           │
│  ❌ NO .py files                                             │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔧 Step-by-Step Guide

### Step 1: Set Up Docker Registry

Choose one of these options:

#### Option A: Docker Hub (Simplest)

```bash
# Create account at hub.docker.com
# Create private repository: yourusername/adaptix-*

docker login
# Enter your Docker Hub credentials
```

#### Option B: AWS ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name adaptix-auth
aws ecr create-repository --repository-name adaptix-pos
# ... repeat for all services

# Login
aws ecr get-login-password | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com
```

#### Option C: Azure Container Registry

```bash
# Create registry
az acr create --name adaptixregistry --resource-group mygroup --sku Basic

# Login
az acr login --name adaptixregistry
```

---

### Step 2: Build Production Images

```bash
cd /path/to/adaptix

# Make scripts executable
chmod +x scripts/*.sh

# Build all services
./scripts/build-production.sh v1.0.0
```

This will:

- Compile Python to bytecode (.pyc)
- Remove all source files (.py)
- Create minimal Docker images
- Tag with version number

---

### Step 3: Push to Registry

```bash
# Set your registry URL
export DOCKER_REGISTRY="your-registry.azurecr.io"

# Push all images
./scripts/push-images.sh v1.0.0
```

---

### Step 4: Set Up License Server

```bash
cd license-server

# Build and run
docker build -t adaptix-license-server .
docker run -d \
    -p 8500:8500 \
    -e ADMIN_TOKEN="your-secret-admin-token" \
    -v license-data:/app/data \
    adaptix-license-server
```

#### Create a License for Customer

```bash
curl -X POST http://your-license-server:8500/api/v1/admin/licenses \
    -H "Authorization: Bearer your-secret-admin-token" \
    -H "Content-Type: application/json" \
    -d '{
        "company_name": "ABC Corporation",
        "email": "admin@abc-corp.com",
        "tier": "professional",
        "max_users": 50,
        "valid_days": 365,
        "allowed_machines": 3
    }'

# Response:
# {
#     "license_key": "A1B2-C3D4-E5F6-G7H8",
#     "company_id": "ABC12345",
#     "expires_at": "2025-12-11T00:00:00"
# }
```

---

### Step 5: Create Customer Package

```bash
# Create package for specific customer
./scripts/create-customer-package.sh v1.0.0 "ABC-Corp"

# Output: customer-packages/adaptix-ABC-Corp-v1.0.0.zip
```

---

### Step 6: Deliver to Customer

Send the customer:

1. **ZIP Package** (`adaptix-ABC-Corp-v1.0.0.zip`)
2. **Docker Registry Credentials**
   ```
   Registry: your-registry.azurecr.io
   Username: customer-abc
   Password: xxxxx
   ```
3. **License Key** (`A1B2-C3D4-E5F6-G7H8`)
4. **JWT Keys** (keys/ folder - send securely!)

---

## 🔐 Security Measures

| Layer             | Protection                                        |
| ----------------- | ------------------------------------------------- |
| **Source Code**   | Compiled to bytecode, removed in production image |
| **Docker Images** | Private registry with authentication              |
| **Runtime**       | License validation on every startup               |
| **Features**      | Tier-based feature restrictions                   |
| **Machine Limit** | Prevents unlimited installations                  |

---

## 💰 Licensing Tiers

| Tier             | Max Users | Features              | Price/Month |
| ---------------- | --------- | --------------------- | ----------- |
| **Starter**      | 5         | Basic POS, Inventory  | $49         |
| **Standard**     | 25        | + HRMS, Customers     | $149        |
| **Professional** | 100       | + Accounting, Reports | $349        |
| **Enterprise**   | Unlimited | + Custom + Support    | Custom      |

---

## 📞 Need Help?

- Documentation: https://docs.adaptix.io
- Support: support@adaptix.io

---

_© 2024 Adaptix. All rights reserved._
