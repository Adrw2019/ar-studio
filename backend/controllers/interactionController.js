const db = require('../config/db');

const mockInteractions = [
  {
    id: 'inter-motor-energy',
    project_id: '22222222-2222-2222-2222-222222222222',
    name: 'Activación de Motor por Circuito de Energía',
    trigger_type: 'multi_marker',
    trigger_config: {
      required_markers: ['Motor', 'Energía']
    },
    action_type: 'start_motor_simulation',
    action_config: {
      animation: 'spin_fast',
      audio_effect: 'motor_hum.mp3',
      message: '⚡ ¡Circuito completado! Motor encendido'
    }
  }
];

exports.getInteractionsByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    if (db.isDbConnected()) {
      const result = await db.query('SELECT * FROM interactions WHERE project_id = $1', [projectId]);
      return res.status(200).json({ success: true, data: result.rows });
    }
    const filtered = mockInteractions.filter(i => i.project_id === projectId || projectId === 'demo');
    return res.status(200).json({ success: true, data: filtered });
  } catch (error) {
    next(error);
  }
};
