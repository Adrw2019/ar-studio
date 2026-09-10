const db = require('../config/db');

exports.getAssetsByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    if (db.isDbConnected()) {
      const result = await db.query('SELECT * FROM assets WHERE project_id = $1', [projectId]);
      return res.status(200).json({ success: true, data: result.rows });
    }
    return res.status(200).json({ success: true, data: [] });
  } catch (error) {
    next(error);
  }
};

exports.uploadAsset = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se ha subido ningún archivo' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    return res.status(201).json({
      success: true,
      message: 'Archivo subido exitosamente',
      file_url: fileUrl,
      original_name: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    next(error);
  }
};

exports.createAsset = async (req, res, next) => {
  try {
    const { project_id, marker_id, type, file_url, position_x, position_y, position_z, rotation_x, rotation_y, rotation_z, scale_x, scale_y, scale_z, configuration } = req.body;
    const newAsset = {
      id: `asset-${Date.now()}`,
      project_id,
      marker_id,
      type: type || 'model3d',
      file_url: file_url || '/models/motor.glb',
      position_x: position_x || 0,
      position_y: position_y || 0,
      position_z: position_z || 0,
      rotation_x: rotation_x || 0,
      rotation_y: rotation_y || 0,
      rotation_z: rotation_z || 0,
      scale_x: scale_x || 0.75,
      scale_y: scale_y || 0.75,
      scale_z: scale_z || 0.75,
      configuration: configuration || {}
    };

    if (db.isDbConnected()) {
      const result = await db.query(
        `INSERT INTO assets (project_id, marker_id, type, file_url, position_x, position_y, position_z, rotation_x, rotation_y, rotation_z, scale_x, scale_y, scale_z, configuration)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [project_id, marker_id, newAsset.type, newAsset.file_url, newAsset.position_x, newAsset.position_y, newAsset.position_z, newAsset.rotation_x, newAsset.rotation_y, newAsset.rotation_z, newAsset.scale_x, newAsset.scale_y, newAsset.scale_z, JSON.stringify(newAsset.configuration)]
      );
      return res.status(201).json({ success: true, data: result.rows[0] });
    }

    return res.status(201).json({ success: true, data: newAsset });
  } catch (error) {
    next(error);
  }
};
