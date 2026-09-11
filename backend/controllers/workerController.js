const { db } = require('../config/supabase');

// GET /api/workers/profile
async function getProfile(req, res, next) {
  try {
    const workerId = req.user.id;
    const worker = await db.findWorkerById(workerId);

    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker profile not found.' });
    }

    const sanitized = { ...worker };
    delete sanitized.password_hash;

    res.status(200).json({ success: true, worker: sanitized });
  } catch (err) {
    next(err);
  }
}

// PUT /api/workers/profile
async function updateProfile(req, res, next) {
  try {
    const workerId = req.user.id;
    const {
      name,
      trade,
      dailyWage,
      experience,
      location,
      preferredLang,
      aadharVerified
    } = req.body;

    const updates = {};
    if (name) updates.name = name.trim();
    if (trade) updates.trade = trade;
    if (dailyWage) updates.daily_wage = Number(dailyWage);
    if (experience) updates.experience = experience;
    if (location) updates.location = location;
    if (preferredLang) updates.preferred_lang = preferredLang;
    if (aadharVerified !== undefined) updates.aadhar_verified = Boolean(aadharVerified);

    const updated = await db.updateWorker(workerId, updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Worker profile not found.' });
    }

    const sanitized = { ...updated };
    delete sanitized.password_hash;

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      worker: sanitized
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/workers/assigned-jobs
async function getAssignedJobs(req, res, next) {
  try {
    const workerId = req.user.id;
    const assignments = await db.getAssignmentsByWorker(workerId);

    res.status(200).json({
      success: true,
      count: assignments.length,
      assignments
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/workers/work-history
async function getWorkHistory(req, res, next) {
  try {
    const workerId = req.user.id;
    const assignments = await db.getAssignmentsByWorker(workerId);
    const completedHistory = assignments.filter(a => a.work_status === 'Completed');

    res.status(200).json({
      success: true,
      count: completedHistory.length,
      history: completedHistory
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/workers/assignments/:id/accept
async function acceptAssignedJob(req, res, next) {
  try {
    const workerId = req.user.id;
    const assignmentId = req.params.id;

    const assignment = await db.findAssignmentById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment record not found.' });
    }

    if (assignment.worker_id !== workerId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to accept this assignment.' });
    }

    const updated = await db.updateAssignment(assignmentId, {
      assignment_status: 'Accepted',
      work_status: 'Accepted'
    });

    res.status(200).json({
      success: true,
      message: 'Job assignment accepted successfully!',
      assignment: updated
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/workers/assignments/:id/status
async function updateWorkStatus(req, res, next) {
  try {
    const workerId = req.user.id;
    const assignmentId = req.params.id;
    const { workStatus } = req.body;

    const validStatuses = ['Assigned', 'Accepted', 'In Progress', 'Completed'];
    if (!validStatuses.includes(workStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const assignment = await db.findAssignmentById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    if (assignment.worker_id !== workerId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this assignment.' });
    }

    const updated = await db.updateAssignment(assignmentId, {
      work_status: workStatus,
      ...(workStatus === 'Completed' ? { assignment_status: 'Completed' } : {})
    });

    // If completed, automatically ensure a pending payment record is created if none exists
    if (workStatus === 'Completed') {
      const payments = await db.getPaymentsByWorker(workerId);
      const existingPayment = payments.find(p => p.assignment_id === assignmentId);
      if (!existingPayment) {
        await db.createPayment({
          assignment_id: assignmentId,
          job_id: assignment.job_id,
          worker_id: workerId,
          contractor_id: assignment.contractor_id,
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
      message: `Work status updated to '${workStatus}'!`,
      assignment: updated
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/workers/wages
async function getWages(req, res, next) {
  try {
    const workerId = req.user.id;
    const payments = await db.getPaymentsByWorker(workerId);
    const assignments = await db.getAssignmentsByWorker(workerId);

    const totalEarned = payments
      .filter(p => p.payment_status === 'Paid')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const pendingAmount = payments
      .filter(p => p.payment_status === 'Pending')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    res.status(200).json({
      success: true,
      summary: {
        totalEarned,
        pendingAmount,
        completedJobsCount: assignments.filter(a => a.work_status === 'Completed').length,
        activeJobsCount: assignments.filter(a => a.work_status === 'In Progress' || a.work_status === 'Accepted').length
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/workers/payments
async function getPaymentStatus(req, res, next) {
  try {
    const workerId = req.user.id;
    const payments = await db.getPaymentsByWorker(workerId);

    res.status(200).json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getAssignedJobs,
  getWorkHistory,
  acceptAssignedJob,
  updateWorkStatus,
  getWages,
  getPaymentStatus
};
