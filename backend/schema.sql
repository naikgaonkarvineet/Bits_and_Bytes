-- ==========================================================
-- KAAMSETU DATABASE SCHEMA FOR SUPABASE POSTGRESQL
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Workers Table
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  trade VARCHAR(100) NOT NULL,
  daily_wage NUMERIC(10, 2) DEFAULT 800,
  experience VARCHAR(50) DEFAULT '3-5 Years',
  location VARCHAR(255) NOT NULL,
  preferred_lang VARCHAR(50) DEFAULT 'Hindi',
  aadhar_verified BOOLEAN DEFAULT false,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Contractors Table
CREATE TABLE IF NOT EXISTS contractors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  business_type VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  gst_id VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE,
  contractor_name VARCHAR(255) NOT NULL,
  contractor_contact VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  workers_needed INTEGER DEFAULT 1,
  daily_wage NUMERIC(10, 2) NOT NULL,
  duration VARCHAR(100) NOT NULL,
  start_date VARCHAR(100) NOT NULL,
  end_date VARCHAR(100),
  location VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  requirements JSONB DEFAULT '[]'::jsonb,
  urgent BOOLEAN DEFAULT false,
  status VARCHAR(50) DEFAULT 'Open', -- 'Open', 'Assigned', 'In Progress', 'Completed', 'Closed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Worker Assignments / Applications Table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE,
  job_title VARCHAR(255),
  contractor_name VARCHAR(255),
  worker_name VARCHAR(255),
  worker_trade VARCHAR(100),
  worker_phone VARCHAR(50),
  agreed_wage NUMERIC(10, 2) NOT NULL,
  location VARCHAR(255),
  assignment_status VARCHAR(50) DEFAULT 'Assigned', -- 'Assigned', 'Accepted', 'Rejected', 'Completed'
  work_status VARCHAR(50) DEFAULT 'Assigned',       -- 'Assigned', 'Accepted', 'In Progress', 'Completed'
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, worker_id)
);

-- 5. Payments Table (Status & Wage Recording)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE,
  job_title VARCHAR(255),
  worker_name VARCHAR(255),
  contractor_name VARCHAR(255),
  amount NUMERIC(10, 2) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Paid'
  payment_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_contractor ON jobs(contractor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_worker ON assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_assignments_job ON assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_assignments_contractor ON assignments(contractor_id);
CREATE INDEX IF NOT EXISTS idx_payments_worker ON payments(worker_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
