const db = require('../config/db');
const storageService = require('../services/storageService');
const fs = require('fs');

/**
 * AR Studio - Asset Controller
 * Persistencia de metadatos de modelos 3D, imágenes, video y audio en PostgreSQL Neon.
 * Los archivos binarios residen en Cloudinary.
 */

exports.getAssetsByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const result = await db.query(
      'SELECT * FROM assets WHERE project_id = $1 ORDER BY created_at ASC',
      [projectId]
    );

    const parsed = result.rows.map(a => ({
      ...a,
      configuration: typeof a.configuration === 'string' ? JSON.parse(a.configuration) : (a.configuration || {})
    }));

    return res.status(200).json({ success: true, data: parsed });
  } catch (error) {
    next(error);
  }
};

exports.uploadAsset = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No se ha subido ningún archivo' });
    }

    const buffer = req.file.buffer || (req.file.path && fs.existsSync(req.file.path) ? fs.readFileSync(req.file.path) : null);
    if (!buffer) {
      return res.status(400).json({ success: false, error: 'No se pudo leer el contenido del archivo' });
    }

    const projectId = req.body.projectId || req.body.project_id;
    const category = req.body.category || 'models';

    // Subir a través de storageService (Cloudinary / Local)
    const saved = await storageService.saveFile({
      filename: req.file.originalname,
      buffer,
      mimeType: req.file.mimetype,
      projectId,
      category
    });

    // Limpiar archivo temporal si provino de disco y se guardó en Cloudinary
    if (saved.provider === 'cloudinary' && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }

    return res.status(201).json({
      success: true,
      message: 'Archivo subido exitosamente',
      file_url: saved.secure_url || saved.url,
      provider: saved.provider,
      public_id: saved.public_id,
      original_name: req.file.originalname,
      size: saved.bytes
    });
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    next(error);
  }
};

exports.createAsset = async (req, res, next) => {
  try {
    const {
      project_id, marker_id, type, file_url,
      position_x, position_y, position_z,
      rotation_x, rotation_y, rotation_z,
      scale_x, scale_y, scale_z, configuration
    } = req.body;

    const newId = req.body.id || `asset-${Date.now()}`;

    const cleanFileUrl = (file_url && !file_url.startsWith('blob:')) ? file_url : '';

    const result = await db.query(
      `INSERT INTO assets (id, project_id, marker_id, type, file_url, position_x, position_y, position_z, rotation_x, rotation_y, rotation_z, scale_x, scale_y, scale_z, configuration, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        newId, project_id, marker_id || null, type || 'model3d', cleanFileUrl,
        position_x || 0, position_y || 0, position_z || 0,
        rotation_x || 0, rotation_y || 0, rotation_z || 0,
        scale_x || 1, scale_y || 1, scale_z || 1,
        JSON.stringify(configuration || {})
      ]
    );

    const created = result.rows[0];
    if (typeof created.configuration === 'string') {
      try { created.configuration = JSON.parse(created.configuration); } catch (e) {}
    }

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

exports.deleteAsset = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Buscar asset por id para obtener metadata y file_url
    const assetRes = await db.query('SELECT * FROM assets WHERE id = $1', [id]);
    if (assetRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contenido digital no encontrado' });
    }

    const asset = assetRes.rows[0];
    const fileUrl = asset.file_url;
    const assetType = (asset.type || 'model3d').toLowerCase();

    // 2. Eliminar registro de PostgreSQL Neon
    await db.query('DELETE FROM assets WHERE id = $1', [id]);
    console.log(`[assetController] Registro eliminado de Neon para asset: ${id}`);

    // 3. Eliminar archivo de Cloudinary/almacenamiento si existe y no es tipo texto
    if (fileUrl && assetType !== 'text' && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('/uploads/'))) {
      // Verificar si otro asset o marcador sigue usando este mismo archivo
      const otherAssetsRes = await db.query(
        'SELECT COUNT(*) FROM assets WHERE file_url = $1 AND id != $2',
        [fileUrl, id]
      );
      const otherMarkersRes = await db.query(
        'SELECT COUNT(*) FROM markers WHERE target_image = $1',
        [fileUrl]
      );
      const isStillReferenced = parseInt(otherAssetsRes.rows[0]?.count || 0, 10) > 0 ||
                                parseInt(otherMarkersRes.rows[0]?.count || 0, 10) > 0;

      if (!isStillReferenced) {
        try {
          const resourceType = (assetType === 'model3d' || assetType === 'model') ? 'raw' : undefined;
          await storageService.deleteFile(fileUrl, { resource_type: resourceType });
          console.log(`[assetController] Archivo eliminado de almacenamiento: ${fileUrl}`);
        } catch (storageErr) {
          console.warn(`[assetController] Advertencia al eliminar archivo de Cloudinary (${fileUrl}):`, storageErr.message);
        }
      } else {
        console.log(`[assetController] El archivo ${fileUrl} sigue referenciado por otro elemento. Se conserva en Cloudinary.`);
      }
    }

    // 4. Responder
    return res.status(200).json({
      success: true,
      message: 'Contenido digital eliminado exitosamente',
      deleted_id: id
    });
  } catch (error) {
    next(error);
  }
};
