const db = require('../config/db');
const storageService = require('../services/storageService');
const mindarCompilerService = require('../services/mindarCompilerService');

// Banco de datos en memoria para proyectos creados por el usuario (inicia vacío sin demos)
let mockProjects = [];

// Helper para poblar datos calculados de un proyecto en memoria
function populateMockProject(project) {
  const markers = project.markers || [];
  const assets = project.assets || [];
  const hasValidMind = Boolean(project.mind_file_url);

  return {
    ...project,
    status: project.status || 'draft',
    tracking_status: project.tracking_status || (hasValidMind ? 'ready' : 'pending'),
    tracking_error: project.tracking_error || null,
    mind_file_url: project.mind_file_url || null,
    markersCount: markers.length,
    assetsCount: assets.length
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

// 2. Obtener proyecto por ID (con sus marcadores, assets e interacciones)
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
    return res.status(200).json({ success: true, data: populateMockProject(project) });
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

    const project = mockProjects.find(p => p.slug === slug || p.id === slug);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Experiencia AR no encontrada' });
    }
    return res.status(200).json({ success: true, data: populateMockProject(project) });
  } catch (error) {
    next(error);
  }
};

// 4. Crear nuevo proyecto
exports.createProject = async (req, res, next) => {
  try {
    const { name, description, category, slug, theme } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'El nombre del proyecto es requerido' });
    }

    // Sanitizar slug
    const finalSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `proyecto-${Date.now()}`;

    const newId = `project-${Date.now()}`;
    const finalCategory = category || 'STEM';

    const defaultTheme = {
      primaryColor: '#00f2fe',
      secondaryColor: '#8a2be2',
      logo: '',
      backgroundImage: '',
      title: name.trim(),
      subtitle: `Experiencia didáctica de ${finalCategory}`,
      introText: description || `Bienvenido a la experiencia interactiva de ${name.trim()}. Enfoca la tarjeta física para visualizar el contenido en Realidad Aumentada.`,
      buttonStyle: 'modern',
      panelStyle: 'glass',
      ...(theme || {})
    };

    // Nuevo proyecto: status 'draft', tracking_status 'pending', mind_file_url null
    const newProject = {
      id: newId,
      name: name.trim(),
      description: description || '',
      category: finalCategory,
      slug: finalSlug,
      status: 'draft',
      tracking_status: 'pending',
      mind_file_url: null,
      max_track_targets: 1,
      theme: defaultTheme,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      markers: [
        {
          id: `marker-${Date.now()}-0`,
          project_id: newId,
          name: 'Tarjeta 1',
          target_image: '',
          target_index: 0,
          description: 'Tarjeta física principal (pendiente de subir imagen)'
        }
      ],
      assets: [],
      interactions: []
    };

    if (db.isDbConnected()) {
      const result = await db.query(
        `INSERT INTO projects (name, description, slug, status, mind_file_url, max_track_targets)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [newProject.name, newProject.description, finalSlug, 'draft', null, 1]
      );
      const created = result.rows[0];

      // Crear tarjeta inicial vacía vinculada a este project_id
      const mRes = await db.query(
        'INSERT INTO markers (project_id, name, target_image, target_index, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [created.id, 'Tarjeta 1', '', 0, 'Tarjeta física principal (pendiente de subir imagen)']
      );

      created.markers = mRes.rows;
      created.assets = [];
      created.interactions = [];
      created.theme = defaultTheme;
      created.category = finalCategory;
      created.tracking_status = 'pending';
      return res.status(201).json({ success: true, data: created });
    }

    mockProjects.unshift(newProject);
    return res.status(201).json({ success: true, data: populateMockProject(newProject) });
  } catch (error) {
    next(error);
  }
};

// 5. Actualizar proyecto (Guardar / Auto-guardar)
exports.updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, description, category, slug, status, tracking_status, theme,
      mind_file_url, max_track_targets, markers, assets, interactions
    } = req.body;

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

      // Sincronizar marcadores estrictamente por project_id
      if (Array.isArray(markers)) {
        for (const m of markers) {
          if (m.id && !m.id.startsWith('temp-')) {
            await db.query(
              `UPDATE markers SET name = $1, target_image = $2, target_index = $3, description = $4 WHERE id = $5 AND project_id = $6`,
              [m.name, m.target_image || '', m.target_index || 0, m.description || '', m.id, id]
            );
          } else {
            await db.query(
              `INSERT INTO markers (project_id, name, target_image, target_index, description) VALUES ($1, $2, $3, $4, $5)`,
              [id, m.name, m.target_image || '', m.target_index || 0, m.description || '']
            );
          }
        }
      }

      // Sincronizar assets estrictamente por project_id
      if (Array.isArray(assets)) {
        for (const a of assets) {
          if (a.id && !a.id.startsWith('temp-')) {
            await db.query(
              `UPDATE assets
               SET position_x = $1, position_y = $2, position_z = $3,
                   rotation_x = $4, rotation_y = $5, rotation_z = $6,
                   scale_x = $7, scale_y = $8, scale_z = $9,
                   configuration = $10, file_url = COALESCE($11, file_url)
               WHERE id = $12 AND project_id = $13`,
              [
                a.position_x || 0, a.position_y || 0, a.position_z || 0,
                a.rotation_x || 0, a.rotation_y || 0, a.rotation_z || 0,
                a.scale_x || 1, a.scale_y || 1, a.scale_z || 1,
                JSON.stringify(a.configuration || {}), a.file_url, a.id, id
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
    const resolvedMindUrl = mind_file_url !== undefined ? mind_file_url : current.mind_file_url;
    const resolvedTrackingStatus = tracking_status !== undefined
      ? tracking_status
      : (resolvedMindUrl ? 'ready' : 'pending');

    mockProjects[index] = {
      ...current,
      name: name !== undefined ? name : current.name,
      description: description !== undefined ? description : current.description,
      category: category !== undefined ? category : current.category,
      slug: slug !== undefined ? slug : current.slug,
      status: status !== undefined ? status : current.status,
      tracking_status: resolvedTrackingStatus,
      mind_file_url: resolvedMindUrl,
      theme: theme !== undefined ? { ...current.theme, ...theme } : current.theme,
      max_track_targets: max_track_targets !== undefined ? max_track_targets : current.max_track_targets,
      markers: Array.isArray(markers) ? markers : current.markers,
      assets: Array.isArray(assets) ? assets : current.assets,
      interactions: Array.isArray(interactions) ? interactions : current.interactions,
      updated_at: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      data: populateMockProject(mockProjects[index]),
      message: 'Proyecto guardado exitosamente'
    });
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
      tracking_status: project.mind_file_url ? 'ready' : 'pending',
      mind_file_url: project.mind_file_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Actualizar IDs internos de marcadores y assets vinculados a este nuevo project_id
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
      data: populateMockProject(duplicatedProject),
      message: 'Proyecto duplicado correctamente'
    });
  } catch (error) {
    next(error);
  }
};

// 8. Compilar targets.mind para un proyecto específico
exports.compileProjectTargets = async (req, res, next) => {
  const { id } = req.params;
  try {
    let project = null;
    let markers = [];

    if (db.isDbConnected()) {
      const projRes = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
      if (projRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Proyecto no encontrado' });
      }
      project = projRes.rows[0];
      const markersRes = await db.query(
        'SELECT * FROM markers WHERE project_id = $1 ORDER BY target_index ASC',
        [id]
      );
      markers = markersRes.rows;
    } else {
      project = mockProjects.find(p => p.id === id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Proyecto no encontrado' });
      }
      markers = (project.markers || []).sort((a, b) => (a.target_index ?? 0) - (b.target_index ?? 0));
    }

    // 1. Validar que haya al menos una tarjeta física
    if (!markers || markers.length === 0) {
      return res.status(400).json({
        success: false,
        tracking_status: 'error',
        tracking_error: 'El proyecto no tiene tarjetas registradas. Agrega al menos una tarjeta física en el Studio.',
        error: 'El proyecto no tiene tarjetas registradas'
      });
    }

    // 2. Validar que las tarjetas tengan imagen asignada
    const markersWithImage = markers.filter(m => m.target_image && m.target_image.trim());
    if (markersWithImage.length === 0) {
      return res.status(400).json({
        success: false,
        tracking_status: 'error',
        tracking_error: 'Ninguna tarjeta tiene imagen asignada. Sube la imagen física de la tarjeta antes de compilar.',
        error: 'Ninguna tarjeta tiene imagen asignada'
      });
    }

    // 3. Marcar estado como 'compiling'
    project.tracking_status = 'compiling';
    project.tracking_error = null;

    console.log(`[projectController] Iniciando compilación de targets para proyecto ${id} (${markers.length} tarjetas)...`);

    // 4. Ejecutar compilación de MindAR con node-canvas y TensorFlow
    const { buffer, targetsCount, qualityReport } = await mindarCompilerService.compileMarkers(
      id,
      markers
    );

    // 5. Guardar archivo .mind mediante storageService (RAW en Cloudinary / local)
    const filename = `${project.id}-targets.mind`;
    const saved = await storageService.saveFile({
      filename,
      buffer,
      mimeType: 'application/octet-stream',
      projectId: project.id,
      category: 'tracking'
    });

    // 6. Actualizar proyecto con URL segura persistente
    project.mind_file_url = saved.secure_url || saved.url;
    project.tracking_status = 'ready';
    project.tracking_error = null;
    project.updated_at = new Date().toISOString();

    // Actualizar calidad en markers
    if (Array.isArray(qualityReport) && project.markers) {
      project.markers.forEach(m => {
        const qr = qualityReport.find(q => q.marker_id === m.id || q.target_index === m.target_index);
        if (qr) {
          m.quality = qr.quality;
          m.quality_score = qr.score;
        }
      });
    }

    if (db.isDbConnected()) {
      await db.query(
        'UPDATE projects SET mind_file_url = $1, tracking_status = $2, tracking_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [saved.url, 'ready', id]
      );
    }

    return res.status(200).json({
      success: true,
      project_id: project.id,
      tracking_status: 'ready',
      mind_file_url: saved.url,
      targets_count: targetsCount,
      quality_report: qualityReport,
      message: 'Archivo targets.mind compilado exitosamente para este proyecto'
    });
  } catch (err) {
    console.error(`[projectController] Error al compilar targets para ${id}:`, err);

    // Registrar estado de error en el proyecto
    const project = mockProjects.find(p => p.id === id);
    if (project) {
      project.tracking_status = 'error';
      project.tracking_error = err.message || 'Error desconocido durante la compilación';
    }

    if (db.isDbConnected()) {
      try {
        await db.query(
          'UPDATE projects SET tracking_status = $1, tracking_error = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          ['error', err.message, id]
        );
      } catch (dbErr) {
        console.error('[projectController] No se pudo guardar estado de error en DB:', dbErr);
      }
    }

    return res.status(400).json({
      success: false,
      project_id: id,
      tracking_status: 'error',
      tracking_error: err.message || 'Error al compilar targets.mind',
      error: err.message
    });
  }
};

