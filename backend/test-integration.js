/**
 * KaamSetu - Complete End-to-End Business Flow Integration Test Suite
 * Member 4: Integration & Testing Engineer
 * 
 * Verifies complete flow:
 * Contractor -> Job -> Worker -> Assignment -> Work -> Payment
 * 
 * Includes realistic scenario:
 * Contractor: "Ramesh Contractor" (or "Vikram Contractor")
 * Job: "Construction Site - Pune"
 * Worker: "Worker 001"
 * Assignment: Worker 001 -> Construction Site - Pune
 * Work: 1 day completed (work_status -> Completed)
 * Payment: ₹800 (payment_status -> Paid)
 */

const assert = require('assert');
const app = require('./server');

let server;
const PORT = 5055;
const BASE_URL = `http://localhost:${PORT}/api`;

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

async function runIntegrationTests() {
  console.log('\n======================================================');
  console.log('🧪 Starting KaamSetu End-to-End Integration Test Suite');
  console.log('======================================================\n');

  // Start HTTP server on port 5055
  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });

  try {
    // 1. Health Check
    console.log('1️⃣  Testing API Health Endpoint...');
    const health = await request('/health');
    assert.strictEqual(health.status, 200, 'Health endpoint should return 200');
    assert.strictEqual(health.data.status, 'online');
    console.log('   ✓ Health check passed:', health.data.app);

    // 2. Register Contractor: "Ramesh Contractor"
    console.log('\n2️⃣  Testing Contractor Registration & Login...');
    const contractorPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const contractorReg = await request('/auth/register/contractor', {
      method: 'POST',
      body: JSON.stringify({
        companyName: 'Apex Construction Pune',
        contactPerson: 'Ramesh Contractor',
        phone: contractorPhone,
        email: `ramesh.${Date.now()}@apexconst.com`,
        businessType: 'General Building Contractor',
        location: 'Pune, MH',
        password: 'password123'
      })
    });
    assert.strictEqual(contractorReg.status, 201, 'Contractor registration should return 201');
    const contractorToken = contractorReg.data.token;
    const contractorId = contractorReg.data.user.id;
    assert.ok(contractorToken, 'Contractor token should be present');
    console.log('   ✓ Contractor registered successfully:', contractorReg.data.user.company_name || contractorReg.data.user.name);

    // Contractor Login
    const contractorLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: contractorPhone,
        password: 'password123',
        role: 'contractor'
      })
    });
    assert.strictEqual(contractorLogin.status, 200, 'Contractor login should return 200');
    console.log('   ✓ Contractor login verified');

    // 3. Register Worker: "Worker 001"
    console.log('\n3️⃣  Testing Worker Registration & Login...');
    const workerPhone = `97${Math.floor(10000000 + Math.random() * 90000000)}`;
    const workerReg = await request('/auth/register/worker', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Worker 001',
        phone: workerPhone,
        trade: 'Masonry',
        dailyWage: 800,
        experience: '3-5 Years',
        location: 'Pune, MH',
        preferredLang: 'Hindi',
        aadharVerified: true,
        password: 'password123'
      })
    });
    assert.strictEqual(workerReg.status, 201, 'Worker registration should return 201');
    const workerToken = workerReg.data.token;
    const workerId = workerReg.data.user.id;
    assert.ok(workerToken, 'Worker token should be present');
    console.log('   ✓ Worker registered successfully:', workerReg.data.user.name);

    // Worker Login
    const workerLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: workerPhone,
        password: 'password123',
        role: 'worker'
      })
    });
    assert.strictEqual(workerLogin.status, 200, 'Worker login should return 200');
    console.log('   ✓ Worker login verified');

    // 4. Contractor Creates Job: "Construction Site - Pune"
    console.log('\n4️⃣  Testing Job Posting Creation...');
    const createJobRes = await request('/jobs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${contractorToken}` },
      body: JSON.stringify({
        title: 'Construction Site - Pune',
        category: 'Masonry',
        workersNeeded: 3,
        dailyWage: 800,
        duration: '1 Day',
        startDate: 'Tomorrow, 8:00 AM',
        location: 'Pune, MH',
        description: 'Urgent bricklaying and concrete work required for new Pune site.',
        urgent: true
      })
    });
    assert.strictEqual(createJobRes.status, 201, 'Job creation should return 201');
    const jobId = createJobRes.data.job.id;
    assert.ok(jobId, 'Created job should have valid ID');
    console.log('   ✓ Job posted successfully: ID', jobId, '-', createJobRes.data.job.title);

    // 5. Worker Browses Jobs & Views Details
    console.log('\n5️⃣  Testing Job Feed & Details...');
    const jobsFeed = await request('/jobs?category=Masonry');
    assert.strictEqual(jobsFeed.status, 200);
    assert.ok(jobsFeed.data.jobs.some(j => j.id === jobId), 'Job should appear in public search feed');

    const jobDetail = await request(`/jobs/${jobId}`);
    assert.strictEqual(jobDetail.status, 200);
    assert.strictEqual(jobDetail.data.job.title, 'Construction Site - Pune');
    console.log('   ✓ Worker retrieved job details cleanly');

    // 6. Worker Applies for Job / Contractor Assigns
    console.log('\n6️⃣  Testing Worker Application & Job Assignment...');
    const applyRes = await request(`/jobs/${jobId}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${workerToken}` }
    });
    assert.strictEqual(applyRes.status, 201, 'Application submission should return 201');
    const assignmentId = applyRes.data.assignment.id;
    assert.ok(assignmentId, 'Assignment should have valid ID');
    console.log('   ✓ Worker applied for job: Assignment ID', assignmentId);

    // Test Duplicate Application Rejection
    const dupApply = await request(`/jobs/${jobId}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${workerToken}` }
    });
    assert.strictEqual(dupApply.status, 400, 'Duplicate application should be rejected with 400');
    console.log('   ✓ Data Integrity: Duplicate application rejected correctly');

    // 7. Contractor Views Applicants & Accepts Assignment
    console.log('\n7️⃣  Testing Contractor Review & Assignment Acceptance...');
    const contractorApps = await request('/contractors/assignments', {
      headers: { Authorization: `Bearer ${contractorToken}` }
    });
    assert.strictEqual(contractorApps.status, 200);
    assert.ok(contractorApps.data.assignments.some(a => a.id === assignmentId), 'Assignment should be visible to contractor');

    const acceptRes = await request(`/contractors/assignments/${assignmentId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${contractorToken}` },
      body: JSON.stringify({ status: 'Accepted' })
    });
    assert.strictEqual(acceptRes.status, 200);
    assert.strictEqual(acceptRes.data.assignment.assignment_status, 'Accepted');
    console.log('   ✓ Contractor accepted assignment: Status updated to Accepted');

    // 8. Work Execution & Completion (1 Day Completed)
    console.log('\n8️⃣  Testing Work Execution & Completion...');
    const inProgressRes = await request(`/workers/assignments/${assignmentId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${workerToken}` },
      body: JSON.stringify({ workStatus: 'In Progress' })
    });
    assert.strictEqual(inProgressRes.status, 200);
    assert.strictEqual(inProgressRes.data.assignment.work_status, 'In Progress');

    const completeRes = await request(`/workers/assignments/${assignmentId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${workerToken}` },
      body: JSON.stringify({ workStatus: 'Completed' })
    });
    assert.strictEqual(completeRes.status, 200);
    assert.strictEqual(completeRes.data.assignment.work_status, 'Completed');
    console.log('   ✓ Work completed (1 day completed). Work status updated to Completed');

    // 9. Payment Record Verification & Marking Paid (₹800)
    console.log('\n9️⃣  Testing Payment Record & Settlement...');
    const workerPayments = await request('/workers/payments', {
      headers: { Authorization: `Bearer ${workerToken}` }
    });
    assert.strictEqual(workerPayments.status, 200);
    const payment = workerPayments.data.payments.find(p => p.assignment_id === assignmentId || p.worker_id === workerId);
    assert.ok(payment, 'Pending payment record should exist upon work completion');
    assert.strictEqual(Number(payment.amount), 800, 'Payment amount should be ₹800');
    assert.strictEqual(payment.payment_status, 'Pending', 'Initial payment status should be Pending');
    console.log('   ✓ Payment record created: Amount ₹800, Status: Pending');

    // Contractor marks Payment as Paid
    const markPaidRes = await request(`/contractors/payments/${payment.id}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${contractorToken}` },
      body: JSON.stringify({ status: 'Paid', notes: 'Daily wage paid via UPI' })
    });
    assert.strictEqual(markPaidRes.status, 200);
    assert.strictEqual(markPaidRes.data.payment.payment_status, 'Paid');
    console.log('   ✓ Contractor marked payment as Paid. Payment status: Paid');

    // 10. Worker Wages Summary Verification
    console.log('\n🔟 Testing Final Worker Wages Summary...');
    const wagesSummary = await request('/workers/wages', {
      headers: { Authorization: `Bearer ${workerToken}` }
    });
    assert.strictEqual(wagesSummary.status, 200);
    assert.ok(wagesSummary.data.summary.totalEarned >= 800, 'Worker total earned should include ₹800');
    console.log('   ✓ Worker wage summary verified: Total Earned ₹', wagesSummary.data.summary.totalEarned);

    // 11. Security & Edge Case Error Handling Checks
    console.log('\n1️⃣1️⃣ Testing Security & Edge Case Validations...');
    
    // Invalid Password
    const badLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: workerPhone, password: 'wrongpassword', role: 'worker' })
    });
    assert.strictEqual(badLogin.status, 401, 'Invalid password should return 401');

    // Nonexistent Job Details
    const badJob = await request('/jobs/job-non-existent-999');
    assert.strictEqual(badJob.status, 404, 'Nonexistent job should return 404');

    // Unauthorized Action
    const unauthApply = await request('/jobs/job-101/apply', { method: 'POST' });
    assert.strictEqual(unauthApply.status, 401, 'Unauthenticated request should return 401');

    console.log('   ✓ Security & error handling checks passed');

    console.log('\n======================================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! (11/11)');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
  }
}

if (require.main === module) {
  runIntegrationTests();
}

module.exports = { runIntegrationTests };
