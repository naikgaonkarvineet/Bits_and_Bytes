/**
 * Automated Test Suite for KaamSetu Backend APIs
 * Tests all required endpoints, role-based security, and data flow.
 */

const http = require('http');
process.env.NODE_ENV = 'test';
process.env.PORT = 5001;

const app = require('./server');

let server;
const PORT = 5001;
const BASE_URL = `http://localhost:${PORT}/api`;

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  server = app.listen(PORT);
  console.log(`\n==================================================`);
  console.log(`🧪 Running KaamSetu API Automated Test Suite`);
  console.log(`==================================================\n`);

  let workerToken = '';
  let contractorToken = '';
  let testJobId = '';
  let testAssignmentId = '';
  let testPaymentId = '';

  try {
    // 1. Health Check
    console.log('1. Health Check API');
    const health = await request('GET', '/health');
    assert(health.status === 200 && health.body.status === 'online', 'Server health check returns online');

    // 2. Worker Registration
    console.log('\n2. Worker Registration API');
    const workerReg = await request('POST', '/auth/register/worker', {
      name: 'Sunil Mistri',
      phone: '9812345678',
      trade: 'Masonry',
      dailyWage: 900,
      experience: '5-10 Years',
      location: 'Noida Sector 62',
      password: 'mypassword123'
    });
    assert(workerReg.status === 201, 'Worker registered with HTTP 201');
    assert(workerReg.body.token, 'Registration returns JWT token');
    assert(!workerReg.body.user.password_hash, 'Response does NOT leak password_hash');
    workerToken = workerReg.body.token;

    // 3. Contractor Registration
    console.log('\n3. Contractor Registration API');
    const contractorReg = await request('POST', '/auth/register/contractor', {
      companyName: 'Shiva Buildcon Pvt Ltd',
      contactPerson: 'Shivam Sharma',
      phone: '9899887766',
      email: 'shivam@shivabuildcon.com',
      businessType: 'General Civil Contractor',
      location: 'Greater Noida',
      password: 'contractorpass'
    });
    assert(contractorReg.status === 201, 'Contractor registered with HTTP 201');
    assert(contractorReg.body.token, 'Registration returns JWT token');
    assert(!contractorReg.body.user.password_hash, 'Response does NOT leak password_hash');
    contractorToken = contractorReg.body.token;

    // 4. Authentication / Login (with bcrypt verify)
    console.log('\n4. Login APIs');
    const workerLogin = await request('POST', '/auth/login', {
      identifier: '9812345678',
      password: 'mypassword123',
      role: 'worker'
    });
    assert(workerLogin.status === 200, 'Worker login with valid credentials succeeds');

    const wrongLogin = await request('POST', '/auth/login', {
      identifier: '9812345678',
      password: 'wrongpassword',
      role: 'worker'
    });
    assert(wrongLogin.status === 401, 'Worker login with invalid password rejected (401)');

    const contractorLogin = await request('POST', '/auth/login', {
      identifier: '9899887766',
      password: 'contractorpass',
      role: 'contractor'
    });
    assert(contractorLogin.status === 200, 'Contractor login succeeds');

    // 5. Profile APIs
    console.log('\n5. Profile APIs');
    const workerProfile = await request('GET', '/workers/profile', null, workerToken);
    assert(workerProfile.status === 200 && workerProfile.body.worker.name === 'Sunil Mistri', 'Worker fetches own profile');

    const updateProfile = await request('PUT', '/workers/profile', { dailyWage: 950 }, workerToken);
    assert(updateProfile.status === 200 && updateProfile.body.worker.daily_wage === 950, 'Worker updates profile');

    const contractorProfile = await request('GET', '/contractors/profile', null, contractorToken);
    assert(contractorProfile.status === 200 && contractorProfile.body.contractor.contact_person === 'Shivam Sharma', 'Contractor fetches own profile');

    // 6. Job Posting (Contractor only)
    console.log('\n6. Job APIs');
    const jobPost = await request('POST', '/jobs', {
      title: 'Plaster Work for 2-Storey House',
      category: 'Masonry',
      workersNeeded: 2,
      dailyWage: 950,
      duration: '3 Days',
      startDate: 'Tomorrow 9 AM',
      location: 'Alpha 1, Greater Noida',
      description: 'Need skilled masons for smooth wall plastering.',
      urgent: true
    }, contractorToken);
    assert(jobPost.status === 201, 'Contractor creates a new job');
    testJobId = jobPost.body.job.id;

    // Security check: Worker should NOT be able to post jobs
    const workerPostJob = await request('POST', '/jobs', {
      title: 'Unauthorized Job',
      category: 'Masonry',
      dailyWage: 800,
      location: 'Noida'
    }, workerToken);
    assert(workerPostJob.status === 403, 'Worker forbidden from posting jobs (403)');

    // 7. Job Feed & Filters (Public)
    console.log('\n7. Job Browsing & Filters');
    const allJobs = await request('GET', '/jobs');
    assert(allJobs.status === 200 && allJobs.body.jobs.length > 0, 'Public can fetch all jobs');

    const filteredJobs = await request('GET', '/jobs?category=Masonry');
    assert(filteredJobs.status === 200 && filteredJobs.body.jobs.every(j => j.category.toLowerCase().includes('masonry')), 'Query filter by category works');

    const singleJob = await request('GET', `/jobs/${testJobId}`);
    assert(singleJob.status === 200 && singleJob.body.job.title === 'Plaster Work for 2-Storey House', 'Fetch job by ID');

    // 8. Worker Applies for Job
    console.log('\n8. Worker Job Application');
    const apply = await request('POST', `/jobs/${testJobId}/apply`, null, workerToken);
    assert(apply.status === 201, 'Worker applies for job successfully');
    testAssignmentId = apply.body.assignment.id;

    // Worker checks assigned jobs
    const workerJobs = await request('GET', '/workers/assigned-jobs', null, workerToken);
    assert(workerJobs.status === 200 && workerJobs.body.assignments.length > 0, 'Worker sees assigned/applied jobs');

    // 9. Contractor Manages Worker Applications
    console.log('\n9. Contractor Worker Management');
    const contractorApps = await request('GET', '/contractors/assignments', null, contractorToken);
    assert(contractorApps.status === 200 && contractorApps.body.assignments.some(a => a.id === testAssignmentId), 'Contractor sees worker application');

    // Contractor accepts & hires worker
    const acceptWorker = await request('PUT', `/contractors/assignments/${testAssignmentId}/status`, {
      status: 'Accepted'
    }, contractorToken);
    assert(acceptWorker.status === 200 && acceptWorker.body.assignment.assignment_status === 'Accepted', 'Contractor accepts & hires worker');

    // 10. Work Status Transitions
    console.log('\n10. Work Status Transitions');
    const startWork = await request('PUT', `/workers/assignments/${testAssignmentId}/status`, {
      workStatus: 'In Progress'
    }, workerToken);
    assert(startWork.status === 200 && startWork.body.assignment.work_status === 'In Progress', 'Worker marks work In Progress');

    const completeWork = await request('PUT', `/workers/assignments/${testAssignmentId}/status`, {
      workStatus: 'Completed'
    }, workerToken);
    assert(completeWork.status === 200 && completeWork.body.assignment.work_status === 'Completed', 'Worker marks work Completed');

    const history = await request('GET', '/workers/work-history', null, workerToken);
    assert(history.status === 200 && history.body.history.length > 0, 'Worker work history includes completed job');

    // 11. Payments & Wage Recording
    console.log('\n11. Wage & Payment Status');
    const workerPayments = await request('GET', '/workers/payments', null, workerToken);
    assert(workerPayments.status === 200 && workerPayments.body.payments.length > 0, 'Worker sees generated payment record');
    testPaymentId = workerPayments.body.payments[0].id;
    assert(workerPayments.body.payments[0].payment_status === 'Pending', 'Payment status is initially Pending');

    // Contractor updates payment to Paid
    const markPaid = await request('PUT', `/contractors/payments/${testPaymentId}/status`, {
      status: 'Paid',
      notes: 'Paid in cash at end of day'
    }, contractorToken);
    assert(markPaid.status === 200 && markPaid.body.payment.payment_status === 'Paid', 'Contractor marks payment as Paid');

    // Worker wage summary check
    const wages = await request('GET', '/workers/wages', null, workerToken);
    assert(wages.status === 200 && wages.body.summary.totalEarned > 0, 'Worker wage summary reflects paid earnings');

    console.log(`\n==================================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`==================================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    server.close();
  }
}

runTests();
