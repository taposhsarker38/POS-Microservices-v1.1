"""
Adaptix Admin Panel - Tenant Management
=======================================
For managing customers, subscriptions, and monitoring.
"""

from datetime import datetime, timedelta
from typing import Optional, List
import secrets
import hashlib

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, String, DateTime, Boolean, Integer, Numeric, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
import os

# ============================================
# Database Setup
# ============================================

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://adaptix:password@postgres:5432/adaptix_saas")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ============================================
# Models
# ============================================

class Tenant(Base):
    """Company/Tenant model for SaaS."""
    __tablename__ = "saas_tenants"
    
    id = Column(String, primary_key=True)
    code = Column(String, unique=True, index=True)  # Used in subdomain
    name = Column(String)
    email = Column(String)
    phone = Column(String, nullable=True)
    
    # Subscription
    plan = Column(String, default="trial")  # trial, starter, professional, enterprise
    max_users = Column(Integer, default=5)
    max_branches = Column(Integer, default=1)
    
    # Billing
    billing_cycle = Column(String, default="monthly")  # monthly, yearly
    price_per_month = Column(Numeric(10, 2), default=0)
    next_billing_date = Column(DateTime)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_trial = Column(Boolean, default=True)
    trial_ends_at = Column(DateTime)
    
    # Custom domain
    custom_domain = Column(String, nullable=True, unique=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    
    # Usage stats
    total_users = Column(Integer, default=0)
    total_orders = Column(Integer, default=0)
    storage_used_mb = Column(Integer, default=0)


class TenantUser(Base):
    """Admin users who can log in to admin panel."""
    __tablename__ = "saas_tenant_users"
    
    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey("saas_tenants.id"))
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    is_owner = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class BillingHistory(Base):
    """Payment/billing history."""
    __tablename__ = "saas_billing_history"
    
    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey("saas_tenants.id"))
    amount = Column(Numeric(10, 2))
    currency = Column(String, default="BDT")
    status = Column(String)  # paid, pending, failed
    payment_method = Column(String)
    invoice_number = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


# ============================================
# FastAPI App
# ============================================

app = FastAPI(
    title="Adaptix Admin Panel",
    description="Manage tenants, subscriptions, and monitor usage",
    version="1.0.0"
)

security = HTTPBearer()
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "super-secret-admin-token")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid admin token")
    return True


# ============================================
# Pydantic Models
# ============================================

class CreateTenantRequest(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    plan: str = "trial"
    

class UpdateTenantRequest(BaseModel):
    name: Optional[str] = None
    plan: Optional[str] = None
    max_users: Optional[int] = None
    is_active: Optional[bool] = None
    custom_domain: Optional[str] = None


class TenantResponse(BaseModel):
    id: str
    code: str
    name: str
    email: str
    plan: str
    is_active: bool
    is_trial: bool
    trial_ends_at: Optional[datetime]
    subdomain_url: str
    total_users: int
    created_at: datetime


# ============================================
# API Endpoints
# ============================================

@app.get("/api/admin/tenants", dependencies=[Depends(verify_admin)])
async def list_tenants(
    skip: int = 0, 
    limit: int = 50,
    plan: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """List all tenants with filtering."""
    query = db.query(Tenant)
    
    if plan:
        query = query.filter(Tenant.plan == plan)
    if is_active is not None:
        query = query.filter(Tenant.is_active == is_active)
    
    tenants = query.offset(skip).limit(limit).all()
    
    return [{
        "id": t.id,
        "code": t.code,
        "name": t.name,
        "email": t.email,
        "plan": t.plan,
        "is_active": t.is_active,
        "total_users": t.total_users,
        "subdomain_url": f"https://{t.code}.adaptix.io",
        "created_at": t.created_at.isoformat() if t.created_at else None
    } for t in tenants]


@app.post("/api/admin/tenants", dependencies=[Depends(verify_admin)])
async def create_tenant(
    request: CreateTenantRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create a new tenant (customer)."""
    import uuid
    
    # Generate unique code from name
    code = request.name.lower().replace(" ", "-").replace(".", "")[:20]
    code = f"{code}-{secrets.token_hex(2)}"
    
    # Check if code already exists
    while db.query(Tenant).filter(Tenant.code == code).first():
        code = f"{code[:20]}-{secrets.token_hex(2)}"
    
    # Create tenant
    tenant = Tenant(
        id=str(uuid.uuid4()),
        code=code,
        name=request.name,
        email=request.email,
        phone=request.phone,
        plan=request.plan,
        is_trial=request.plan == "trial",
        trial_ends_at=datetime.utcnow() + timedelta(days=14) if request.plan == "trial" else None,
        max_users=5 if request.plan == "trial" else 25
    )
    
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    
    # Generate temporary admin password
    temp_password = secrets.token_urlsafe(12)
    
    # Create admin user for tenant
    admin_user = TenantUser(
        id=str(uuid.uuid4()),
        tenant_id=tenant.id,
        email=request.email,
        password_hash=hashlib.sha256(temp_password.encode()).hexdigest(),
        is_owner=True
    )
    db.add(admin_user)
    db.commit()
    
    # TODO: Send welcome email with credentials
    # background_tasks.add_task(send_welcome_email, request.email, code, temp_password)
    
    return {
        "id": tenant.id,
        "code": tenant.code,
        "subdomain_url": f"https://{code}.adaptix.io",
        "admin_email": request.email,
        "temp_password": temp_password,  # Send via email in production!
        "message": "Tenant created successfully"
    }


@app.get("/api/admin/tenants/{tenant_id}", dependencies=[Depends(verify_admin)])
async def get_tenant(tenant_id: str, db: Session = Depends(get_db)):
    """Get tenant details."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    return {
        "id": tenant.id,
        "code": tenant.code,
        "name": tenant.name,
        "email": tenant.email,
        "phone": tenant.phone,
        "plan": tenant.plan,
        "max_users": tenant.max_users,
        "max_branches": tenant.max_branches,
        "is_active": tenant.is_active,
        "is_trial": tenant.is_trial,
        "trial_ends_at": tenant.trial_ends_at.isoformat() if tenant.trial_ends_at else None,
        "custom_domain": tenant.custom_domain,
        "subdomain_url": f"https://{tenant.code}.adaptix.io",
        "usage": {
            "total_users": tenant.total_users,
            "total_orders": tenant.total_orders,
            "storage_used_mb": tenant.storage_used_mb
        },
        "created_at": tenant.created_at.isoformat() if tenant.created_at else None
    }


@app.patch("/api/admin/tenants/{tenant_id}", dependencies=[Depends(verify_admin)])
async def update_tenant(
    tenant_id: str, 
    request: UpdateTenantRequest,
    db: Session = Depends(get_db)
):
    """Update tenant settings."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    if request.name is not None:
        tenant.name = request.name
    if request.plan is not None:
        tenant.plan = request.plan
        tenant.is_trial = False
    if request.max_users is not None:
        tenant.max_users = request.max_users
    if request.is_active is not None:
        tenant.is_active = request.is_active
    if request.custom_domain is not None:
        tenant.custom_domain = request.custom_domain
    
    db.commit()
    return {"message": "Tenant updated successfully"}


@app.delete("/api/admin/tenants/{tenant_id}", dependencies=[Depends(verify_admin)])
async def deactivate_tenant(tenant_id: str, db: Session = Depends(get_db)):
    """Deactivate a tenant (soft delete)."""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant.is_active = False
    db.commit()
    return {"message": "Tenant deactivated"}


# ============================================
# Dashboard / Analytics
# ============================================

@app.get("/api/admin/dashboard", dependencies=[Depends(verify_admin)])
async def dashboard_stats(db: Session = Depends(get_db)):
    """Get SaaS dashboard statistics."""
    
    total_tenants = db.query(Tenant).count()
    active_tenants = db.query(Tenant).filter(Tenant.is_active == True).count()
    trial_tenants = db.query(Tenant).filter(Tenant.is_trial == True).count()
    
    # Revenue calculation (simplified)
    paid_tenants = db.query(Tenant).filter(
        Tenant.is_trial == False,
        Tenant.is_active == True
    ).all()
    
    mrr = sum(float(t.price_per_month or 0) for t in paid_tenants)
    
    return {
        "tenants": {
            "total": total_tenants,
            "active": active_tenants,
            "trial": trial_tenants,
            "paid": len(paid_tenants)
        },
        "revenue": {
            "mrr": mrr,
            "currency": "BDT"
        },
        "growth": {
            # Add 30-day comparison here
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "admin-panel"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8600)
