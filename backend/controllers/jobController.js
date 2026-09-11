const { db } = require('../config/supabase');

// GET /api/jobs (Public job feed with filters)
async function getAllJobs(req, res, next) {
  try {
    const { category, minWage, status, search } = req.query;

    const jobs = await db.getAllJobs({
      category,
      minWage,
      status: status || 'Open',
      search
    });

    res.status(200).json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/jobs/:id (Job details)
async function getJobById(req, res, next) {
  try {
    const jobId = req.params.id;
    const job = await db.getJobById(jobId);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    res.status(200).json({
      success: true,
      job
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/jobs (Contractor creates job)
async function createJob(req, res, next) {
  try {
    const contractorId = req.user.id;
    const contractor = await db.findContractorById(contractorId);

    const {
      title,
      category,
      workersNeeded,
      dailyWage,
      duration,
      startDate,
      endDate,
      location,
      description,
      requirements,
      urgent
    } = req.body;

    const newJob = await db.createJob({
      contractor_id: contractorId,
      contractor_name: contractor ? contractor.company_name : (req.user.company || 'Verified Contractor'),
      contractor_contact: contractor ? contractor.phone : req.user.phone,
      title: title.trim(),
      category: category.trim(),
      workers_needed: parseInt(workersNeeded) || 1,
      daily_wage: Number(dailyWage),
      duration: duration ? duration.trim() : '1 Day',
      start_date: startDate ? startDate.trim() : 'Immediate',
      end_date: endDate ? endDate.trim() : null,
      location: location.trim(),
      description: description.trim(),
      requirements: Array.isArray(requirements) ? requirements : [
        "Prior hands-on experience in " + category,
        "Bring basic hand tools appropriate for trade",
        "Punctual attendance and safety adherence"
      ],
      urgent: Boolean(urgent),
      status: 'Open'
    });

    res.status(201).json({
      success: true,
      message: 'Job requirement published successfully!',
      job: newJob
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/jobs/:id (Contractor updates job)
async function updateJob(req, res, next) {
  try {
    const contractorId = req.user.id;
    const jobId = req.params.id;

    const job = await db.getJobById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    if (job.contractor_id && job.contractor_id !== contractorId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to modify this job.'
      });
    }

    const {
      title,
      category,
      workersNeeded,
      dailyWage,
      duration,
      startDate,
      endDate,
      location,
      description,
      urgent,
      status
    } = req.body;

    const updates = {};
    if (title) updates.title = title.trim();
    if (category) updates.category = category.trim();
    if (workersNeeded) updates.workers_needed = parseInt(workersNeeded);
    if (dailyWage) updates.daily_wage = Number(dailyWage);
    if (duration) updates.duration = duration.trim();
    if (startDate) updates.start_date = startDate.trim();
    if (endDate !== undefined) updates.end_date = endDate;
    if (location) updates.location = location.trim();
    if (description) updates.description = description.trim();
    if (urgent !== undefined) updates.urgent = Boolean(urgent);
    if (status) updates.status = status;

    const updated = await db.updateJob(jobId, updates);

    res.status(200).json({
      success: true,
      message: 'Job updated successfully!',
      job: updated
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/jobs/:id/apply (Worker applies for job)
async function applyForJob(req, res, next) {
  try {
    const workerId = req.user.id;
    const jobId = req.params.id;

    const worker = await db.findWorkerById(workerId);
    if (!worker) {
      return res.status(404).json({ success: false, message: 'Worker profile not found.' });
    }

    const job = await db.getJobById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    // Check if worker already applied
    const existing = await db.findAssignment(jobId, workerId);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job.'
      });
    }

    const assignment = await db.createAssignment({
      job_id: jobId,
      worker_id: workerId,
      contractor_id: job.contractor_id,
      job_title: job.title,
      contractor_name: job.contractor_name,
      worker_name: worker.name,
      worker_trade: worker.trade,
      worker_phone: worker.phone,
      agreed_wage: job.daily_wage,
      location: job.location,
      assignment_status: 'Assigned', // Initial status in queue
      work_status: 'Assigned'
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully! Contractor has been notified.',
      assignment
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  applyForJob
};
