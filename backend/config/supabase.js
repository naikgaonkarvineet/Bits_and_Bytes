const { createClient } = require('@supabase/supabase-js');
const {
  SEED_WORKERS,
  SEED_CONTRACTORS,
  SEED_JOBS,
  SEED_ASSIGNMENTS,
  SEED_PAYMENTS
} = require('./seedData');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('your-project')
);

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('✓ Connected to Supabase at:', supabaseUrl);
  } catch (err) {
    console.warn('⚠️ Could not initialize Supabase client:', err.message);
  }
} else {
  console.log('ℹ️ Supabase credentials not set in .env. Operating in high-speed local in-memory database mode with seed data.');
}

// In-Memory Database Store
const memoryStore = {
  workers: JSON.parse(JSON.stringify(SEED_WORKERS)),
  contractors: JSON.parse(JSON.stringify(SEED_CONTRACTORS)),
  jobs: JSON.parse(JSON.stringify(SEED_JOBS)),
  assignments: JSON.parse(JSON.stringify(SEED_ASSIGNMENTS)),
  payments: JSON.parse(JSON.stringify(SEED_PAYMENTS))
};

// Unified Data Access Helper
const db = {
  // Workers
  async findWorkerByPhone(phone) {
    if (supabase) {
      const { data, error } = await supabase.from('workers').select('*').eq('phone', phone).single();
      if (!error && data) return data;
    }
    return memoryStore.workers.find(w => w.phone === phone) || null;
  },

  async findWorkerById(id) {
    if (supabase) {
      const { data, error } = await supabase.from('workers').select('*').eq('id', id).single();
      if (!error && data) return data;
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

    if (supabase) {
      const { data, error } = await supabase.from('workers').insert([newWorker]).select().single();
      if (!error && data) {
        memoryStore.workers.push(data);
        return data;
      }
      console.warn('Supabase worker insert fallback:', error?.message);
    }

    memoryStore.workers.push(newWorker);
    return newWorker;
  },

  async updateWorker(id, updateData) {
    if (supabase) {
      const { data, error } = await supabase.from('workers').update({ ...updateData, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (!error && data) {
        const idx = memoryStore.workers.findIndex(w => w.id === id);
        if (idx !== -1) memoryStore.workers[idx] = data;
        return data;
      }
    }

    const worker = memoryStore.workers.find(w => w.id === id);
    if (!worker) return null;
    Object.assign(worker, updateData, { updated_at: new Date().toISOString() });
    return worker;
  },

  // Contractors
  async findContractorByIdentifier(identifier) {
    if (supabase) {
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .or(`phone.eq.${identifier},email.eq.${identifier}`)
        .limit(1);
      if (!error && data && data.length > 0) return data[0];
    }
    return memoryStore.contractors.find(c => c.phone === identifier || c.email === identifier) || null;
  },

  async findContractorById(id) {
    if (supabase) {
      const { data, error } = await supabase.from('contractors').select('*').eq('id', id).single();
      if (!error && data) return data;
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

    if (supabase) {
      const { data, error } = await supabase.from('contractors').insert([newContractor]).select().single();
      if (!error && data) {
        memoryStore.contractors.push(data);
        return data;
      }
      console.warn('Supabase contractor insert fallback:', error?.message);
    }

    memoryStore.contractors.push(newContractor);
    return newContractor;
  },

  async updateContractor(id, updateData) {
    if (supabase) {
      const { data, error } = await supabase.from('contractors').update({ ...updateData, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (!error && data) {
        const idx = memoryStore.contractors.findIndex(c => c.id === id);
        if (idx !== -1) memoryStore.contractors[idx] = data;
        return data;
      }
    }

    const contractor = memoryStore.contractors.find(c => c.id === id);
    if (!contractor) return null;
    Object.assign(contractor, updateData, { updated_at: new Date().toISOString() });
    return contractor;
  },

  // Jobs
  async getAllJobs(filters = {}) {
    if (supabase) {
      let query = supabase.from('jobs').select('*');
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
    if (supabase) {
      const { data, error } = await supabase.from('jobs').select('*').eq('id', id).single();
      if (!error && data) return data;
    }
    return memoryStore.jobs.find(j => j.id === id) || null;
  },

  async getJobsByContractor(contractorId) {
    if (supabase) {
      const { data, error } = await supabase.from('jobs').select('*').eq('contractor_id', contractorId).order('created_at', { ascending: false });
      if (!error && data) return data;
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

    if (supabase) {
      const { data, error } = await supabase.from('jobs').insert([newJob]).select().single();
      if (!error && data) {
        memoryStore.jobs.unshift(data);
        return data;
      }
      console.warn('Supabase job insert fallback:', error?.message);
    }

    memoryStore.jobs.unshift(newJob);
    return newJob;
  },

  async updateJob(id, updateData) {
    if (supabase) {
      const { data, error } = await supabase.from('jobs').update({ ...updateData, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (!error && data) {
        const idx = memoryStore.jobs.findIndex(j => j.id === id);
        if (idx !== -1) memoryStore.jobs[idx] = data;
        return data;
      }
    }

    const job = memoryStore.jobs.find(j => j.id === id);
    if (!job) return null;
    Object.assign(job, updateData, { updated_at: new Date().toISOString() });
    return job;
  },

  // Assignments
  async getAssignmentsByWorker(workerId) {
    if (supabase) {
      const { data, error } = await supabase.from('assignments').select('*').eq('worker_id', workerId).order('applied_at', { ascending: false });
      if (!error && data) return data;
    }
    return memoryStore.assignments.filter(a => a.worker_id === workerId);
  },

  async getAssignmentsByContractor(contractorId) {
    if (supabase) {
      const { data, error } = await supabase.from('assignments').select('*').eq('contractor_id', contractorId).order('applied_at', { ascending: false });
      if (!error && data) return data;
    }
    return memoryStore.assignments.filter(a => a.contractor_id === contractorId);
  },

  async getAssignmentsByJob(jobId) {
    if (supabase) {
      const { data, error } = await supabase.from('assignments').select('*').eq('job_id', jobId);
      if (!error && data) return data;
    }
    return memoryStore.assignments.filter(a => a.job_id === jobId);
  },

  async findAssignment(jobId, workerId) {
    if (supabase) {
      const { data, error } = await supabase.from('assignments').select('*').eq('job_id', jobId).eq('worker_id', workerId).maybeSingle();
      if (!error && data) return data;
    }
    return memoryStore.assignments.find(a => a.job_id === jobId && a.worker_id === workerId) || null;
  },

  async findAssignmentById(id) {
    if (supabase) {
      const { data, error } = await supabase.from('assignments').select('*').eq('id', id).single();
      if (!error && data) return data;
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

    if (supabase) {
      const { data, error } = await supabase.from('assignments').insert([newAssignment]).select().single();
      if (!error && data) {
        memoryStore.assignments.unshift(data);
        return data;
      }
      console.warn('Supabase assignment insert fallback:', error?.message);
    }

    memoryStore.assignments.unshift(newAssignment);
    return newAssignment;
  },

  async updateAssignment(id, updateData) {
    if (supabase) {
      const { data, error } = await supabase.from('assignments').update({ ...updateData, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (!error && data) {
        const idx = memoryStore.assignments.findIndex(a => a.id === id);
        if (idx !== -1) memoryStore.assignments[idx] = data;
        return data;
      }
    }

    const assignment = memoryStore.assignments.find(a => a.id === id);
    if (!assignment) return null;
    Object.assign(assignment, updateData, { updated_at: new Date().toISOString() });
    return assignment;
  },

  // Payments
  async getPaymentsByWorker(workerId) {
    if (supabase) {
      const { data, error } = await supabase.from('payments').select('*').eq('worker_id', workerId).order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return memoryStore.payments.filter(p => p.worker_id === workerId);
  },

  async getPaymentsByContractor(contractorId) {
    if (supabase) {
      const { data, error } = await supabase.from('payments').select('*').eq('contractor_id', contractorId).order('created_at', { ascending: false });
      if (!error && data) return data;
    }
    return memoryStore.payments.filter(p => p.contractor_id === contractorId);
  },

  async findPaymentById(id) {
    if (supabase) {
      const { data, error } = await supabase.from('payments').select('*').eq('id', id).single();
      if (!error && data) return data;
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

    if (supabase) {
      const { data, error } = await supabase.from('payments').insert([newPayment]).select().single();
      if (!error && data) {
        memoryStore.payments.unshift(data);
        return data;
      }
      console.warn('Supabase payment insert fallback:', error?.message);
    }

    memoryStore.payments.unshift(newPayment);
    return newPayment;
  },

  async updatePayment(id, updateData) {
    if (supabase) {
      const { data, error } = await supabase.from('payments').update({ ...updateData, updated_at: new Date().toISOString() }).eq('id', id).select().single();
      if (!error && data) {
        const idx = memoryStore.payments.findIndex(p => p.id === id);
        if (idx !== -1) memoryStore.payments[idx] = data;
        return data;
      }
    }

    const payment = memoryStore.payments.find(p => p.id === id);
    if (!payment) return null;
    Object.assign(payment, updateData, { updated_at: new Date().toISOString() });
    return payment;
  }
};

module.exports = {
  supabase,
  db
};
