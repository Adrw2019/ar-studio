const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.get('/slug/:slug', projectController.getProjectBySlug);
router.post('/', projectController.createProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);
router.post('/:id/duplicate', projectController.duplicateProject);

module.exports = router;
