/**
 * KaamSetu Frontend-Backend API Client Bridge
 * Member 4 - Integration Engineering
 */

const API_BASE = (typeof window !== 'undefined' && (window.location.port === '5000' || window.location.origin.includes(':5000')))
  ? '/api'
  : 'http://localhost:5000/api';

const KaamSetuAPI = {
  getToken() {
    return localStorage.getItem('kaamsetu_token') || '';
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('kaamsetu_token', token);
    } else {
      localStorage.removeItem('kaamsetu_token');
    }
  },

  getUser() {
    const raw = localStorage.getItem('kaamsetu_user');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return null;
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('kaamsetu_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('kaamsetu_user');
    }
  },

  logout() {
    localStorage.removeItem('kaamsetu_token');
    localStorage.removeItem('kaamsetu_user');
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));
      return { ok: response.ok, status: response.status, data };
    } catch (err) {
      console.warn(`[KaamSetu API] Network error calling ${endpoint}:`, err.message);
      return { ok: false, status: 0, error: err.message, data: null };
    }
  },

  // Auth
  async login(identifier, password, role) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, role })
    });
    if (res.ok && res.data && res.data.token) {
      this.setToken(res.data.token);
      if (res.data.user) {
        this.setUser(res.data.user);
      }
    }
    return res;
  },

  async registerWorker(workerData) {
    const res = await this.request('/auth/register/worker', {
      method: 'POST',
      body: JSON.stringify(workerData)
    });
    if (res.ok && res.data && res.data.token) {
      this.setToken(res.data.token);
      if (res.data.user) {
        this.setUser(res.data.user);
      }
    }
    return res;
  },

  async registerContractor(contractorData) {
    const res = await this.request('/auth/register/contractor', {
      method: 'POST',
      body: JSON.stringify(contractorData)
    });
    if (res.ok && res.data && res.data.token) {
      this.setToken(res.data.token);
      if (res.data.user) {
        this.setUser(res.data.user);
      }
    }
    return res;
  },

  async getMe() {
    const res = await this.request('/auth/me');
    if (res.ok && res.data && res.data.user) {
      this.setUser(res.data.user);
    }
    return res;
  },

  // Jobs
  async getJobs(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/jobs?${query}` : '/jobs';
    return await this.request(endpoint);
  },

  async getJobById(id) {
    return await this.request(`/jobs/${id}`);
  },

  async createJob(jobData) {
    return await this.request('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData)
    });
  },

  async applyForJob(jobId) {
    return await this.request(`/jobs/${jobId}/apply`, {
      method: 'POST'
    });
  },

  // Worker APIs
  async getWorkerAssignedJobs() {
    return await this.request('/workers/assigned-jobs');
  },

  async getWorkerHistory() {
    return await this.request('/workers/work-history');
  },

  async updateWorkerWorkStatus(assignmentId, workStatus) {
    return await this.request(`/workers/assignments/${assignmentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ workStatus })
    });
  },

  async getWorkerWages() {
    return await this.request('/workers/wages');
  },

  async getWorkerPayments() {
    return await this.request('/workers/payments');
  },

  // Contractor APIs
  async getContractorJobs() {
    return await this.request('/contractors/jobs');
  },

  async getContractorAssignments() {
    return await this.request('/contractors/assignments');
  },

  async assignWorker(jobId, workerId, agreedWage) {
    return await this.request('/contractors/assign', {
      method: 'POST',
      body: JSON.stringify({ jobId, workerId, agreedWage })
    });
  },

  async updateContractorAssignmentStatus(assignmentId, status) {
    return await this.request(`/contractors/assignments/${assignmentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  async updatePaymentStatus(paymentId, status, notes = '') {
    return await this.request(`/contractors/payments/${paymentId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes })
    });
  }
};

if (typeof window !== 'undefined') {
  window.KaamSetuAPI = KaamSetuAPI;
}

if (typeof module !== 'undefined') {
  module.exports = KaamSetuAPI;
}
