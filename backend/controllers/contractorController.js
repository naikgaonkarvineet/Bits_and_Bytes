const { db } = require('../config/supabase');

// GET /api/contractors/profile
async function getProfile(req, res, next) {
  try {
    const contractorId = req.user.id;
    const contractor = await db.findContractorById(contractorId);

    if (!contractor) {
      return res.status(404).json({ success: false, message: 'Contractor profile not found.' });
    }

    const sanitized = { ...contractor };
    delete sanitized.password_hash;

    res.status(200).json({ success: true, contractor: sanitized });
  } catch (err) {
    next(err);
  }
}

// PUT /api/contractors/profile
async function updateProfile(req, res, next) {
  try {
    const contractorId = req.user.id;
    const {
      companyName,
      contactPerson,
      email,
      businessType,
      location,
      gstId
    } = req.body;

    const updates = {};
    if (companyName) updates.company_name = companyName.trim();
    if (contactPerson) updates.contact_person = contactPerson.trim();
    if (email) updates.email = email.trim().toLowerCase();
    if (businessType) updates.business_type = businessType;
    if (location) updates.location = location;
    if (gstId !== undefined) updates.gst_id = gstId ? gstId.trim() : null;

    const updated = await db.updateContractor(contractorId, updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Contractor profile not found.' });
    }

    const sanitized = { ...updated };
    delete sanitized.password_hash;

    res.status(200).json({
      success: true,
      message: 'Contractor profile updated successfully!',
      contractor: sanitized
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/contractors/jobs
async function getContractorJobs(req, res, next) {
  try {
    const contractorId = req.user.id;
    const jobs = await db.getJobsByContractor(contractorId);

    res.status(200).json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/contractors/assignments (View Assigned Workers / Applicants)
async function getContractorAssignments(req, res, next) {
  try {
    const contractorId = req.user.id;
    const assignments = await db.getAssignmentsByContractor(contractorId);

    res.status(200).json({
      success: true,
      count: assignments.length,
      assignments
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/contractors/assign (Contractor assigns worker to a job)
async function assignWorker(req, res, next) {
  try {
    const contractorId = req.user.id;
    const { jobId, workerId, agreedWage } = req.body;

    if (!jobId || !workerId) {
      return res.status(400).json({
        success: false,
        message: 'jobId and workerId are required.'
      });
    }

    // Verify job belongs to this contractor
    const job = await db.getJobById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    if (job.contractor_id && job.contractor_id !== contractorId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to assign workers to another contractor’s job.'
      });
    }

    // Check worker existence
    const worker = await db.findWorkerById(workerId);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found.' });
    }

    const contractor = await db.findContractorById(contractorId);

    // Check if already assigned
    const existing = await db.findAssignment(jobId, workerId);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This worker is already assigned/applied for this job.',
        assignment: existing
      });
    }

    const wage = Number(agreedWage) || Number(job.daily_wage) || Number(worker.daily_wage) || 800;

    const assignment = await db.createAssignment({
      job_id: jobId,
      worker_id: workerId,
      contractor_id: contractorId,
      job_title: job.title,
      contractor_name: job.contractor_name || (contractor ? contractor.company_name : 'Contractor'),
      worker_name: worker.name,
      worker_trade: worker.trade,
      worker_phone: worker.phone,
      agreed_wage: wage,
      location: job.location,
      assignment_status: 'Assigned',
      work_status: 'Assigned'
    });

    res.status(201).json({
      success: true,
      message: `Worker ${worker.name} successfully assigned to job!`,
      assignment
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/contractors/assignments/:id/status (Contractor accepts/rejects worker application)
async function updateAssignmentStatus(req, res, next) {
  try {
    const contractorId = req.user.id;
    const assignmentId = req.params.id;
    const { status } = req.body;

    const validStatuses = ['Assigned', 'Accepted', 'Rejected', 'Completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid assignment status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const assignment = await db.findAssignmentById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment record not found.' });
    }

    if (assignment.contractor_id && assignment.contractor_id !== contractorId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You cannot manage assignments for other contractors.'
      });
    }

    const updated = await db.updateAssignment(assignmentId, {
      assignment_status: status,
      ...(status === 'Accepted' ? { work_status: 'Accepted' } : {}),
      ...(status === 'Completed' ? { work_status: 'Completed' } : {})
    });

    // Create payment record if accepted/completed and not yet created
    if (status === 'Accepted' || status === 'Completed') {
      const existingPayments = await db.getPaymentsByContractor(contractorId);
      const hasPayment = existingPayments.some(p => p.assignment_id === assignmentId);
      if (!hasPayment) {
        await db.createPayment({
          assignment_id: assignmentId,
          job_id: assignment.job_id,
          worker_id: assignment.worker_id,
          contractor_id: contractorId,
          job_title: assignment.job_title,
          worker_name: assignment.worker_name,
          contractor_name: assignment.contractor_name,
          amount: assignment.agreed_wage,
          payment_status: 'Pending',
          payment_date: null
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Worker status updated to '${status}' successfully!`,
      assignment: updated
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/contractors/payments/:id/status (Contractor records payment status)
async function updatePaymentStatus(req, res, next) {
  try {
    const contractorId = req.user.id;
    const paymentId = req.params.id;
    const { status, notes } = req.body;

    if (!['Pending', 'Paid'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Payment status must be 'Pending' or 'Paid'."
      });
    }

    const payment = await db.findPaymentById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    if (payment.contractor_id && payment.contractor_id !== contractorId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You cannot update payments for other contractors.'
      });
    }

    const updated = await db.updatePayment(paymentId, {
      payment_status: status,
      payment_date: status === 'Paid' ? new Date().toISOString() : null,
      ...(notes ? { notes } : {})
    });

    res.status(200).json({
      success: true,
      message: `Wage payment status updated to '${status}'.`,
      payment: updated
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getContractorJobs,
  getContractorAssignments,
  assignWorker,
  updateAssignmentStatus,
  updatePaymentStatus
};
