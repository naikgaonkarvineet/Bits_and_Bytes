const express = require('express');
const router = express.Router();
const contractorController = require('../controllers/contractorController');
const { verifyToken, requireContractor } = require('../middleware/auth');

// All contractor routes require authentication and contractor role
router.use(verifyToken, requireContractor);

// Profile
router.get('/profile', contractorController.getProfile);
router.put('/profile', contractorController.updateProfile);

// Posted Jobs
router.get('/jobs', contractorController.getContractorJobs);

// Worker Assignments / Applications
router.get('/assignments', contractorController.getContractorAssignments);
router.post('/assign', contractorController.assignWorker);
router.put('/assignments/:id/status', contractorController.updateAssignmentStatus);

// Payments recording
router.put('/payments/:id/status', contractorController.updatePaymentStatus);

module.exports = router;
