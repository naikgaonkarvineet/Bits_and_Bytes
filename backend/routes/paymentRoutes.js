const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyToken, requireContractor } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', paymentController.getPayments);
router.post('/', requireContractor, paymentController.createPayment);
router.put('/:id/status', requireContractor, paymentController.updatePaymentStatus);

module.exports = router;
