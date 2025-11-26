const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middlewares/auth');
const { uploadUnitImages, uploadBuildingImages, imageUpload } = require('../controllers/imageUploadController');

// Log pour confirmer que les routes sont chargées
console.log('[UPLOAD ROUTES] ✅ Routes d\'upload chargées');
console.log('[UPLOAD ROUTES]   - POST /upload/units/images (avec traitement avancé)');
console.log('[UPLOAD ROUTES]   - POST /upload/buildings/images (avec traitement avancé)');
console.log('[UPLOAD ROUTES]   - POST /upload/messages');

router.use(protect);

// Route pour uploader des fichiers pour les messages
router.post('/messages', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    const files = req.files.map(file => ({
      originalname: file.originalname,
      filename: file.filename,
      path: path.join(req.user._id.toString(), file.filename).replace(/\\/g, '/'),
      size: file.size,
      mimetype: file.mimetype
    }));

    res.status(200).json({
      success: true,
      message: 'Fichiers uploadés avec succès',
      files: files
    });
  } catch (error) {
    console.error('[UPLOAD MESSAGES] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'upload des fichiers'
    });
  }
});

// Route pour uploader des images d'unités (avec traitement avancé: redimensionnement, compression, WebP)
router.post('/units/images', imageUpload.array('images', 10), uploadUnitImages);

// Route pour uploader des images d'immeubles (avec traitement avancé: redimensionnement, compression, WebP)
router.post('/buildings/images', imageUpload.array('images', 10), uploadBuildingImages);

module.exports = router;
