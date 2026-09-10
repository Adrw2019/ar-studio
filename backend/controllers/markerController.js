const db = require('../config/db');

exports.getMarkersByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    if (db.isDbConnected()) {
      const result = await db.query('SELECT * FROM markers WHERE project_id = $1 ORDER BY target_index ASC', [projectId]);
      return res.status(200).json({ success: true, data: result.rows });
    }
    return res.status(200).json({ success: true, data: [] });
  } catch (error) {
    next(error);
  }
};

exports.createMarker = async (req, res, next) => {
  try {
    const { project_id, name, target_image, target_index, description } = req.body;
    const newMarker = {
      id: `marker-${Date.now()}`,
      project_id,
      name: name || 'Nueva Tarjeta',
      target_image: target_image || '/markers/card-motor.svg',
      target_index: parseInt(target_index || 0, 10),
      description: description || ''
    };

    if (db.isDbConnected()) {
      const result = await db.query(
        'INSERT INTO markers (project_id, name, target_image, target_index, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [project_id, newMarker.name, newMarker.target_image, newMarker.target_index, newMarker.description]
      );
      return res.status(201).json({ success: true, data: result.rows[0] });
    }

    return res.status(201).json({ success: true, data: newMarker });
  } catch (error) {
    next(error);
  }
};

exports.deleteMarker = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (db.isDbConnected()) {
      await db.query('DELETE FROM markers WHERE id = $1', [id]);
    }
    return res.status(200).json({ success: true, message: 'Marcador eliminado' });
  } catch (error) {
    next(error);
  }
};
