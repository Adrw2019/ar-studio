const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const upload = require('../middleware/uploadMiddleware');

router.get('/project/:projectId', assetController.getAssetsByProject);
router.post('/upload', upload.single('file'), assetController.uploadAsset);

module.exports = router;
