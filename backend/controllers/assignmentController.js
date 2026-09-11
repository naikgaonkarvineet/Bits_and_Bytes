const { db } = require('../config/supabase');

// GET /api/assignments/:id
async function getAssignmentById(req, res, next) {
  try {
    const assignmentId = req.params.id;
    const assignment = await db.findAssignmentById(assignmentId);

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    // Security check: only involved worker or contractor can view
    const userId = req.user.id;
    if (assignment.worker_id !== userId && assignment.contractor_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this assignment.' });
    }

    res.status(200).json({ success: true, assignment });
  } catch (err) {
    next(err);
  }
}

// PUT /api/assignments/:id/status (Contractor or Worker accepts/rejects)
async function updateAssignmentStatus(req, res, next) {
  try {
    const assignmentId = req.params.id;
    const { status } = req.body;
    const userId = req.user.id;
    const role = req.user.role;

    const validStatuses = ['Assigned', 'Accepted', 'Rejected', 'Completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid assignment status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const assignment = await db.findAssignmentById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    // Verify participant
    if (assignment.worker_id !== userId && assignment.contractor_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const updated = await db.updateAssignment(assignmentId, {
      assignment_status: status,
      ...(status === 'Accepted' ? { work_status: 'Accepted' } : {}),
      ...(status === 'Completed' ? { work_status: 'Completed' } : {})
    });

    res.status(200).json({
      success: true,
      message: `Assignment status updated to '${status}'.`,
      assignment: updated
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/assignments/:id/work-status (Updates work status)
async function updateWorkStatus(req, res, next) {
  try {
    const assignmentId = req.params.id;
    const { workStatus } = req.body;
    const userId = req.user.id;

    const validStatuses = ['Assigned', 'Accepted', 'In Progress', 'Completed'];
    if (!validStatuses.includes(workStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid work status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const assignment = await db.findAssignmentById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    if (assignment.worker_id !== userId && assignment.contractor_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const updated = await db.updateAssignment(assignmentId, {
      work_status: workStatus,
      ...(workStatus === 'Completed' ? { assignment_status: 'Completed' } : {})
    });

    // Auto-create pending payment on completion if not already present
    if (workStatus === 'Completed') {
      const payments = await db.getPaymentsByWorker(assignment.worker_id);
      const hasPayment = payments.some(p => p.assignment_id === assignmentId);
      if (!hasPayment) {
        await db.createPayment({
          assignment_id: assignmentId,
          job_id: assignment.job_id,
          worker_id: assignment.worker_id,
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
      message: `Work status updated to '${workStatus}'.`,
      assignment: updated
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAssignmentById,
  updateAssignmentStatus,
  updateWorkStatus
};
