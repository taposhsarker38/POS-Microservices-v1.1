-- Enterprise Database Optimization

-- 1. POS Service Optimization
CREATE INDEX IF NOT EXISTS idx_sales_order_company_uuid ON pos.sales_order(company_uuid);
CREATE INDEX IF NOT EXISTS idx_sales_order_status ON pos.sales_order(status);
CREATE INDEX IF NOT EXISTS idx_sales_order_created_at ON pos.sales_order(created_at);

-- 2. CRM Optimization (Customer Service)
-- Check if tables exist first to avoid errors if CRM not fully migrated
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'customer' AND tablename = 'crm_lead') THEN
        CREATE INDEX IF NOT EXISTS idx_crm_lead_company_uuid ON customer.crm_lead(company_uuid);
        CREATE INDEX IF NOT EXISTS idx_crm_lead_status ON customer.crm_lead(status);
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'customer' AND tablename = 'crm_opportunity') THEN
        CREATE INDEX IF NOT EXISTS idx_crm_opportunity_company_uuid ON customer.crm_opportunity(company_uuid);
        CREATE INDEX IF NOT EXISTS idx_crm_opportunity_stage_id ON customer.crm_opportunity(stage_id);
    END IF;
END $$;

-- 3. HRMS Optimization
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'hrms' AND tablename = 'employees_employee') THEN
        CREATE INDEX IF NOT EXISTS idx_employee_company_code ON hrms.employees_employee(company_id, employee_code);
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'hrms' AND tablename = 'attendance_attendance') THEN
        CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON hrms.attendance_attendance(employee_id, date);
    END IF;
END $$;

-- 4. Postgres Configuration Tuning (Requires Restart)
ALTER SYSTEM SET shared_buffers = '1GB';
ALTER SYSTEM SET effective_cache_size = '3GB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = '100';
ALTER SYSTEM SET random_page_cost = '1.1';
