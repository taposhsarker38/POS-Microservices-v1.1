# 🗄️ Adaptix Single Database Connection

## 🔄 Migration Update (Single DB)

We have migrated from 14 individual databases to a **Single PostgreSQL Database** with schema isolation.

---

## 📋 Connection Details

Use these credentials to connect to the unified database from **pgAdmin** or **DBeaver**.

| Service      | Connection Info                      |
| ------------ | ------------------------------------ |
| **Host**     | `localhost`                          |
| **Port**     | **5532** (Mapped from internal 5432) |
| **Database** | `adaptix`                            |
| **Username** | `adaptix`                            |
| **Password** | `adaptix123`                         |

---

## 📂 Schemas

The database is divided into schemas for each service. When you connect, you will see:

- `auth`
- `company`
- `product`
- `pos`
- `inventory`
- `purchase`
- `hrms`
- `accounting`
- `customer`
- `asset`
- `promotion`
- `payment`
- `notification`
- `reporting`

---

## 🖥️ pgAdmin / DBeaver Setup

1. **Create New Server/Connection**
2. **Host**: `localhost`
3. **Port**: `5532`
4. **Maintenance Database**: `adaptix`
5. **Username**: `adaptix`
6. **Password**: `adaptix123`

---

## 🐇 Other Services

| Service          | Host Port                   | Username  | Password     |
| ---------------- | --------------------------- | --------- | ------------ |
| **Redis**        | `6679`                      | -         | -            |
| **RabbitMQ**     | `5673` (AMQP), `15673` (UI) | `adaptix` | `adaptix123` |
| **Kong (Admin)** | `8001`                      | -         | -            |
| **Kong (Proxy)** | `8101`                      | -         | -            |

---

## 📝 Connection String (Internal Docker)

Services inside Docker use this connection string:

```
postgresql://adaptix:adaptix123@postgres:5432/adaptix
```

_Note: Internal port is still 5432._
