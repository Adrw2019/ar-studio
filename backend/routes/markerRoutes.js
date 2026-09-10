const express = require('express');
const router = express.Router();
const markerController = require('../controllers/markerController');

router.get('/project/:projectId', markerController.getMarkersByProject);
router.post('/', markerController.createMarker);

module.exports = router;
