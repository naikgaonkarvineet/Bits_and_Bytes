const express = require('express');
const router = express.Router();
const workerController = require('../controllers/workerController');
const { verifyToken, requireWorker } = require('../middleware/auth');

// All worker routes require JWT authentication and worker role
router.use(verifyToken, requireWorker);

// Profile
router.get('/profile', workerController.getProfile);
router.put('/profile', workerController.updateProfile);

// Assigned Work & History
router.get('/assigned-jobs', workerController.getAssignedJobs);
router.get('/work-history', workerController.getWorkHistory);

// Status actions
router.put('/assignments/:id/accept', workerController.acceptAssignedJob);
router.put('/assignments/:id/status', workerController.updateWorkStatus);

// Wages & Payments
router.get('/wages', workerController.getWages);
router.get('/payments', workerController.getPaymentStatus);

module.exports = router;
