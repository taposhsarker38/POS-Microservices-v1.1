# 🔒 Adaptix Security Guide

## Overview

This document outlines the security measures implemented in Adaptix and provides guidelines for secure deployment.

---

## 🛡️ Security Layers

### Layer 1: API Gateway (Kong)

| Feature                   | Description                                   |
| ------------------------- | --------------------------------------------- |
| **JWT Validation**        | RS256 signed tokens verified at gateway level |
| **Rate Limiting**         | 100 req/min globally, 10 req/min for login    |
| **Request Size Limiting** | 10MB max payload to prevent DoS               |
| **CORS Protection**       | Configurable origin whitelist                 |

### Layer 2: Application Middleware

| Middleware                         | Purpose                                          |
| ---------------------------------- | ------------------------------------------------ |
| `JWTCompanyMiddleware`             | Validates JWT and extracts company context       |
| `RateLimitMiddleware`              | Application-level rate limiting with IP blocking |
| `SecurityHeadersMiddleware`        | Adds CSP, X-Frame-Options, etc.                  |
| `SQLInjectionProtectionMiddleware` | Detects and blocks SQL injection attempts        |
| `XSSProtectionMiddleware`          | Blocks XSS payloads                              |
| `AuditMiddleware`                  | Logs all modifying requests                      |

### Layer 3: Django Security

- CSRF Protection (enabled)
- XSS Protection (auto-escaping)
- SQL Injection Protection (ORM parameterization)
- Clickjacking Protection (X-Frame-Options)
- SSL/TLS enforcement in production

---

## 🔑 Authentication & Authorization

### JWT Token Structure

```json
{
  "sub": "user_uuid",
  "company_uuid": "company_uuid",
  "email": "user@example.com",
  "roles": ["admin", "manager"],
  "permissions": ["view_order", "create_order"],
  "exp": 1234567890,
  "iat": 1234567800,
  "iss": "auth-service"
}
```

### Token Lifecycle

| Token Type    | Lifetime   | Purpose                 |
| ------------- | ---------- | ----------------------- |
| Access Token  | 15 minutes | API authentication      |
| Refresh Token | 7 days     | Obtain new access token |

### Permission Model

```
Company → Roles → Permissions → Users
```

- Each user belongs to a company
- Users are assigned roles
- Roles contain permissions
- ViewSets check `required_permission`

---

## 🚨 Attack Prevention

### 1. Brute Force Protection

```yaml
# Kong rate limiting for login
route: /api/auth/login
limit: 10 requests/minute
lockout: 15 minutes after 10 violations
```

### 2. SQL Injection Protection

- Django ORM parameterizes all queries
- Middleware blocks known SQL patterns:
  - `' OR 1=1`
  - `; DROP TABLE`
  - `UNION SELECT`

### 3. XSS Protection

- Django auto-escapes template output
- Middleware blocks `<script>` tags in input
- CSP header restricts script sources

### 4. CSRF Protection

- Django CSRF middleware enabled
- Token required for all POST/PUT/DELETE
- SameSite cookie attribute

### 5. DDoS Mitigation

- Kong rate limiting
- Request size limiting (10MB max)
- Connection timeouts

---

## 🔐 Secrets Management

### DO ✅

```bash
# Use environment variables
DATABASE_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}

# Use .env files (never commit)
cp .env.example .env
chmod 600 .env
```

### DON'T ❌

```python
# Never hardcode secrets
DATABASE_PASSWORD = "mypassword123"  # ❌ BAD
```

---

## 📋 Production Deployment Checklist

### Before Going Live:

- [ ] `DEBUG = False`
- [ ] Strong, unique `SECRET_KEY`
- [ ] `ALLOWED_HOSTS` explicitly set
- [ ] `SECURE_SSL_REDIRECT = True`
- [ ] All cookies set to `Secure` and `HttpOnly`
- [ ] Database uses SSL connection
- [ ] All services on private network
- [ ] Kong configured with Redis (distributed rate limiting)
- [ ] Firewall rules configured
- [ ] Logging enabled and monitored
- [ ] Regular security updates scheduled

### Infrastructure Security:

- [ ] Docker images from trusted sources
- [ ] Non-root user in containers
- [ ] Network isolation between services
- [ ] Secrets stored in vault (HashiCorp Vault, AWS Secrets Manager)
- [ ] Regular security scanning (Snyk, Trivy)

---

## 🔍 Monitoring & Alerts

### Security Events to Monitor:

1. **Failed Login Attempts** - Alert on > 5/minute
2. **Rate Limit Hits** - Alert on > 50/hour
3. **SQL Injection Attempts** - Immediate alert
4. **Unusual Admin Activity** - Alert on off-hours access
5. **Token Expiry Failures** - May indicate token theft attempts

### Log Locations:

```
/var/log/adaptix/security.log - Security events
/var/log/adaptix/audit.log - API access logs
/var/log/kong/access.log - Gateway logs
```

---

## 🔄 Incident Response

### If You Suspect a Breach:

1. **Isolate** - Block suspicious IPs immediately
2. **Revoke** - Invalidate all JWT tokens (rotate signing keys)
3. **Rotate** - Change all database passwords
4. **Investigate** - Review audit and security logs
5. **Notify** - Inform affected users if data was compromised
6. **Patch** - Apply security fixes
7. **Document** - Record incident for future prevention

---

## 📞 Security Contacts

For security vulnerabilities, contact:

- Email: security@adaptix.com
- Response Time: < 24 hours

---

_Last Updated: December 2024_
