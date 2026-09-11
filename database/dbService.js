/**
 * KaamSetu - Database Access Service
 * Member 3: Database Engineer
 * 
 * Provides pre-built database methods for Member 2 (Backend / Express)
 * to implement all endpoints in the KaamSetu workflow seamlessly.
 */

const { supabaseAdmin, supabase } = require('./supabaseClient');

// Prefer supabaseAdmin (service role) on backend to bypass RLS safely
const client = () => supabaseAdmin || supabase;

const KaamSetuDB = {
    // -------------------------------------------------------------------------
    // 1. AUTHENTICATION & USERS
    // -------------------------------------------------------------------------

    /**
     * Register a new worker or contractor with their respective profile
     */
    async registerUser({ name, mobile, password_hash, role, location, profileData }) {
        const db = client();

        // 1. Insert into users table
        const { data: user, error: userError } = await db
            .from('users')
            .insert([{ name, mobile, password_hash, role, location }])
            .select()
            .single();

        if (userError) throw userError;

        // 2. Insert into worker or contractor profile
        if (role === 'worker') {
            const { data: worker, error: workerError } = await db
                .from('workers')
                .insert([{
                    user_id: user.id,
                    skill: profileData.skill || 'General Labor',
                    experience: profileData.experience || '1 year'
                }])
                .select()
                .single();

            if (workerError) throw workerError;
            return { user, worker };
        } else if (role === 'contractor') {
            const { data: contractor, error: contractorError } = await db
                .from('contractors')
                .insert([{
                    user_id: user.id,
                    company_name: profileData.company_name || name,
                    work_category: profileData.work_category || 'General Construction'
                }])
                .select()
                .single();

            if (contractorError) throw contractorError;
            return { user, contractor };
        }

        return { user };
    },

    /**
     * Find user by mobile number for login
     */
    async getUserByMobile(mobile) {
        const { data, error } = await client()
            .from('users')
            .select(`
                id,
                name,
                mobile,
                password_hash,
                role,
                location,
                workers ( id, skill, experience ),
                contractors ( id, company_name, work_category )
            `)
            .eq('mobile', mobile)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    // -------------------------------------------------------------------------
    // 2. JOBS MANAGEMENT
    // -------------------------------------------------------------------------

    /**
     * Create a new job (Contractor action)
     */
    async createJob({ contractor_id, title, category, location, workers_required, wage, start_date, end_date, description }) {
        const { data, error } = await client()
            .from('jobs')
            .insert([{
                contractor_id,
                title,
                category,
                location,
                workers_required: parseInt(workers_required, 10),
                wage: parseFloat(wage),
                start_date: start_date || null,
                end_date: end_date || null,
                description: description || null,
                status: 'Open'
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get all open jobs available for workers to browse
     */
    async getOpenJobs() {
        const { data, error } = await client()
            .from('jobs')
            .select(`
                *,
                contractors (
                    id,
                    company_name,
                    work_category,
                    users ( name, mobile )
                )
            `)
            .eq('status', 'Open')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Get all jobs posted by a specific contractor
     */
    async getContractorJobs(contractor_id) {
        const { data, error } = await client()
            .from('jobs')
            .select(`
                *,
                job_assignments (
                    id,
                    assignment_status,
                    work_status,
                    agreed_wage,
                    workers (
                        id,
                        skill,
                        users ( name, mobile )
                    )
                )
            `)
            .eq('contractor_id', contractor_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    // -------------------------------------------------------------------------
    // 3. JOB ASSIGNMENTS & WORK LIFECYCLE
    // -------------------------------------------------------------------------

    /**
     * Contractor assigns a worker to a job
     */
    async assignWorkerToJob({ job_id, worker_id, contractor_id, agreed_wage }) {
        const { data, error } = await client()
            .from('job_assignments')
            .insert([{
                job_id,
                worker_id,
                contractor_id,
                agreed_wage: parseFloat(agreed_wage),
                assignment_status: 'Assigned',
                work_status: 'Assigned'
            }])
            .select()
            .single();

        if (error) throw error;

        // Optionally update job status to 'Assigned' if it was 'Open'
        await client()
            .from('jobs')
            .update({ status: 'Assigned' })
            .eq('id', job_id)
            .eq('status', 'Open');

        return data;
    },

    /**
     * Worker views their assigned jobs
     */
    async getWorkerAssignments(worker_id) {
        const { data, error } = await client()
            .from('job_assignments')
            .select(`
                *,
                jobs (
                    id,
                    title,
                    category,
                    location,
                    wage,
                    status,
                    description,
                    start_date,
                    end_date
                ),
                contractors (
                    id,
                    company_name,
                    users ( name, mobile )
                ),
                payments (
                    id,
                    amount,
                    payment_status,
                    payment_date
                )
            `)
            .eq('worker_id', worker_id)
            .order('assigned_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Worker accepts or rejects assigned job
     */
    async respondToAssignment(assignment_id, responseStatus) {
        if (!['Accepted', 'Rejected'].includes(responseStatus)) {
            throw new Error("Invalid assignment status. Must be 'Accepted' or 'Rejected'.");
        }

        const updateData = {
            assignment_status: responseStatus
        };

        if (responseStatus === 'Accepted') {
            updateData.work_status = 'Accepted';
        }

        const { data, error } = await client()
            .from('job_assignments')
            .update(updateData)
            .eq('id', assignment_id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update progress of work: 'In Progress' or 'Completed'
     */
    async updateWorkProgress(assignment_id, work_status) {
        if (!['In Progress', 'Completed'].includes(work_status)) {
            throw new Error("Invalid work status. Must be 'In Progress' or 'Completed'.");
        }

        const updateData = { work_status };
        if (work_status === 'Completed') {
            updateData.completed_at = new Date().toISOString();
            updateData.assignment_status = 'Completed';
        }

        const { data: assignment, error } = await client()
            .from('job_assignments')
            .update(updateData)
            .eq('id', assignment_id)
            .select()
            .single();

        if (error) throw error;

        // When work is completed, automatically create a 'Pending' payment record if none exists
        if (work_status === 'Completed') {
            const { data: existingPayment } = await client()
                .from('payments')
                .select('id')
                .eq('assignment_id', assignment_id)
                .maybeSingle();

            if (!existingPayment) {
                await client()
                    .from('payments')
                    .insert([{
                        assignment_id: assignment.id,
                        worker_id: assignment.worker_id,
                        job_id: assignment.job_id,
                        amount: assignment.agreed_wage,
                        payment_status: 'Pending'
                    }]);
            }

            // Update parent job status
            await client()
                .from('jobs')
                .update({ status: 'Completed' })
                .eq('id', assignment.job_id);
        } else if (work_status === 'In Progress') {
            await client()
                .from('jobs')
                .update({ status: 'In Progress' })
                .eq('id', assignment.job_id);
        }

        return assignment;
    },

    // -------------------------------------------------------------------------
    // 4. PAYMENTS & SETTLEMENTS
    // -------------------------------------------------------------------------

    /**
     * Mark a payment as Paid (Contractor action)
     */
    async markPaymentPaid(payment_id) {
        const { data, error } = await client()
            .from('payments')
            .update({
                payment_status: 'Paid',
                payment_date: new Date().toISOString()
            })
            .eq('id', payment_id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get payment history for a worker
     */
    async getWorkerPayments(worker_id) {
        const { data, error } = await client()
            .from('payments')
            .select(`
                *,
                jobs ( title, category ),
                job_assignments ( agreed_wage, completed_at )
            `)
            .eq('worker_id', worker_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Get all pending payments for contractor review
     */
    async getPendingPayments(contractor_id = null) {
        let query = client()
            .from('payments')
            .select(`
                *,
                workers (
                    id,
                    skill,
                    users ( name, mobile )
                ),
                jobs ( id, title, contractor_id )
            `)
            .eq('payment_status', 'Pending')
            .order('created_at', { ascending: false });

        if (contractor_id) {
            query = query.eq('jobs.contractor_id', contractor_id);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }
};

module.exports = KaamSetuDB;
