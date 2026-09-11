-- ==============================================================================
-- KaamSetu Useful SQL Queries
-- Member 3: Database Engineer
-- Description: Standard production queries for backend endpoints and reporting.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Get all jobs created by a contractor
-- Useful for: Contractor Dashboard -> "My Posted Jobs"
-- Parameter: :contractor_id (or demo contractor id 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1')
-- ------------------------------------------------------------------------------
SELECT 
    j.id AS job_id,
    j.title,
    j.category,
    j.location,
    j.workers_required,
    j.wage,
    j.status,
    j.start_date,
    j.end_date,
    j.created_at,
    COUNT(ja.id) AS workers_currently_assigned
FROM jobs j
LEFT JOIN job_assignments ja ON j.id = ja.job_id
WHERE j.contractor_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'
GROUP BY j.id
ORDER BY j.created_at DESC;


-- ------------------------------------------------------------------------------
-- 2. Get all workers assigned to a particular job
-- Useful for: Contractor Job Details -> "Assigned Workers List"
-- Parameter: :job_id (or demo job id '44444444-4444-4444-4444-444444444402')
-- ------------------------------------------------------------------------------
SELECT 
    ja.id AS assignment_id,
    w.id AS worker_id,
    u.name AS worker_name,
    u.mobile AS worker_mobile,
    u.location AS worker_city,
    w.skill,
    w.experience,
    ja.agreed_wage,
    ja.assignment_status,
    ja.work_status,
    ja.assigned_at,
    ja.completed_at
FROM job_assignments ja
JOIN workers w ON ja.worker_id = w.id
JOIN users u ON w.user_id = u.id
WHERE ja.job_id = '44444444-4444-4444-4444-444444444402'
ORDER BY ja.assigned_at ASC;


-- ------------------------------------------------------------------------------
-- 3. Get all jobs assigned to a particular worker
-- Useful for: Worker Dashboard -> "My Assigned Jobs"
-- Parameter: :worker_id (or demo worker id 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1')
-- ------------------------------------------------------------------------------
SELECT 
    ja.id AS assignment_id,
    j.id AS job_id,
    j.title AS job_title,
    j.category,
    j.location AS job_location,
    c.company_name,
    cu.name AS contractor_name,
    cu.mobile AS contractor_mobile,
    ja.agreed_wage,
    ja.assignment_status,
    ja.work_status,
    j.status AS job_overall_status,
    ja.assigned_at
FROM job_assignments ja
JOIN jobs j ON ja.job_id = j.id
JOIN contractors c ON ja.contractor_id = c.id
JOIN users cu ON c.user_id = cu.id
WHERE ja.worker_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
ORDER BY ja.assigned_at DESC;


-- ------------------------------------------------------------------------------
-- 4. Get a worker's completed work history
-- Useful for: Worker Profile -> "Completed Work / Experience History"
-- Parameter: :worker_id (or demo worker id 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1')
-- ------------------------------------------------------------------------------
SELECT 
    ja.id AS assignment_id,
    j.title AS job_title,
    j.category,
    c.company_name,
    ja.agreed_wage,
    ja.assigned_at,
    ja.completed_at,
    p.amount AS paid_amount,
    p.payment_status,
    p.payment_date
FROM job_assignments ja
JOIN jobs j ON ja.job_id = j.id
JOIN contractors c ON ja.contractor_id = c.id
LEFT JOIN payments p ON ja.id = p.assignment_id
WHERE ja.worker_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
  AND ja.work_status = 'Completed'
ORDER BY ja.completed_at DESC;


-- ------------------------------------------------------------------------------
-- 5. Get a contractor's completed jobs
-- Useful for: Contractor Dashboard -> "Completed Projects"
-- Parameter: :contractor_id (or demo contractor id 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1')
-- ------------------------------------------------------------------------------
SELECT 
    j.id AS job_id,
    j.title,
    j.category,
    j.location,
    j.workers_required,
    j.wage,
    j.start_date,
    j.end_date,
    COUNT(ja.id) AS total_assigned_workers,
    COALESCE(SUM(p.amount), 0) AS total_payout
FROM jobs j
LEFT JOIN job_assignments ja ON j.id = ja.job_id
LEFT JOIN payments p ON ja.id = p.assignment_id
WHERE j.contractor_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1'
  AND j.status = 'Completed'
GROUP BY j.id
ORDER BY j.end_date DESC NULLS LAST;


-- ------------------------------------------------------------------------------
-- 6. Get all pending payments
-- Useful for: Contractor Payouts / Admin Audit -> "Unpaid Wages"
-- Optional filter: WHERE ja.contractor_id = :contractor_id
-- ------------------------------------------------------------------------------
SELECT 
    p.id AS payment_id,
    p.amount,
    p.payment_status,
    p.created_at AS payment_requested_at,
    wu.name AS worker_name,
    wu.mobile AS worker_mobile,
    c.company_name AS contractor_company,
    cu.name AS contractor_name,
    cu.mobile AS contractor_mobile,
    j.title AS job_title
FROM payments p
JOIN job_assignments ja ON p.assignment_id = ja.id
JOIN workers w ON p.worker_id = w.id
JOIN users wu ON w.user_id = wu.id
JOIN jobs j ON p.job_id = j.id
JOIN contractors c ON j.contractor_id = c.id
JOIN users cu ON c.user_id = cu.id
WHERE p.payment_status = 'Pending'
ORDER BY p.created_at ASC;


-- ------------------------------------------------------------------------------
-- 7. Get all paid payments
-- Useful for: Accounting / Completed Transactions
-- ------------------------------------------------------------------------------
SELECT 
    p.id AS payment_id,
    p.amount,
    p.payment_status,
    p.payment_date,
    wu.name AS worker_name,
    c.company_name AS contractor_company,
    j.title AS job_title
FROM payments p
JOIN job_assignments ja ON p.assignment_id = ja.id
JOIN workers w ON p.worker_id = w.id
JOIN users wu ON w.user_id = wu.id
JOIN jobs j ON p.job_id = j.id
JOIN contractors c ON j.contractor_id = c.id
WHERE p.payment_status = 'Paid'
ORDER BY p.payment_date DESC;


-- ------------------------------------------------------------------------------
-- 8. Get payment history for a worker
-- Useful for: Worker Earnings Screen -> "Payment History"
-- Parameter: :worker_id (or demo worker id 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1')
-- ------------------------------------------------------------------------------
SELECT 
    p.id AS payment_id,
    j.title AS job_title,
    c.company_name AS employer,
    p.amount,
    p.payment_status,
    p.created_at AS recorded_date,
    p.payment_date AS disbursed_date
FROM payments p
JOIN jobs j ON p.job_id = j.id
JOIN contractors c ON j.contractor_id = c.id
WHERE p.worker_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
ORDER BY p.created_at DESC;


-- ------------------------------------------------------------------------------
-- 9. Get the number of workers assigned to each job
-- Useful for: Job Capacity Monitor -> Check if job is fully staffed
-- ------------------------------------------------------------------------------
SELECT 
    j.id AS job_id,
    j.title,
    j.location,
    j.workers_required,
    COUNT(ja.id) AS workers_assigned,
    (j.workers_required - COUNT(ja.id)) AS vacancies_remaining,
    CASE 
        WHEN COUNT(ja.id) >= j.workers_required THEN 'Fully Staffed'
        WHEN COUNT(ja.id) > 0 THEN 'Partially Staffed'
        ELSE 'Unstaffed'
    END AS staffing_status
FROM jobs j
LEFT JOIN job_assignments ja ON j.id = ja.job_id
GROUP BY j.id
ORDER BY j.created_at DESC;


-- ------------------------------------------------------------------------------
-- 10. Get jobs currently open for assignment
-- Useful for: Worker Job Board / Browse Open Jobs
-- ------------------------------------------------------------------------------
SELECT 
    j.id AS job_id,
    j.title,
    j.category,
    j.location,
    j.wage,
    j.workers_required,
    c.company_name,
    u.name AS contractor_name,
    j.start_date,
    j.end_date,
    j.description,
    j.created_at
FROM jobs j
JOIN contractors c ON j.contractor_id = c.id
JOIN users u ON c.user_id = u.id
WHERE j.status = 'Open'
ORDER BY j.created_at DESC;


-- ------------------------------------------------------------------------------
-- BONUS: Full End-to-End KaamSetu Lifecycle Audit
-- Verifies: Contractor -> Job -> Assignment -> Work Status -> Payment
-- ------------------------------------------------------------------------------
SELECT 
    j.title AS job_title,
    c.company_name,
    wu.name AS worker_name,
    ja.assignment_status,
    ja.work_status,
    COALESCE(p.payment_status, 'No Payment Record') AS payment_status,
    COALESCE(p.amount, ja.agreed_wage) AS wage_amount
FROM jobs j
JOIN contractors c ON j.contractor_id = c.id
JOIN job_assignments ja ON j.id = ja.job_id
JOIN workers w ON ja.worker_id = w.id
JOIN users wu ON w.user_id = wu.id
LEFT JOIN payments p ON ja.id = p.assignment_id
ORDER BY j.created_at DESC;
