const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middlewares/auth');

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

module.exports = router;

