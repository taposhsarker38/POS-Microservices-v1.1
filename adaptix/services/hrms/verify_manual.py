
import os
import django
from decimal import Decimal
import sys

# Setup Django Environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.employees.models import Department, Designation, Employee
from apps.payroll.models import SalaryComponent, SalaryStructure, EmployeeSalary, Payslip, PayslipLineItem
from django.utils import timezone
from datetime import date
import uuid

def verify_hrms_flow():
    company_uuid = uuid.uuid4()
    print(f"🔹 Starting HRMS Verification for Company: {company_uuid}")

    # 1. Create Department & Designation
    dept = Department.objects.create(company_uuid=company_uuid, name="Engineering", code="ENG")
    desig = Designation.objects.create(company_uuid=company_uuid, name="Senior Developer", rank=2)
    print(f"✅ Created Dept: {dept.name}, Desig: {desig.name}")

    # 2. Create Employee
    emp = Employee.objects.create(
        company_uuid=company_uuid,
        employee_code=f"EMP-{uuid.uuid4().hex[:6].upper()}",
        first_name="Jane",
        last_name="Doe",
        email=f"jane.{uuid.uuid4().hex[:6]}@example.com",
        department=dept,
        designation=desig,
        joining_date=date(2023, 1, 1)
    )
    print(f"✅ Created Employee: {emp}")

    # 3. Define Salary Structure
    basic = SalaryComponent.objects.create(company_uuid=company_uuid, name="Basic", type="earning")
    hra = SalaryComponent.objects.create(company_uuid=company_uuid, name="HRA", type="earning")
    tax = SalaryComponent.objects.create(company_uuid=company_uuid, name="Tax", type="deduction")
    
    structure = SalaryStructure.objects.create(company_uuid=company_uuid, name="Grade A")
    structure.components.add(basic, hra, tax)
    print(f"✅ Created Salary Structure: {structure.name}")

    # 4. Assign Salary to Employee
    emp_salary = EmployeeSalary.objects.create(
        company_uuid=company_uuid,
        employee=emp,
        structure=structure,
        base_amount=Decimal("100000.00") # 100k
    )
    print(f"✅ Assigned Salary Base: {emp_salary.base_amount}")

    # 5. Generate Payslip (Mock Logic Simulation)
    # Logic similar to what Views/Serializer would do
    start_date = date(2025, 12, 1)
    end_date = date(2025, 12, 31)
    
    # Simple calculation rule simulation
    # Basic = 50% of Base
    # HRA = 20% of Base
    # Tax = 10% of Base
    
    base = emp_salary.base_amount
    basic_val = base * Decimal("0.5")
    hra_val = base * Decimal("0.2")
    tax_val = base * Decimal("0.1")
    
    gross = basic_val + hra_val
    deduction = tax_val
    net = gross - deduction
    
    payslip = Payslip.objects.create(
        company_uuid=company_uuid,
        employee=emp,
        start_date=start_date,
        end_date=end_date,
        total_earnings=gross,
        total_deductions=deduction,
        net_pay=net,
        present_days=22,
        status='draft'
    )
    
    PayslipLineItem.objects.create(payslip=payslip, component=basic, amount=basic_val)
    PayslipLineItem.objects.create(payslip=payslip, component=hra, amount=hra_val)
    PayslipLineItem.objects.create(payslip=payslip, component=tax, amount=tax_val)
    
    print(f"✅ Generated Payslip: Net Pay {payslip.net_pay}")
    
    # 6. Verify Data
    assert payslip.net_pay == 60000.00, f"Expected 60000, got {payslip.net_pay}"
    print("🎉 Verification Successful!")

if __name__ == "__main__":
    try:
        verify_hrms_flow()
    except Exception as e:
        print(f"❌ Verification Failed: {e}")
