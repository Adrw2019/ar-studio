const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interactionController');

router.get('/project/:projectId', interactionController.getInteractionsByProject);

module.exports = router;
