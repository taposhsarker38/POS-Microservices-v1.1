# Adaptix (Business OS)

**The Adaptive Business Operating System (BOS) for the modern enterprise.**

---

## 🚀 Overview

**Adaptix** is a revolutionary, dynamic platform that adapts to your business—not the other way around. Whether you run a Retail Chain, a High-end Restaurant, or a Manufacturing Plant, Adaptix reshapes its core logic and UI to fit your industry perfectly.

Powered by a **Dynamic Configuration Engine**, Adaptix supports **39+ Industry Presets** out of the box.

## 🌟 Why Adaptix?

### 1. Intelligent Adaptation

- **Vertical-Specific Logic**: A "Fashion Mode" enables variants (Size/Color), while "Restaurant Mode" enables Table Management.
- **Dynamic UI**: The frontend layout transforms based on the active configuration.

### 2. Comprehensive Modules

- **Core**: Auth, Multi-Tenancy (Company), Product Catalog.
- **Operations**: POS (Point of Sale), Inventory, Purchase (Procurement).
- **People**: HRMS (Payroll, Attendance, Employees).
- **Finance**: Accounting (Double-Entry Ledger, Tax Engine), Payments.
- **Growth**: Customer CRM, Promotions, Reviews.
- **Insights**: Reporting & Analytics Dashboard.

### 3. Enterprise-Grade Architecture

- **Microservices**: 12+ decoupled services built with Django & Node.js.
- **Scalability**: Dockerized, Event-Driven (RabbitMQ), and API Gateway (Kong).
- **Observability**: Full system transparency with OpenTelemetry & Jaeger.

---

## 🛠 Tech Stack

- **Backend**: Python 3.11 (Django), Node.js
- **Database**: PostgreSQL (Isolated per service)
- **Messaging**: RabbitMQ (AMQP)
- **Gateway**: Kong API Gateway
- **Infrastructure**: Docker, GitHub Actions CI/CD

---

## ⚡ Quick Start

### Prerequisites

- Docker & Docker Compose

### Run Adaptix

```bash
# 1. Clone the repository
git clone https://github.com/taposhsarker38/POS-Microservices-v1.1.git
cd dynamic-pos

# 2. Launch the System
docker-compose up -d --build

# 3. Explore
# API Gateway: http://localhost:8000
# Tracing UI: http://localhost:16686
```

---

## 📚 API Reference

All services are accessible via the central Gateway.

| Service            | Endpoint          | Docs                    |
| :----------------- | :---------------- | :---------------------- |
| **Auth**           | `/api/auth`       | `/api/auth/docs/`       |
| **Adaptix Config** | `/api/company`    | `/api/company/docs/`    |
| **Product**        | `/api/product`    | `/api/product/docs/`    |
| **POS**            | `/api/pos`        | `/api/pos/docs/`        |
| **Inventory**      | `/api/inventory`  | `/api/inventory/docs/`  |
| **HRMS**           | `/api/hrms`       | `/api/hrms/docs/`       |
| **Accounting**     | `/api/accounting` | `/api/accounting/docs/` |

---

## 🧪 Testing

```bash
# Run tests for a specific service (e.g., HRMS)
docker-compose run --rm hrms pytest
```

---

**Adaptix — Evolve with your business.**
