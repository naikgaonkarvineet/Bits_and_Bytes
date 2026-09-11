const path = require('path');
const {
  SEED_WORKERS,
  SEED_CONTRACTORS,
  SEED_JOBS,
  SEED_ASSIGNMENTS,
  SEED_PAYMENTS
} = require('./seedData');

// Import authoritative Supabase client and DB service built by Database team (Member 3)
const { supabase, supabaseAdmin, testConnection } = require(path.resolve(__dirname, '../../database/supabaseClient'));
const KaamSetuDB = require(path.resolve(__dirname, '../../database/dbService'));

const activeClient = () => supabaseAdmin || supabase;

const isSupabaseConfigured = Boolean(
  process.env.SUPABASE_URL &&
  (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) &&
  !process.env.SUPABASE_URL.includes('your-project')
);

if (isSupabaseConfigured) {
  console.log('✓ Connected to Supabase at:', process.env.SUPABASE_URL);
} else {
  console.log('ℹ️ Supabase credentials not set in .env. Operating in high-speed local in-memory database mode with seed data.');
}

// In-Memory Database Store (Fallback for offline/local testing)
const memoryStore = {
  workers: JSON.parse(JSON.stringify(SEED_WORKERS)),
  contractors: JSON.parse(JSON.stringify(SEED_CONTRACTORS)),
  jobs: JSON.parse(JSON.stringify(SEED_JOBS)),
  assignments: JSON.parse(JSON.stringify(SEED_ASSIGNMENTS)),
  payments: JSON.parse(JSON.stringify(SEED_PAYMENTS))
};

// Helper to normalize Supabase user+worker or user+contractor objects to flat backend DTOs
function normalizeWorker(data) {
  if (!data) return null;
  if (data.users && data.workers) {
    const w = Array.isArray(data.workers) ? data.workers[0] : data.workers;
    return {
      id: w?.id || data.id,
      user_id: data.id,
      name: data.name,
      phone: data.mobile,
      trade: w?.skill || 'General Labor',
      daily_wage: 800,
      experience: w?.experience || '1-2 Years',
      location: data.location,
      preferred_lang: 'Hindi',
      aadhar_verified: true,
      password_hash: data.password_hash,
      created_at: data.created_at
    };
  }
  return {
    ...data,
    phone: data.phone || data.mobile,
    trade: data.trade || data.skill || 'General Labor',
    daily_wage: Number(data.daily_wage || 800)
  };
}

function normalizeContractor(data) {
  if (!data) return null;
  if (data.users && data.contractors) {
    const c = Array.isArray(data.contractors) ? data.contractors[0] : data.contractors;
    return {
      id: c?.id || data.id,
      user_id: data.id,
      company_name: c?.company_name || data.name,
      contact_person: data.name,
      phone: data.mobile,
      email: data.email || null,
      business_type: c?.work_category || 'General Civil Contractor',
      location: data.location,
      gst_id: null,
      password_hash: data.password_hash,
      created_at: data.created_at
    };
  }
  return {
    ...data,
    phone: data.phone || data.mobile,
    contact_person: data.contact_person || data.name || data.company_name
  };
}

// Unified Data Access Helper
const db = {
  // Workers
  async findWorkerByPhone(phone) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        const user = await KaamSetuDB.getUserByMobile(phone);
        if (user && (user.role === 'worker' || (user.workers && user.workers.length > 0))) {
          return normalizeWorker(user);
        }
        // Direct table query fallback if schema is flat
        const { data, error } = await activeClient().from('workers').select('*').eq('phone', phone).maybeSingle();
        if (!error && data) return normalizeWorker(data);
      } catch (err) {
        console.warn('Supabase findWorkerByPhone fallback:', err.message);
      }
    }
    return memoryStore.workers.find(w => w.phone === phone) || null;
  },

  async findWorkerById(id) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        const { data, error } = await activeClient().from('workers').select('*').eq('id', id).single();
        if (!error && data) return normalizeWorker(data);

        // Try user_id match
        const { data: userData, error: userErr } = await activeClient()
          .from('users')
          .select('*, workers(*)')
          .eq('id', id)
          .maybeSingle();
        if (!userErr && userData) return normalizeWorker(userData);
      } catch (err) {
        console.warn('Supabase findWorkerById fallback:', err.message);
      }
    }
    return memoryStore.workers.find(w => w.id === id) || null;
  },

  async createWorker(workerData) {
    const newWorker = {
      id: workerData.id || `w-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...workerData
    };

    if (isSupabaseConfigured && activeClient()) {
      try {
        // Attempt insert using KaamSetuDB
        const res = await KaamSetuDB.registerUser({
          name: workerData.name,
          mobile: workerData.phone,
          password_hash: workerData.password_hash || 'hashed_pw',
          role: 'worker',
          location: workerData.location || 'Noida, UP',
          profileData: {
            skill: workerData.trade || 'Masonry',
            experience: workerData.experience || '3-5 Years'
          }
        });
        if (res && res.worker) {
          const created = normalizeWorker({ ...res.user, workers: [res.worker] });
          memoryStore.workers.push(created);
          return created;
        }
      } catch (err) {
        // Fallback to direct workers table insert
        try {
          const { data, error } = await activeClient().from('workers').insert([newWorker]).select().single();
          if (!error && data) {
            memoryStore.workers.push(data);
            return data;
          }
        } catch (e) {}
        console.warn('Supabase worker insert fallback:', err.message);
      }
    }

    memoryStore.workers.push(newWorker);
    return newWorker;
  },

  async updateWorker(id, updateData) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        const { data, error } = await activeClient().from('workers').update({ ...updateData, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (!error && data) {
          const idx = memoryStore.workers.findIndex(w => w.id === id);
          if (idx !== -1) memoryStore.workers[idx] = data;
          return data;
        }
      } catch (err) {}
    }

    const worker = memoryStore.workers.find(w => w.id === id);
    if (!worker) return null;
    Object.assign(worker, updateData, { updated_at: new Date().toISOString() });
    return worker;
  },

  // Contractors
  async findContractorByIdentifier(identifier) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        const user = await KaamSetuDB.getUserByMobile(identifier);
        if (user && (user.role === 'contractor' || (user.contractors && user.contractors.length > 0))) {
          return normalizeContractor(user);
        }
        const { data, error } = await activeClient()
          .from('contractors')
          .select('*')
          .or(`phone.eq.${identifier},email.eq.${identifier}`)
          .limit(1);
        if (!error && data && data.length > 0) return normalizeContractor(data[0]);
      } catch (err) {
        console.warn('Supabase findContractorByIdentifier fallback:', err.message);
      }
    }
    return memoryStore.contractors.find(c => c.phone === identifier || c.email === identifier) || null;
  },

  async findContractorById(id) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        const { data, error } = await activeClient().from('contractors').select('*').eq('id', id).single();
        if (!error && data) return normalizeContractor(data);

        const { data: userData, error: userErr } = await activeClient()
          .from('users')
          .select('*, contractors(*)')
          .eq('id', id)
          .maybeSingle();
        if (!userErr && userData) return normalizeContractor(userData);
      } catch (err) {
        console.warn('Supabase findContractorById fallback:', err.message);
      }
    }
    return memoryStore.contractors.find(c => c.id === id) || null;
  },

  async createContractor(contractorData) {
    const newContractor = {
      id: contractorData.id || `c-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...contractorData
    };

    if (isSupabaseConfigured && activeClient()) {
      try {
        const res = await KaamSetuDB.registerUser({
          name: contractorData.contact_person || contractorData.company_name,
          mobile: contractorData.phone,
          password_hash: contractorData.password_hash || 'hashed_pw',
          role: 'contractor',
          location: contractorData.location || 'Delhi NCR',
          profileData: {
            company_name: contractorData.company_name,
            work_category: contractorData.business_type || 'General Civil Contractor'
          }
        });
        if (res && res.contractor) {
          const created = normalizeContractor({ ...res.user, contractors: [res.contractor] });
          memoryStore.contractors.push(created);
          return created;
        }
      } catch (err) {
        try {
          const { data, error } = await activeClient().from('contractors').insert([newContractor]).select().single();
          if (!error && data) {
            memoryStore.contractors.push(data);
            return data;
          }
        } catch (e) {}
        console.warn('Supabase contractor insert fallback:', err.message);
      }
    }

    memoryStore.contractors.push(newContractor);
    return newContractor;
  },

  async updateContractor(id, updateData) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        const { data, error } = await activeClient().from('contractors').update({ ...updateData, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (!error && data) {
          const idx = memoryStore.contractors.findIndex(c => c.id === id);
          if (idx !== -1) memoryStore.contractors[idx] = data;
          return data;
        }
      } catch (err) {}
    }

    const contractor = memoryStore.contractors.find(c => c.id === id);
    if (!contractor) return null;
    Object.assign(contractor, updateData, { updated_at: new Date().toISOString() });
    return contractor;
  },

  // Jobs
  async getAllJobs(filters = {}) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        let query = activeClient().from('jobs').select('*');
        if (filters.category && filters.category !== 'All') {
          query = query.ilike('category', `%${filters.category}%`);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.minWage) {
          query = query.gte('daily_wage', Number(filters.minWage));
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase getAllJobs fallback:', err.message);
      }
    }

    let jobs = [...memoryStore.jobs];
    if (filters.category && filters.category !== 'All') {
      jobs = jobs.filter(j => j.category.toLowerCase().includes(filters.category.toLowerCase()));
    }
    if (filters.status) {
      jobs = jobs.filter(j => j.status === filters.status);
    }
    if (filters.minWage) {
      jobs = jobs.filter(j => Number(j.daily_wage) >= Number(filters.minWage));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      jobs = jobs.filter(j =>
        j.title.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q) ||
        (j.contractor_name && j.contractor_name.toLowerCase().includes(q))
      );
    }
    return jobs;
  },

  async getJobById(id) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        const { data, error } = await activeClient().from('jobs').select('*').eq('id', id).single();
        if (!error && data) return data;
      } catch (err) {}
    }
    return memoryStore.jobs.find(j => j.id === id) || null;
  },

  async getJobsByContractor(contractorId) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        const jobs = await KaamSetuDB.getContractorJobs(contractorId);
        if (jobs) return jobs;
      } catch (err) {
        try {
          const { data, error } = await activeClient().from('jobs').select('*').eq('contractor_id', contractorId).order('created_at', { ascending: false });
          if (!error && data) return data;
        } catch (e) {}
      }
    }
    return memoryStore.jobs.filter(j => j.contractor_id === contractorId);
  },

  async createJob(jobData) {
    const newJob = {
      id: jobData.id || `job-${Date.now()}`,
      status: jobData.status || 'Open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...jobData
    };

    if (isSupabaseConfigured && activeClient()) {
      try {
        const dbJob = await KaamSetuDB.createJob({
          contractor_id: jobData.contractor_id,
          title: jobData.title,
          category: jobData.category,
          location: jobData.location,
          workers_required: jobData.workers_needed || jobData.workers_required || 1,
          wage: jobData.daily_wage,
          start_date: jobData.start_date,
          end_date: jobData.end_date,
          description: jobData.description
        });
        if (dbJob) {
          memoryStore.jobs.unshift(dbJob);
          return dbJob;
        }
      } catch (err) {
        try {
          const { data, error } = await activeClient().from('jobs').insert([newJob]).select().single();
          if (!error && data) {
            memoryStore.jobs.unshift(data);
            return data;
          }
        } catch (e) {}
        console.warn('Supabase job insert fallback:', err.message);
      }
    }

    memoryStore.jobs.unshift(newJob);
    return newJob;
  },

  async updateJob(id, updateData) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        const { data, error } = await activeClient().from('jobs').update({ ...updateData, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (!error && data) {
          const idx = memoryStore.jobs.findIndex(j => j.id === id);
          if (idx !== -1) memoryStore.jobs[idx] = data;
          return data;
        }
      } catch (err) {}
    }

    const job = memoryStore.jobs.find(j => j.id === id);
    if (!job) return null;
    Object.assign(job, updateData, { updated_at: new Date().toISOString() });
    return job;
  },

  // Assignments
  async getAssignmentsByWorker(workerId) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        const assignments = await KaamSetuDB.getWorkerAssignments(workerId);
        if (assignments) return assignments;
      } catch (err) {
        try {
          const { data, error } = await activeClient().from('job_assignments').select('*').eq('worker_id', workerId).order('assigned_at', { ascending: false });
          if (!error && data) return data;
        } catch (e) {}
      }
    }
    return memoryStore.assignments.filter(a => a.worker_id === workerId);
  },

  async getAssignmentsByContractor(contractorId) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        const { data, error } = await activeClient().from('job_assignments').select('*').eq('contractor_id', contractorId);
        if (!error && data) return data;
        const { data: d2, error: e2 } = await activeClient().from('assignments').select('*').eq('contractor_id', contractorId);
        if (!e2 && d2) return d2;
      } catch (err) {}
    }
    return memoryStore.assignments.filter(a => a.contractor_id === contractorId);
  },

  async getAssignmentsByJob(jobId) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        const { data, error } = await activeClient().from('job_assignments').select('*').eq('job_id', jobId);
        if (!error && data) return data;
        const { data: d2, error: e2 } = await activeClient().from('assignments').select('*').eq('job_id', jobId);
        if (!e2 && d2) return d2;
      } catch (err) {}
    }
    return memoryStore.assignments.filter(a => a.job_id === jobId);
  },

  async findAssignment(jobId, workerId) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        const { data, error } = await activeClient().from('job_assignments').select('*').eq('job_id', jobId).eq('worker_id', workerId).maybeSingle();
        if (!error && data) return data;
        const { data: d2, error: e2 } = await activeClient().from('assignments').select('*').eq('job_id', jobId).eq('worker_id', workerId).maybeSingle();
        if (!e2 && d2) return d2;
      } catch (err) {}
    }
    return memoryStore.assignments.find(a => a.job_id === jobId && a.worker_id === workerId) || null;
  },

  async findAssignmentById(id) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        const { data, error } = await activeClient().from('job_assignments').select('*').eq('id', id).single();
        if (!error && data) return data;
        const { data: d2, error: e2 } = await activeClient().from('assignments').select('*').eq('id', id).single();
        if (!e2 && d2) return d2;
      } catch (err) {}
    }
    return memoryStore.assignments.find(a => a.id === id) || null;
  },

  async createAssignment(assignmentData) {
    const newAssignment = {
      id: assignmentData.id || `app-${Date.now()}`,
      assignment_status: assignmentData.assignment_status || 'Assigned',
      work_status: assignmentData.work_status || 'Assigned',
      applied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...assignmentData
    };

    if (isSupabaseConfigured && activeClient()) {
      try {
        const res = await KaamSetuDB.assignWorkerToJob({
          job_id: assignmentData.job_id,
          worker_id: assignmentData.worker_id,
          contractor_id: assignmentData.contractor_id,
          agreed_wage: assignmentData.agreed_wage
        });
        if (res) {
          memoryStore.assignments.unshift(res);
          return res;
        }
      } catch (err) {
        try {
          const { data, error } = await activeClient().from('job_assignments').insert([newAssignment]).select().single();
          if (!error && data) {
            memoryStore.assignments.unshift(data);
            return data;
          }
        } catch (e) {}
        console.warn('Supabase assignment insert fallback:', err.message);
      }
    }

    memoryStore.assignments.unshift(newAssignment);
    return newAssignment;
  },

  async updateAssignment(id, updateData) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        if (updateData.work_status) {
          const updated = await KaamSetuDB.updateWorkProgress(id, updateData.work_status);
          if (updated) {
            const idx = memoryStore.assignments.findIndex(a => a.id === id);
            if (idx !== -1) memoryStore.assignments[idx] = updated;
            return updated;
          }
        } else if (updateData.assignment_status) {
          const updated = await KaamSetuDB.respondToAssignment(id, updateData.assignment_status);
          if (updated) {
            const idx = memoryStore.assignments.findIndex(a => a.id === id);
            if (idx !== -1) memoryStore.assignments[idx] = updated;
            return updated;
          }
        }
      } catch (err) {
        try {
          const { data, error } = await activeClient().from('job_assignments').update({ ...updateData, updated_at: new Date().toISOString() }).eq('id', id).select().single();
          if (!error && data) {
            const idx = memoryStore.assignments.findIndex(a => a.id === id);
            if (idx !== -1) memoryStore.assignments[idx] = data;
            return data;
          }
        } catch (e) {}
      }
    }

    const assignment = memoryStore.assignments.find(a => a.id === id);
    if (!assignment) return null;
    Object.assign(assignment, updateData, { updated_at: new Date().toISOString() });
    return assignment;
  },

  // Payments
  async getPaymentsByWorker(workerId) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        const payments = await KaamSetuDB.getWorkerPayments(workerId);
        if (payments) return payments;
      } catch (err) {
        try {
          const { data, error } = await activeClient().from('payments').select('*').eq('worker_id', workerId).order('created_at', { ascending: false });
          if (!error && data) return data;
        } catch (e) {}
      }
    }
    return memoryStore.payments.filter(p => p.worker_id === workerId);
  },

  async getPaymentsByContractor(contractorId) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        const payments = await KaamSetuDB.getPendingPayments(contractorId);
        if (payments) return payments;
      } catch (err) {
        try {
          const { data, error } = await activeClient().from('payments').select('*').eq('contractor_id', contractorId).order('created_at', { ascending: false });
          if (!error && data) return data;
        } catch (e) {}
      }
    }
    return memoryStore.payments.filter(p => p.contractor_id === contractorId);
  },

  async findPaymentById(id) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        const { data, error } = await activeClient().from('payments').select('*').eq('id', id).single();
        if (!error && data) return data;
      } catch (err) {}
    }
    return memoryStore.payments.find(p => p.id === id) || null;
  },

  async createPayment(paymentData) {
    const newPayment = {
      id: paymentData.id || `pay-${Date.now()}`,
      payment_status: paymentData.payment_status || 'Pending',
      payment_date: paymentData.payment_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...paymentData
    };

    if (isSupabaseConfigured && activeClient()) {
      try {
        const { data, error } = await activeClient().from('payments').insert([newPayment]).select().single();
        if (!error && data) {
          memoryStore.payments.unshift(data);
          return data;
        }
      } catch (err) {
        console.warn('Supabase payment insert fallback:', err.message);
      }
    }

    memoryStore.payments.unshift(newPayment);
    return newPayment;
  },

  async updatePayment(id, updateData) {
    if (isSupabaseConfigured && activeClient()) {
      try {
        if (updateData.payment_status === 'Paid') {
          const updated = await KaamSetuDB.markPaymentPaid(id);
          if (updated) {
            const idx = memoryStore.payments.findIndex(p => p.id === id);
            if (idx !== -1) memoryStore.payments[idx] = updated;
            return updated;
          }
        }
        const { data, error } = await activeClient().from('payments').update({ ...updateData, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (!error && data) {
          const idx = memoryStore.payments.findIndex(p => p.id === id);
          if (idx !== -1) memoryStore.payments[idx] = data;
          return data;
        }
      } catch (err) {}
    }

    const payment = memoryStore.payments.find(p => p.id === id);
    if (!payment) return null;
    Object.assign(payment, updateData, { updated_at: new Date().toISOString() });
    return payment;
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection,
  db
};
