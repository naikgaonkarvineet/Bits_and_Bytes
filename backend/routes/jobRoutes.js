const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { verifyToken, requireContractor, requireWorker, optionalAuth } = require('../middleware/auth');
const { validateJobCreation } = require('../middleware/validation');

// Public endpoints
router.get('/', jobController.getAllJobs);
router.get('/:id', jobController.getJobById);

// Contractor creates or updates jobs
router.post('/', verifyToken, requireContractor, validateJobCreation, jobController.createJob);
router.put('/:id', verifyToken, requireContractor, jobController.updateJob);

// Worker applies for job
router.post('/:id/apply', verifyToken, requireWorker, jobController.applyForJob);

module.exports = router;
