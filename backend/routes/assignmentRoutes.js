const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/:id', assignmentController.getAssignmentById);
router.put('/:id/status', assignmentController.updateAssignmentStatus);
router.put('/:id/work-status', assignmentController.updateWorkStatus);

module.exports = router;
