-- ==============================================================================
-- KaamSetu Seed / Demo Data (PostgreSQL / Supabase)
-- Member 3: Database Engineer
-- Description: Safe, predictable demo data modeling the complete lifecycle.
-- ==============================================================================

-- Clear existing data (in proper dependency order)
TRUNCATE TABLE payments, job_assignments, jobs, contractors, workers, users CASCADE;

-- ------------------------------------------------------------------------------
-- 1. SEED USERS
-- Password hash corresponds to a standard bcrypt hash for 'password123'
-- ------------------------------------------------------------------------------
INSERT INTO users (id, name, mobile, password_hash, role, location, created_at)
VALUES
    -- Worker 1: Rahul Patil
    ('11111111-1111-1111-1111-111111111101', 'Rahul Patil', '9000000001', '$2a$10$wEeVqBZZx8h8xP4dO6jCyeKqV0V7/J1u3xT8j5X0vVqH0bVzW0f6G', 'worker', 'Pune', NOW() - INTERVAL '10 days'),
    -- Worker 2: Suresh Kumar
    ('11111111-1111-1111-1111-111111111102', 'Suresh Kumar', '9000000003', '$2a$10$wEeVqBZZx8h8xP4dO6jCyeKqV0V7/J1u3xT8j5X0vVqH0bVzW0f6G', 'worker', 'Pune', NOW() - INTERVAL '8 days'),
    -- Worker 3: Ramesh Shinde
    ('11111111-1111-1111-1111-111111111103', 'Ramesh Shinde', '9000000005', '$2a$10$wEeVqBZZx8h8xP4dO6jCyeKqV0V7/J1u3xT8j5X0vVqH0bVzW0f6G', 'worker', 'Mumbai', NOW() - INTERVAL '5 days'),

    -- Contractor 1: Amit Sharma
    ('22222222-2222-2222-2222-222222222201', 'Amit Sharma', '9000000002', '$2a$10$wEeVqBZZx8h8xP4dO6jCyeKqV0V7/J1u3xT8j5X0vVqH0bVzW0f6G', 'contractor', 'Pune', NOW() - INTERVAL '12 days'),
    -- Contractor 2: Priya Deshmukh
    ('22222222-2222-2222-2222-222222222202', 'Priya Deshmukh', '9000000004', '$2a$10$wEeVqBZZx8h8xP4dO6jCyeKqV0V7/J1u3xT8j5X0vVqH0bVzW0f6G', 'contractor', 'Pune', NOW() - INTERVAL '7 days');

-- ------------------------------------------------------------------------------
-- 2. SEED WORKERS
-- ------------------------------------------------------------------------------
INSERT INTO workers (id, user_id, skill, experience, created_at)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111101', 'Mason', '3 years', NOW() - INTERVAL '10 days'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '11111111-1111-1111-1111-111111111102', 'Painter', '4 years', NOW() - INTERVAL '8 days'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '11111111-1111-1111-1111-111111111103', 'Electrician', '5 years', NOW() - INTERVAL '5 days');

-- ------------------------------------------------------------------------------
-- 3. SEED CONTRACTORS
-- ------------------------------------------------------------------------------
INSERT INTO contractors (id, user_id, company_name, work_category, created_at)
VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '22222222-2222-2222-2222-222222222201', 'Amit Construction', 'Construction', NOW() - INTERVAL '12 days'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '22222222-2222-2222-2222-222222222202', 'Deshmukh Renovations', 'Renovation & Painting', NOW() - INTERVAL '7 days');

-- ------------------------------------------------------------------------------
-- 4. SEED JOBS
-- ------------------------------------------------------------------------------
INSERT INTO jobs (id, contractor_id, title, category, location, workers_required, wage, start_date, end_date, description, status, created_at)
VALUES
    -- Job 1: Open job as specified in requirements
    ('44444444-4444-4444-4444-444444444401', 
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 
     'Construction Helper', 
     'Construction', 
     'Pune', 
     3, 
     700.00, 
     CURRENT_DATE + 1, 
     CURRENT_DATE + 5, 
     'Need 3 construction helpers for material transport and site clearing.', 
     'Open', 
     NOW() - INTERVAL '3 days'),

    -- Job 2: In Progress job
    ('44444444-4444-4444-4444-444444444402', 
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 
     'Site Masonry Work', 
     'Masonry', 
     'Pune', 
     2, 
     750.00, 
     CURRENT_DATE - 1, 
     CURRENT_DATE + 3, 
     'Brick laying and boundary wall construction.', 
     'In Progress', 
     NOW() - INTERVAL '4 days'),

    -- Job 3: Completed job with paid payment
    ('44444444-4444-4444-4444-444444444403', 
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 
     'Foundation Concrete Pouring', 
     'Construction', 
     'Pune', 
     1, 
     800.00, 
     CURRENT_DATE - 5, 
     CURRENT_DATE - 2, 
     'RCC foundation pouring and leveling.', 
     'Completed', 
     NOW() - INTERVAL '6 days'),

    -- Job 4: Completed job with pending payment
    ('44444444-4444-4444-4444-444444444404', 
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 
     'Apartment Interior Painting', 
     'Painting', 
     'Pune', 
     1, 
     850.00, 
     CURRENT_DATE - 3, 
     CURRENT_DATE - 1, 
     'Two coats primer and acrylic paint application.', 
     'Completed', 
     NOW() - INTERVAL '4 days'),

    -- Job 5: Additional open job
    ('44444444-4444-4444-4444-444444444405', 
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 
     'Wiring and Lighting Setup', 
     'Electrical', 
     'Pune', 
     2, 
     900.00, 
     CURRENT_DATE + 2, 
     CURRENT_DATE + 6, 
     'Wiring conduit and light fixtures installation.', 
     'Open', 
     NOW() - INTERVAL '1 day');

-- ------------------------------------------------------------------------------
-- 5. SEED JOB ASSIGNMENTS
-- ------------------------------------------------------------------------------
INSERT INTO job_assignments (id, job_id, worker_id, contractor_id, agreed_wage, assignment_status, work_status, assigned_at, completed_at)
VALUES
    -- Assignment 1: Rahul Patil on Job 2 (In Progress)
    ('55555555-5555-5555-5555-555555555501',
     '44444444-4444-4444-4444-444444444402',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
     750.00,
     'Accepted',
     'In Progress',
     NOW() - INTERVAL '3 days',
     NULL),

    -- Assignment 2: Rahul Patil on Job 3 (Completed Work)
    ('55555555-5555-5555-5555-555555555502',
     '44444444-4444-4444-4444-444444444403',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
     800.00,
     'Completed',
     'Completed',
     NOW() - INTERVAL '5 days',
     NOW() - INTERVAL '2 days'),

    -- Assignment 3: Suresh Kumar on Job 4 (Completed Work, Awaiting Payment)
    ('55555555-5555-5555-5555-555555555503',
     '44444444-4444-4444-4444-444444444404',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
     850.00,
     'Completed',
     'Completed',
     NOW() - INTERVAL '3 days',
     NOW() - INTERVAL '1 day'),

    -- Assignment 4: Suresh Kumar assigned to Job 2 (Assigned/Pending Acceptance)
    ('55555555-5555-5555-5555-555555555504',
     '44444444-4444-4444-4444-444444444402',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
     750.00,
     'Assigned',
     'Assigned',
     NOW() - INTERVAL '1 day',
     NULL);

-- ------------------------------------------------------------------------------
-- 6. SEED PAYMENTS
-- ------------------------------------------------------------------------------
INSERT INTO payments (id, assignment_id, worker_id, job_id, amount, payment_status, payment_date, created_at)
VALUES
    -- Payment 1: Paid wage to Rahul Patil for Job 3
    ('66666666-6666-6666-6666-666666666601',
     '55555555-5555-5555-5555-555555555502',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
     '44444444-4444-4444-4444-444444444403',
     800.00,
     'Paid',
     NOW() - INTERVAL '1 day',
     NOW() - INTERVAL '2 days'),

    -- Payment 2: Pending wage for Suresh Kumar for Job 4
    ('66666666-6666-6666-6666-666666666602',
     '55555555-5555-5555-5555-555555555503',
     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
     '44444444-4444-4444-4444-444444444404',
     850.00,
     'Pending',
     NULL,
     NOW() - INTERVAL '1 day');
