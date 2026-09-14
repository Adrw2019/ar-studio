const db = require('../config/db');

/**
 * AR Studio - Marker Controller
 * Gestión de tarjetas físicas de tracking en PostgreSQL Neon.
 */

exports.getMarkersByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const result = await db.query(
      'SELECT * FROM markers WHERE project_id = $1 ORDER BY target_index ASC',
      [projectId]
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
};

exports.createMarker = async (req, res, next) => {
  try {
    const { project_id, name, target_image, target_index, description } = req.body;
    const newId = req.body.id || `marker-${Date.now()}`;
    const targetIdx = parseInt(target_index !== undefined ? target_index : 0, 10);

    const result = await db.query(
      `INSERT INTO markers (id, project_id, name, target_image, target_index, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [newId, project_id, name || 'Nueva Tarjeta', target_image || '', targetIdx, description || '']
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

exports.deleteMarker = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM markers WHERE id = $1', [id]);
    return res.status(200).json({ success: true, message: 'Marcador eliminado' });
  } catch (error) {
    next(error);
  }
};
