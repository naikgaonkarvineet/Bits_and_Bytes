const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {
  validateWorkerRegistration,
  validateContractorRegistration,
  validateLogin
} = require('../middleware/validation');
const { verifyToken } = require('../middleware/auth');

// POST /api/auth/register/worker
router.post('/register/worker', validateWorkerRegistration, authController.registerWorker);

// POST /api/auth/register/contractor
router.post('/register/contractor', validateContractorRegistration, authController.registerContractor);

// POST /api/auth/login
router.post('/login', validateLogin, authController.login);

// GET /api/auth/me
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
