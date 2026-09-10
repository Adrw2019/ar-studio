const db = require('../config/db');

// Banco de datos en memoria para desarrollo local / standalone
let mockProjects = [
  {
    id: 'project-motor-energia-demo',
    name: 'Experimento: Motor Eléctrico y Energía',
    description: 'Proyecto educativo de electromagnetismo con tarjetas interactivas.',
    slug: 'motor-electrico',
    status: 'published',
    mind_file_url: '/markers/targets.mind',
    max_track_targets: 2,
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updated_at: new Date().toISOString(),
    markers: [
      {
        id: 'marker-1',
        project_id: 'project-motor-energia-demo',
        name: 'Motor',
        target_image: '/markers/card-motor.svg',
        target_index: 0,
        description: 'Tarjeta de inducción y rotor del motor eléctrico'
      },
      {
        id: 'marker-2',
        project_id: 'project-motor-energia-demo',
        name: 'Energía',
        target_image: '/markers/card-energy.svg',
        target_index: 1,
        description: 'Tarjeta de suministro eléctrico y acumulador'
      }
    ],
    assets: [
      {
        id: 'asset-1',
        project_id: 'project-motor-energia-demo',
        marker_id: 'marker-1',
        type: 'model3d',
        file_url: '/models/motor.glb',
        position_x: 0,
        position_y: 0,
        position_z: 0,
        rotation_x: 0,
        rotation_y: 0,
        rotation_z: 0,
        scale_x: 0.75,
        scale_y: 0.75,
        scale_z: 0.75,
        configuration: {
          title: 'Motor Eléctrico de Inducción',
          category: 'Electromagnetismo',
          description: 'Transforma energía eléctrica en mecánica mediante campos magnéticos alternos.',
          details: [
            'Estator fijo con bobinas de cobre.',
            'Rotor giratorio centrado.',
            'Se activa al recibir flujo eléctrico.'
          ],
          interactive: true
        }
      },
      {
        id: 'asset-2',
        project_id: 'project-motor-energia-demo',
        marker_id: 'marker-2',
        type: 'model3d',
        file_url: '/models/energy.glb',
        position_x: 0,
        position_y: 0,
        position_z: 0,
        rotation_x: 0,
        rotation_y: 0,
        rotation_z: 0,
        scale_x: 0.75,
        scale_y: 0.75,
        scale_z: 0.75,
        configuration: {
          title: 'Módulo de Energía',
          category: 'Fuentes de Poder',
          description: 'Batería recargable que proporciona 24V de corriente continua.',
          details: [
            'Flujo continuo de electrones.',
            'Circuito cerrado con el motor.'
          ],
          interactive: true
        }
      }
    ],
    interactions: [
      {
        id: 'interaction-1',
        project_id: 'project-motor-energia-demo',
        name: 'Activación Motor + Energía',
        trigger_type: 'multi_marker',
        trigger_config: { required_markers: ['Motor', 'Energía'] },
        action_type: 'start_motor',
        action_config: {
          title: '⚡ ¡Circuito Cerrado!',
          message: 'La fuente de energía ha suministrado corriente al motor. ¡Motor encendido a 3000 RPM!',
          sound_effect: '/audio/motor-hum.mp3'
        }
      }
    ]
  },
  {
    id: 'project-biologia-celular',
    name: 'Biología: Estructura Celular',
    description: 'Visualización 3D interactiva de células eucariotas y sus organelos principales.',
    slug: 'biologia-celular',
    status: 'draft',
    mind_file_url: '/markers/targets.mind',
    max_track_targets: 2,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date().toISOString(),
    markers: [
      {
        id: 'marker-bio-1',
        project_id: 'project-biologia-celular',
        name: 'Núcleo',
        target_image: '/markers/card-motor.svg',
        target_index: 0,
        description: 'Tarjeta del núcleo celular y ADN'
      }
    ],
    assets: [
      {
        id: 'asset-bio-1',
        project_id: 'project-biologia-celular',
        marker_id: 'marker-bio-1',
        type: 'model3d',
        file_url: '/models/cell.glb',
        position_x: 0,
        position_y: 0.2,
        position_z: 0,
        rotation_x: 0,
        rotation_y: 0,
        rotation_z: 0,
        scale_x: 0.8,
        scale_y: 0.8,
        scale_z: 0.8,
        configuration: {
          title: 'Núcleo Celular',
          category: 'Biología',
          description: 'Centro de control celular que almacena el material genético.',
          details: ['Membrana nuclear porosa.', 'Nucleolo con ARN ribosomal.'],
          interactive: true
        }
      }
    ],
    interactions: []
  }
];

// Helper para obtener datos completos de un proyecto en memoria
function populateMockProject(project) {
  return {
    ...project,
    markersCount: (project.markers || []).length,
    assetsCount: (project.assets || []).length
  };
}

// 1. Obtener todos los proyectos
exports.getAllProjects = async (req, res, next) => {
  try {
    if (db.isDbConnected()) {
      const result = await db.query(`
        SELECT p.*,
          (SELECT COUNT(*) FROM markers m WHERE m.project_id = p.id) AS markers_count,
          (SELECT COUNT(*) FROM assets a WHERE a.project_id = p.id) AS assets_count
        FROM projects p
        ORDER BY p.updated_at DESC
      `);
      return res.status(200).json({ success: true, data: result.rows });
    }
    const populated = mockProjects.map(populateMockProject);
    return res.status(200).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// 2. Obtener proyecto por ID
exports.getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (db.isDbConnected()) {
      const projRes = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
      if (projRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Proyecto no encontrado' });
      }
      const project = projRes.rows[0];
      const markersRes = await db.query('SELECT * FROM markers WHERE project_id = $1 ORDER BY target_index ASC', [id]);
      const assetsRes = await db.query('SELECT * FROM assets WHERE project_id = $1', [id]);
      const interRes = await db.query('SELECT * FROM interactions WHERE project_id = $1', [id]);

      project.markers = markersRes.rows;
      project.assets = assetsRes.rows;
      project.interactions = interRes.rows;

      return res.status(200).json({ success: true, data: project });
    }

    const project = mockProjects.find(p => p.id === id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Proyecto no encontrado' });
    }
    return res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// 3. Obtener proyecto por Slug (para ejecución en AR Player)
exports.getProjectBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    if (db.isDbConnected()) {
      const projRes = await db.query('SELECT * FROM projects WHERE slug = $1', [slug]);
      if (projRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Experiencia AR no encontrada' });
      }
      const project = projRes.rows[0];
      const markersRes = await db.query('SELECT * FROM markers WHERE project_id = $1 ORDER BY target_index ASC', [project.id]);
      const assetsRes = await db.query('SELECT * FROM assets WHERE project_id = $1', [project.id]);
      const interRes = await db.query('SELECT * FROM interactions WHERE project_id = $1', [project.id]);

      project.markers = markersRes.rows;
      project.assets = assetsRes.rows;
      project.interactions = interRes.rows;

      return res.status(200).json({ success: true, data: project });
    }

    const project = mockProjects.find(p => p.slug === slug);
    if (!project) {
      // Si piden 'demo' devolver el primero
      if (slug === 'demo' && mockProjects.length > 0) {
        return res.status(200).json({ success: true, data: mockProjects[0] });
      }
      return res.status(404).json({ success: false, error: 'Experiencia AR no encontrada' });
    }
    return res.status(200).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

// 4. Crear nuevo proyecto
exports.createProject = async (req, res, next) => {
  try {
    const { name, description, slug } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'El nombre del proyecto es requerido' });
    }

    // Sanitizar slug
    const finalSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `proyecto-${Date.now()}`;

    const newId = `project-${Date.now()}`;
    const newProject = {
      id: newId,
      name,
      description: description || '',
      slug: finalSlug,
      status: 'draft',
      mind_file_url: '/markers/targets.mind',
      max_track_targets: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      markers: [
        {
          id: `marker-${Date.now()}-0`,
          project_id: newId,
          name: 'Tarjeta 1',
          target_image: '/markers/card-motor.svg',
          target_index: 0,
          description: 'Marcador principal'
        }
      ],
      assets: [
        {
          id: `asset-${Date.now()}-0`,
          project_id: newId,
          marker_id: `marker-${Date.now()}-0`,
          type: 'model3d',
          file_url: '/models/motor.glb',
          position_x: 0,
          position_y: 0,
          position_z: 0,
          rotation_x: 0,
          rotation_y: 0,
          rotation_z: 0,
          scale_x: 0.75,
          scale_y: 0.75,
          scale_z: 0.75,
          configuration: {
            title: name,
            category: 'Educación',
            description: description || 'Objeto 3D interactivo en Realidad Aumentada',
            interactive: true,
            details: ['Toca el modelo en pantalla para inspeccionar.']
          }
        }
      ],
      interactions: []
    };

    if (db.isDbConnected()) {
      const result = await db.query(
        'INSERT INTO projects (name, description, slug, status, mind_file_url, max_track_targets) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [name, description || '', finalSlug, 'draft', '/markers/targets.mind', 2]
      );
      const created = result.rows[0];
      // Crear marcador por defecto
      const mRes = await db.query(
        'INSERT INTO markers (project_id, name, target_image, target_index, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [created.id, 'Tarjeta 1', '/markers/card-motor.svg', 0, 'Marcador principal']
      );
      // Crear asset por defecto
      const aRes = await db.query(
        `INSERT INTO assets (project_id, marker_id, type, file_url, position_x, position_y, position_z, scale_x, scale_y, scale_z, configuration)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [created.id, mRes.rows[0].id, 'model3d', '/models/motor.glb', 0, 0, 0, 0.75, 0.75, 0.75, JSON.stringify(newProject.assets[0].configuration)]
      );

      created.markers = mRes.rows;
      created.assets = aRes.rows;
      created.interactions = [];
      return res.status(201).json({ success: true, data: created });
    }

    mockProjects.unshift(newProject);
    return res.status(201).json({ success: true, data: newProject });
  } catch (error) {
    next(error);
  }
};

// 5. Actualizar proyecto (Guardar / Auto-guardar)
exports.updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, slug, status, mind_file_url, max_track_targets, markers, assets, interactions } = req.body;

    if (db.isDbConnected()) {
      const result = await db.query(
        `UPDATE projects
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             slug = COALESCE($3, slug),
             status = COALESCE($4, status),
             mind_file_url = COALESCE($5, mind_file_url),
             max_track_targets = COALESCE($6, max_track_targets),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING *`,
        [name, description, slug, status, mind_file_url, max_track_targets, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Proyecto no encontrado' });
      }

      // Sincronizar marcadores y assets si se enviaron completos
      if (Array.isArray(markers)) {
        for (const m of markers) {
          if (m.id && !m.id.startsWith('temp-')) {
            await db.query(
              `UPDATE markers SET name = $1, target_image = $2, target_index = $3, description = $4 WHERE id = $5`,
              [m.name, m.target_image, m.target_index, m.description || '', m.id]
            );
          } else {
            await db.query(
              `INSERT INTO markers (project_id, name, target_image, target_index, description) VALUES ($1, $2, $3, $4, $5)`,
              [id, m.name, m.target_image || '/markers/card-motor.svg', m.target_index || 0, m.description || '']
            );
          }
        }
      }

      if (Array.isArray(assets)) {
        for (const a of assets) {
          if (a.id && !a.id.startsWith('temp-')) {
            await db.query(
              `UPDATE assets
               SET position_x = $1, position_y = $2, position_z = $3,
                   rotation_x = $4, rotation_y = $5, rotation_z = $6,
                   scale_x = $7, scale_y = $8, scale_z = $9,
                   configuration = $10, file_url = COALESCE($11, file_url)
               WHERE id = $12`,
              [
                a.position_x || 0, a.position_y || 0, a.position_z || 0,
                a.rotation_x || 0, a.rotation_y || 0, a.rotation_z || 0,
                a.scale_x || 1, a.scale_y || 1, a.scale_z || 1,
                JSON.stringify(a.configuration || {}), a.file_url, a.id
              ]
            );
          }
        }
      }

      const updated = result.rows[0];
      return res.status(200).json({ success: true, data: updated, message: 'Proyecto guardado exitosamente' });
    }

    const index = mockProjects.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Proyecto no encontrado' });
    }

    const current = mockProjects[index];
    mockProjects[index] = {
      ...current,
      name: name !== undefined ? name : current.name,
      description: description !== undefined ? description : current.description,
      slug: slug !== undefined ? slug : current.slug,
      status: status !== undefined ? status : current.status,
      mind_file_url: mind_file_url !== undefined ? mind_file_url : current.mind_file_url,
      max_track_targets: max_track_targets !== undefined ? max_track_targets : current.max_track_targets,
      markers: Array.isArray(markers) ? markers : current.markers,
      assets: Array.isArray(assets) ? assets : current.assets,
      interactions: Array.isArray(interactions) ? interactions : current.interactions,
      updated_at: new Date().toISOString()
    };

    return res.status(200).json({ success: true, data: mockProjects[index], message: 'Proyecto guardado exitosamente' });
  } catch (error) {
    next(error);
  }
};

// 6. Eliminar proyecto
exports.deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (db.isDbConnected()) {
      const result = await db.query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Proyecto no encontrado' });
      }
      return res.status(200).json({ success: true, message: 'Proyecto eliminado correctamente' });
    }

    const index = mockProjects.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Proyecto no encontrado' });
    }
    mockProjects.splice(index, 1);
    return res.status(200).json({ success: true, message: 'Proyecto eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};

// 7. Duplicar proyecto
exports.duplicateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = mockProjects.find(p => p.id === id);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Proyecto origen no encontrado' });
    }

    const duplicateId = `project-${Date.now()}`;
    const duplicateSlug = `${project.slug}-copia-${Math.floor(Math.random() * 1000)}`;

    const duplicatedProject = {
      ...JSON.parse(JSON.stringify(project)),
      id: duplicateId,
      name: `${project.name} (Copia)`,
      slug: duplicateSlug,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Actualizar IDs internos de marcadores y assets
    if (duplicatedProject.markers) {
      duplicatedProject.markers.forEach((m, idx) => {
        m.id = `marker-${Date.now()}-${idx}`;
        m.project_id = duplicateId;
      });
    }
    if (duplicatedProject.assets) {
      duplicatedProject.assets.forEach((a, idx) => {
        a.id = `asset-${Date.now()}-${idx}`;
        a.project_id = duplicateId;
        if (duplicatedProject.markers && duplicatedProject.markers[idx]) {
          a.marker_id = duplicatedProject.markers[idx].id;
        }
      });
    }
    if (duplicatedProject.interactions) {
      duplicatedProject.interactions.forEach((i, idx) => {
        i.id = `interaction-${Date.now()}-${idx}`;
        i.project_id = duplicateId;
      });
    }

    mockProjects.unshift(duplicatedProject);
    return res.status(201).json({
      success: true,
      data: duplicatedProject,
      message: 'Proyecto duplicado correctamente'
    });
  } catch (error) {
    next(error);
  }
};
