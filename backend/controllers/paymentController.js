const { db } = require('../config/supabase');

// GET /api/payments
async function getPayments(req, res, next) {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let payments = [];
    if (role === 'worker') {
      payments = await db.getPaymentsByWorker(userId);
    } else {
      payments = await db.getPaymentsByContractor(userId);
    }

    res.status(200).json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/payments (Contractor records a wage payment record)
async function createPayment(req, res, next) {
  try {
    const contractorId = req.user.id;
    const { workerId, jobId, assignmentId, amount, status, notes } = req.body;

    if (!workerId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'workerId and amount are required.'
      });
    }

    const worker = await db.findWorkerById(workerId);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker not found.' });
    }

    const contractor = await db.findContractorById(contractorId);

    const paymentStatus = status || 'Pending';
    const payment = await db.createPayment({
      assignment_id: assignmentId || null,
      job_id: jobId || null,
      worker_id: workerId,
      contractor_id: contractorId,
      job_title: req.body.jobTitle || 'Construction Site Work',
      worker_name: worker.name,
      contractor_name: contractor ? contractor.company_name : 'Contractor',
      amount: Number(amount),
      payment_status: paymentStatus,
      payment_date: paymentStatus === 'Paid' ? new Date().toISOString() : null,
      notes: notes || null
    });

    res.status(201).json({
      success: true,
      message: 'Payment record created successfully!',
      payment
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/payments/:id/status (Update payment status)
async function updatePaymentStatus(req, res, next) {
  try {
    const paymentId = req.params.id;
    const { status, notes } = req.body;
    const contractorId = req.user.id;

    if (!['Pending', 'Paid'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be 'Pending' or 'Paid'."
      });
    }

    const payment = await db.findPaymentById(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    if (payment.contractor_id && payment.contractor_id !== contractorId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to update payments for other contractors.'
      });
    }

    const updated = await db.updatePayment(paymentId, {
      payment_status: status,
      payment_date: status === 'Paid' ? new Date().toISOString() : null,
      ...(notes ? { notes } : {})
    });

    res.status(200).json({
      success: true,
      message: `Payment status updated to '${status}'.`,
      payment: updated
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPayments,
  createPayment,
  updatePaymentStatus
};
