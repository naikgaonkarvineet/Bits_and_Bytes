-- ==============================================================================
-- KaamSetu Relational Database Schema (PostgreSQL / Supabase)
-- Member 3: Database Engineer
-- Description: Core schema supporting daily-wage workers and contractors.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CLEANUP (For clean migrations / re-runs)
DROP VIEW IF EXISTS user_public_profiles CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS job_assignments CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS contractors CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP FUNCTION IF EXISTS validate_worker_user_role() CASCADE;
DROP FUNCTION IF EXISTS validate_contractor_user_role() CASCADE;

-- ==============================================================================
-- 3. TABLES DEFINITIONS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Table 1: users
-- Core authentication and identity table for all platform participants.
-- ------------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(15) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL,
    location VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_users_role CHECK (role IN ('worker', 'contractor')),
    CONSTRAINT chk_users_mobile_not_empty CHECK (length(trim(mobile)) >= 10)
);

COMMENT ON TABLE users IS 'Platform users (Workers and Contractors).';
COMMENT ON COLUMN users.password_hash IS 'Encrypted/hashed password; never expose via public API.';

-- ------------------------------------------------------------------------------
-- Table 2: workers
-- Profile details specific to daily-wage workers.
-- One user can have at most one worker profile.
-- ------------------------------------------------------------------------------
CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    skill VARCHAR(255) NOT NULL,
    experience VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_workers_skill_not_empty CHECK (length(trim(skill)) > 0)
);

COMMENT ON TABLE workers IS 'Worker-specific profile information linked 1:1 to users table.';

-- ------------------------------------------------------------------------------
-- Table 3: contractors
-- Profile details specific to contractors/builders.
-- One user can have at most one contractor profile.
-- ------------------------------------------------------------------------------
CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    work_category VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_contractors_company_not_empty CHECK (length(trim(company_name)) > 0),
    CONSTRAINT chk_contractors_category_not_empty CHECK (length(trim(work_category)) > 0)
);

COMMENT ON TABLE contractors IS 'Contractor-specific profile information linked 1:1 to users table.';

-- ------------------------------------------------------------------------------
-- Table 4: jobs
-- Job postings created by contractors.
-- ------------------------------------------------------------------------------
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    workers_required INTEGER NOT NULL,
    wage NUMERIC(10, 2) NOT NULL,
    start_date DATE,
    end_date DATE,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_jobs_status CHECK (status IN ('Open', 'Assigned', 'In Progress', 'Completed', 'Closed')),
    CONSTRAINT chk_jobs_workers_required CHECK (workers_required > 0),
    CONSTRAINT chk_jobs_wage_non_negative CHECK (wage >= 0),
    CONSTRAINT chk_jobs_date_validity CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

COMMENT ON TABLE jobs IS 'Job listings created by contractors seeking daily-wage workers.';

-- ------------------------------------------------------------------------------
-- Table 5: job_assignments
-- Tracks worker assignments to jobs, work lifecycle, and contractor confirmation.
-- ------------------------------------------------------------------------------
CREATE TABLE job_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    agreed_wage NUMERIC(10, 2) NOT NULL,
    assignment_status VARCHAR(50) NOT NULL DEFAULT 'Assigned',
    work_status VARCHAR(50) NOT NULL DEFAULT 'Assigned',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT chk_assignment_status CHECK (assignment_status IN ('Assigned', 'Accepted', 'Rejected', 'Completed')),
    CONSTRAINT chk_work_status CHECK (work_status IN ('Assigned', 'Accepted', 'In Progress', 'Completed')),
    CONSTRAINT chk_agreed_wage_non_negative CHECK (agreed_wage >= 0),
    -- Prevent duplicate assignment of the same worker to the same job
    CONSTRAINT uq_job_worker UNIQUE (job_id, worker_id)
);

COMMENT ON TABLE job_assignments IS 'Connects jobs with assigned workers and tracks the progress lifecycle.';

-- ------------------------------------------------------------------------------
-- Table 6: payments
-- Wage and disbursement records per job assignment.
-- ------------------------------------------------------------------------------
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL UNIQUE REFERENCES job_assignments(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    payment_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_payment_status CHECK (payment_status IN ('Pending', 'Paid')),
    CONSTRAINT chk_payment_amount_non_negative CHECK (amount >= 0)
);

COMMENT ON TABLE payments IS 'Wage and payment records for completed or in-progress assignments.';

-- ==============================================================================
-- 4. ROLE INTEGRITY TRIGGERS
-- Enforces: "One user can have one worker profile OR one contractor profile."
-- ==============================================================================

CREATE OR REPLACE FUNCTION validate_worker_user_role()
RETURNS TRIGGER AS $$
DECLARE
    v_user_role VARCHAR(20);
BEGIN
    SELECT role INTO v_user_role FROM users WHERE id = NEW.user_id;

    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'Referenced user % does not exist', NEW.user_id;
    END IF;

    IF v_user_role <> 'worker' THEN
        RAISE EXCEPTION 'User % has role "%", but worker profile requires role "worker"', NEW.user_id, v_user_role;
    END IF;

    IF EXISTS (SELECT 1 FROM contractors WHERE user_id = NEW.user_id) THEN
        RAISE EXCEPTION 'User % already has a contractor profile. A user can only be worker OR contractor.', NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_worker_role
BEFORE INSERT OR UPDATE ON workers
FOR EACH ROW
EXECUTE FUNCTION validate_worker_user_role();

CREATE OR REPLACE FUNCTION validate_contractor_user_role()
RETURNS TRIGGER AS $$
DECLARE
    v_user_role VARCHAR(20);
BEGIN
    SELECT role INTO v_user_role FROM users WHERE id = NEW.user_id;

    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'Referenced user % does not exist', NEW.user_id;
    END IF;

    IF v_user_role <> 'contractor' THEN
        RAISE EXCEPTION 'User % has role "%", but contractor profile requires role "contractor"', NEW.user_id, v_user_role;
    END IF;

    IF EXISTS (SELECT 1 FROM workers WHERE user_id = NEW.user_id) THEN
        RAISE EXCEPTION 'User % already has a worker profile. A user can only be worker OR contractor.', NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_contractor_role
BEFORE INSERT OR UPDATE ON contractors
FOR EACH ROW
EXECUTE FUNCTION validate_contractor_user_role();

-- ==============================================================================
-- 5. PERFORMANCE INDEXES
-- ==============================================================================

-- Users indexes
CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_users_role ON users(role);

-- Workers indexes
CREATE INDEX idx_workers_user_id ON workers(user_id);
CREATE INDEX idx_workers_skill ON workers(skill);

-- Contractors indexes
CREATE INDEX idx_contractors_user_id ON contractors(user_id);
CREATE INDEX idx_contractors_company ON contractors(company_name);

-- Jobs indexes
CREATE INDEX idx_jobs_contractor_id ON jobs(contractor_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_category ON jobs(category);
CREATE INDEX idx_jobs_location ON jobs(location);

-- Job Assignments indexes
CREATE INDEX idx_job_assignments_job_id ON job_assignments(job_id);
CREATE INDEX idx_job_assignments_worker_id ON job_assignments(worker_id);
CREATE INDEX idx_job_assignments_contractor_id ON job_assignments(contractor_id);
CREATE INDEX idx_job_assignments_assignment_status ON job_assignments(assignment_status);
CREATE INDEX idx_job_assignments_work_status ON job_assignments(work_status);

-- Payments indexes
CREATE INDEX idx_payments_assignment_id ON payments(assignment_id);
CREATE INDEX idx_payments_worker_id ON payments(worker_id);
CREATE INDEX idx_payments_job_id ON payments(job_id);
CREATE INDEX idx_payments_payment_status ON payments(payment_status);

-- ==============================================================================
-- 6. PUBLIC SAFE VIEW
-- Exposes user profile data without ever leaking password_hash.
-- ==============================================================================
CREATE OR REPLACE VIEW user_public_profiles AS
SELECT 
    id,
    name,
    mobile,
    role,
    location,
    created_at
FROM users;

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across all application tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Service Role Policy:
-- Node.js Backend connecting via SUPABASE_SERVICE_ROLE_KEY has full access.
-- ------------------------------------------------------------------------------
CREATE POLICY service_role_all_users ON users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_workers ON workers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_contractors ON contractors FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_jobs ON jobs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_assignments ON job_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_all_payments ON payments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- Anon / Authenticated Client Policies:
-- Provides clean access rules if frontend or client interacts with Supabase.
-- ------------------------------------------------------------------------------

-- Users: Allow registration (insert) and public profile reads
CREATE POLICY allow_user_registration ON users FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY allow_user_read ON users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY allow_user_update_own ON users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Workers: Allow reading worker profiles (for contractors hiring), allow worker to edit own profile
CREATE POLICY allow_worker_read ON workers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY allow_worker_insert ON workers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY allow_worker_update ON workers FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Contractors: Allow reading contractor profiles, allow contractor to edit own profile
CREATE POLICY allow_contractor_read ON contractors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY allow_contractor_insert ON contractors FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY allow_contractor_update ON contractors FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Jobs: Anyone can browse open jobs; contractors can manage their jobs
CREATE POLICY allow_jobs_read ON jobs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY allow_jobs_insert ON jobs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY allow_jobs_update ON jobs FOR UPDATE TO authenticated USING (true);

-- Job Assignments: Allow view and update of assignments
CREATE POLICY allow_assignments_read ON job_assignments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY allow_assignments_insert ON job_assignments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY allow_assignments_update ON job_assignments FOR UPDATE TO authenticated USING (true);

-- Payments: Allow view and update of payments
CREATE POLICY allow_payments_read ON payments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY allow_payments_insert ON payments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY allow_payments_update ON payments FOR UPDATE TO authenticated USING (true);
