/**
 * Contrôleur pour l'upload d'images avancé
 * Gère le redimensionnement, compression, WebP et génération de miniatures
 */

const path = require('path');
const fs = require('fs');
const { processImage, cleanupFiles } = require('../utils/imageProcessor');
const multer = require('multer');

// Configuration multer pour les images uniquement
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tempDir = path.join(__dirname, '../uploads/temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'img-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées (JPEG, PNG, GIF, WebP)'));
  }
};

const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB max
  },
  fileFilter: imageFilter
});

/**
 * Upload et traitement d'images pour unités
 */
exports.uploadUnitImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune image fournie'
      });
    }

    const frontendPublicPath = path.join(__dirname, '../../frontend/public/images/unites');
    const absolutePath = path.resolve(frontendPublicPath);
    
    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath, { recursive: true });
    }

    const processedImages = [];
    const tempFiles = [];

    for (const file of req.files) {
      try {
        const baseName = `unite_${Date.now()}_${Math.round(Math.random() * 1E9)}`;
        tempFiles.push(file.path);

        // Traiter l'image (générer toutes les résolutions)
        const results = await processImage(file.path, absolutePath, baseName);

        // Générer les URLs relatives
        const imageData = {
          original: `/images/unites/${path.basename(results.original)}`,
          thumbnail: `/images/unites/${path.basename(results.thumbnail)}`,
          medium: `/images/unites/${path.basename(results.medium)}`,
          large: `/images/unites/${path.basename(results.large)}`,
          webp: {
            thumbnail: `/images/unites/${path.basename(results.webp.thumbnail)}`,
            medium: `/images/unites/${path.basename(results.webp.medium)}`,
            large: `/images/unites/${path.basename(results.webp.large)}`,
            original: `/images/unites/${path.basename(results.webp.original)}`
          },
          sizes: results.sizes,
          originalName: file.originalname,
          mimetype: file.mimetype
        };

        processedImages.push(imageData);
      } catch (error) {
        console.error('[IMAGE UPLOAD] Erreur traitement:', error);
        // Continuer avec les autres images
      }
    }

    // Nettoyer les fichiers temporaires
    cleanupFiles(tempFiles);

    res.status(200).json({
      success: true,
      message: `${processedImages.length} image(s) traitée(s) avec succès`,
      images: processedImages
    });
  } catch (error) {
    console.error('[IMAGE UPLOAD] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors du traitement des images'
    });
  }
};

/**
 * Upload et traitement d'images pour immeubles
 */
exports.uploadBuildingImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune image fournie'
      });
    }

    const frontendPublicPath = path.join(__dirname, '../../frontend/public/images/immeubles');
    const absolutePath = path.resolve(frontendPublicPath);
    
    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath, { recursive: true });
    }

    const processedImages = [];
    const tempFiles = [];

    for (const file of req.files) {
      try {
        const baseName = `immeub_${Date.now()}_${Math.round(Math.random() * 1E9)}`;
        tempFiles.push(file.path);

        // Traiter l'image
        const results = await processImage(file.path, absolutePath, baseName);

        const imageData = {
          original: `/images/immeubles/${path.basename(results.original)}`,
          thumbnail: `/images/immeubles/${path.basename(results.thumbnail)}`,
          medium: `/images/immeubles/${path.basename(results.medium)}`,
          large: `/images/immeubles/${path.basename(results.large)}`,
          webp: {
            thumbnail: `/images/immeubles/${path.basename(results.webp.thumbnail)}`,
            medium: `/images/immeubles/${path.basename(results.webp.medium)}`,
            large: `/images/immeubles/${path.basename(results.webp.large)}`,
            original: `/images/immeubles/${path.basename(results.webp.original)}`
          },
          sizes: results.sizes,
          originalName: file.originalname,
          mimetype: file.mimetype
        };

        processedImages.push(imageData);
      } catch (error) {
        console.error('[IMAGE UPLOAD] Erreur traitement:', error);
      }
    }

    cleanupFiles(tempFiles);

    res.status(200).json({
      success: true,
      message: `${processedImages.length} image(s) traitée(s) avec succès`,
      images: processedImages
    });
  } catch (error) {
    console.error('[IMAGE UPLOAD] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors du traitement des images'
    });
  }
};

// Exporter le middleware multer
exports.imageUpload = imageUpload;

