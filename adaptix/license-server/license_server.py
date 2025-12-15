"""
Adaptix License Server
======================
Simple license server for validating customer licenses.
Deploy this separately on your own server.

Run: uvicorn license_server:app --host 0.0.0.0 --port 8500
"""

import os
import uuid
import hashlib
import json
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, DateTime, Boolean, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# ============================================
# Database Setup
# ============================================

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./licenses.db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class License(Base):
    __tablename__ = "licenses"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    license_key = Column(String, unique=True, index=True)
    company_id = Column(String, index=True)
    company_name = Column(String)
    email = Column(String)
    tier = Column(String, default="standard")  # starter, standard, professional, enterprise
    max_users = Column(Integer, default=10)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    allowed_machines = Column(Integer, default=1)
    activated_machines = Column(String, default="[]")  # JSON list of machine IDs


class LicenseActivation(Base):
    __tablename__ = "activations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    license_id = Column(String, index=True)
    machine_id = Column(String)
    ip_address = Column(String)
    activated_at = Column(DateTime, default=datetime.utcnow)
    last_validated = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)

# ============================================
# FastAPI App
# ============================================

app = FastAPI(
    title="Adaptix License Server",
    description="License validation for Adaptix Business OS",
    version="1.0.0"
)

security = HTTPBearer()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ============================================
# API Models
# ============================================

class ValidateRequest(BaseModel):
    license_key: str
    company_id: Optional[str] = None
    machine_id: str
    product: str
    version: str


class CreateLicenseRequest(BaseModel):
    company_name: str
    email: str
    tier: str = "standard"
    max_users: int = 10
    valid_days: int = 365
    allowed_machines: int = 1


class LicenseResponse(BaseModel):
    valid: bool
    reason: Optional[str] = None
    tier: Optional[str] = None
    expires_at: Optional[str] = None
    max_users: Optional[int] = None


# ============================================
# License Generation
# ============================================

def generate_license_key():
    """Generate a unique license key: XXXX-XXXX-XXXX-XXXX"""
    segments = []
    for _ in range(4):
        segment = secrets.token_hex(2).upper()
        segments.append(segment)
    return "-".join(segments)


# ============================================
# API Endpoints
# ============================================

@app.post("/api/v1/validate", response_model=LicenseResponse)
async def validate_license(request: ValidateRequest, db: Session = Depends(get_db)):
    """Validate a license key."""
    
    # Find license
    license = db.query(License).filter(
        License.license_key == request.license_key
    ).first()
    
    if not license:
        return LicenseResponse(valid=False, reason="License not found")
    
    if not license.is_active:
        return LicenseResponse(valid=False, reason="License deactivated")
    
    if license.expires_at and license.expires_at < datetime.utcnow():
        return LicenseResponse(valid=False, reason="License expired")
    
    # Check machine activation
    activated = json.loads(license.activated_machines or "[]")
    
    if request.machine_id not in activated:
        if len(activated) >= license.allowed_machines:
            return LicenseResponse(
                valid=False, 
                reason=f"Maximum machines ({license.allowed_machines}) already activated"
            )
        # Activate this machine
        activated.append(request.machine_id)
        license.activated_machines = json.dumps(activated)
        
        # Record activation
        activation = LicenseActivation(
            license_id=license.id,
            machine_id=request.machine_id,
            ip_address="0.0.0.0"  # Get from request in production
        )
        db.add(activation)
    
    # Update last validation
    db.query(LicenseActivation).filter(
        LicenseActivation.license_id == license.id,
        LicenseActivation.machine_id == request.machine_id
    ).update({"last_validated": datetime.utcnow()})
    
    db.commit()
    
    return LicenseResponse(
        valid=True,
        tier=license.tier,
        expires_at=license.expires_at.isoformat() if license.expires_at else None,
        max_users=license.max_users
    )


@app.get("/api/v1/info")
async def get_license_info(license_key: str, db: Session = Depends(get_db)):
    """Get license information."""
    
    license = db.query(License).filter(
        License.license_key == license_key
    ).first()
    
    if not license:
        raise HTTPException(status_code=404, detail="License not found")
    
    return {
        "company_name": license.company_name,
        "tier": license.tier,
        "max_users": license.max_users,
        "expires_at": license.expires_at.isoformat() if license.expires_at else None,
        "is_active": license.is_active,
        "activated_machines": len(json.loads(license.activated_machines or "[]")),
        "allowed_machines": license.allowed_machines
    }


# ============================================
# Admin Endpoints (Protected)
# ============================================

ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "your-secret-admin-token")


def verify_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid admin token")
    return True


@app.post("/api/v1/admin/licenses", dependencies=[Depends(verify_admin)])
async def create_license(request: CreateLicenseRequest, db: Session = Depends(get_db)):
    """Create a new license (Admin only)."""
    
    license_key = generate_license_key()
    company_id = str(uuid.uuid4())[:8].upper()
    
    license = License(
        license_key=license_key,
        company_id=company_id,
        company_name=request.company_name,
        email=request.email,
        tier=request.tier,
        max_users=request.max_users,
        allowed_machines=request.allowed_machines,
        expires_at=datetime.utcnow() + timedelta(days=request.valid_days)
    )
    
    db.add(license)
    db.commit()
    db.refresh(license)
    
    return {
        "license_key": license_key,
        "company_id": company_id,
        "expires_at": license.expires_at.isoformat(),
        "message": "License created successfully"
    }


@app.get("/api/v1/admin/licenses", dependencies=[Depends(verify_admin)])
async def list_licenses(db: Session = Depends(get_db)):
    """List all licenses (Admin only)."""
    
    licenses = db.query(License).all()
    return [
        {
            "license_key": l.license_key,
            "company_name": l.company_name,
            "tier": l.tier,
            "is_active": l.is_active,
            "expires_at": l.expires_at.isoformat() if l.expires_at else None
        }
        for l in licenses
    ]


@app.patch("/api/v1/admin/licenses/{license_key}/deactivate", dependencies=[Depends(verify_admin)])
async def deactivate_license(license_key: str, db: Session = Depends(get_db)):
    """Deactivate a license (Admin only)."""
    
    license = db.query(License).filter(License.license_key == license_key).first()
    if not license:
        raise HTTPException(status_code=404, detail="License not found")
    
    license.is_active = False
    db.commit()
    
    return {"message": "License deactivated"}


# ============================================
# Health Check
# ============================================

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "license-server"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8500)
