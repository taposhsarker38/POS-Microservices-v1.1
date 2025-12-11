# 🗄️ Adaptix Database Connections

## pgAdmin / DBeaver Connection Details

Use these credentials to connect to each service's database from your local machine.

---

## 📋 Quick Reference

| Service          | Host      | Port | Database       | Username | Password        |
| ---------------- | --------- | ---- | -------------- | -------- | --------------- |
| **Auth**         | localhost | 5437 | authdb         | postgres | (your password) |
| **Company**      | localhost | 5438 | companydb      | postgres | (your password) |
| **Product**      | localhost | 5439 | productdb      | postgres | (your password) |
| **POS**          | localhost | 5440 | posdb          | postgres | (your password) |
| **Inventory**    | localhost | 5441 | inventorydb    | postgres | (your password) |
| **Purchase**     | localhost | 5442 | purchasedb     | postgres | (your password) |
| **Notification** | localhost | 5443 | notificationdb | postgres | (your password) |
| **Reporting**    | localhost | 5444 | reportingdb    | postgres | (your password) |
| **Promotion**    | localhost | 5445 | promotiondb    | postgres | (your password) |
| **Payment**      | localhost | 5446 | paymentdb      | postgres | (your password) |
| **HRMS**         | localhost | 5447 | hrmsdb         | postgres | (your password) |
| **Accounting**   | localhost | 5448 | accountingdb   | postgres | (your password) |
| **Customer**     | localhost | 5449 | customerdb     | postgres | (your password) |
| **Asset**        | localhost | 5450 | assetdb        | postgres | (your password) |

---

## 🖥️ pgAdmin 4 Setup

### Step 1: Add Server Group

1. Right-click "Servers" → "Create" → "Server Group"
2. Name: `Adaptix Microservices`

### Step 2: Add Each Server

1. Right-click "Adaptix Microservices" → "Create" → "Server"
2. **General Tab:**
   - Name: `Adaptix Auth`
3. **Connection Tab:**
   - Host: `localhost`
   - Port: `5437`
   - Database: `authdb`
   - Username: `postgres`
   - Password: (your password)
4. Click "Save"

Repeat for each service with their respective ports.

---

## 🦫 DBeaver Setup

### Step 1: New Connection

1. Click "New Database Connection" (plug icon)
2. Select "PostgreSQL"
3. Click "Next"

### Step 2: Connection Settings

```
Host: localhost
Port: 5437 (for Auth)
Database: authdb
Username: postgres
Password: (your password)
```

### Step 3: Test & Save

1. Click "Test Connection"
2. Click "Finish"

---

## 📝 Connection Strings

### Auth Service

```
postgresql://postgres:${DB_PASSWORD}@localhost:5437/authdb
```

### Company Service

```
postgresql://postgres:${DB_PASSWORD}@localhost:5438/companydb
```

### Product Service

```
postgresql://postgres:${DB_PASSWORD}@localhost:5439/productdb
```

### POS Service

```
postgresql://postgres:${DB_PASSWORD}@localhost:5440/posdb
```

### Inventory Service

```
postgresql://postgres:${DB_PASSWORD}@localhost:5441/inventorydb
```

### HRMS Service

```
postgresql://postgres:${DB_PASSWORD}@localhost:5447/hrmsdb
```

### Accounting Service

```
postgresql://postgres:${DB_PASSWORD}@localhost:5448/accountingdb
```

---

## 🔧 Troubleshooting

### Connection Refused

1. Check if containers are running:

   ```bash
   docker ps | grep postgres
   ```

2. Check port mapping:
   ```bash
   docker port adaptix-postgres-auth
   ```

### Authentication Failed

1. Check password in docker-compose.yml
2. Default password was: `${DB_PASSWORD:-postgres}`

### Database Not Found

Run migrations:

```bash
docker-compose exec auth python manage.py migrate
```

---

## 🔒 Security Note

These ports are exposed for **development only**. In production:

- Remove port mappings from docker-compose.yml
- Use internal Docker network only
- Access via SSH tunnel if needed

---

_Last Updated: December 2024_
