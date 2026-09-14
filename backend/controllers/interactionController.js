const db = require('../config/db');

/**
 * AR Studio - Interaction Controller
 * Gestión de reglas de interacción multi-marcador en PostgreSQL Neon.
 */

exports.getInteractionsByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const result = await db.query(
      'SELECT * FROM interactions WHERE project_id = $1 ORDER BY created_at ASC',
      [projectId]
    );

    const parsed = result.rows.map(item => ({
      ...item,
      trigger_config: typeof item.trigger_config === 'string' ? JSON.parse(item.trigger_config) : (item.trigger_config || {}),
      action_config: typeof item.action_config === 'string' ? JSON.parse(item.action_config) : (item.action_config || {})
    }));

    return res.status(200).json({ success: true, data: parsed });
  } catch (error) {
    next(error);
  }
};

exports.createInteraction = async (req, res, next) => {
  try {
    const { project_id, name, trigger_type, trigger_config, action_type, action_config } = req.body;
    const newId = req.body.id || `interaction-${Date.now()}`;

    const result = await db.query(
      `INSERT INTO interactions (id, project_id, name, trigger_type, trigger_config, action_type, action_config, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        newId, project_id, name || 'Regla de Interacción', trigger_type || 'multi_marker',
        JSON.stringify(trigger_config || {}), action_type || 'animate',
        JSON.stringify(action_config || {})
      ]
    );

    const created = result.rows[0];
    if (typeof created.trigger_config === 'string') {
      try { created.trigger_config = JSON.parse(created.trigger_config); } catch (e) {}
    }
    if (typeof created.action_config === 'string') {
      try { created.action_config = JSON.parse(created.action_config); } catch (e) {}
    }

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

exports.deleteInteraction = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM interactions WHERE id = $1', [id]);
    return res.status(200).json({ success: true, message: 'Interacción eliminada' });
  } catch (error) {
    next(error);
  }
};
