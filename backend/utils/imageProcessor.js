/**
 * Utilitaire de traitement d'images avancé
 * Redimensionnement, compression, conversion WebP, génération de miniatures
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Résolutions prédéfinies
const RESOLUTIONS = {
  thumbnail: { width: 150, height: 150, quality: 80 },
  medium: { width: 800, height: 600, quality: 85 },
  large: { width: 1920, height: 1080, quality: 90 },
  original: { quality: 95 }
};

/**
 * Traite une image et génère toutes les résolutions
 * @param {string} inputPath - Chemin de l'image source
 * @param {string} outputDir - Dossier de sortie
 * @param {string} baseName - Nom de base pour les fichiers générés
 * @returns {Promise<Object>} Objet avec les chemins des images générées
 */
async function processImage(inputPath, outputDir, baseName) {
  try {
    // Créer le dossier de sortie s'il n'existe pas
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const results = {
      original: null,
      thumbnail: null,
      medium: null,
      large: null,
      webp: {
        thumbnail: null,
        medium: null,
        large: null,
        original: null
      },
      sizes: {}
    };

    // Lire les métadonnées de l'image originale
    const metadata = await sharp(inputPath).metadata();
    const originalSize = fs.statSync(inputPath).size;
    results.sizes.original = originalSize;

    // Générer les différentes résolutions en JPEG
    for (const [key, config] of Object.entries(RESOLUTIONS)) {
      if (key === 'original') {
        // Copier l'original optimisé
        const originalPath = path.join(outputDir, `${baseName}.jpg`);
        await sharp(inputPath)
          .jpeg({ quality: config.quality, mozjpeg: true })
          .toFile(originalPath);
        results.original = originalPath;
        results.sizes.original = fs.statSync(originalPath).size;
      } else {
        // Redimensionner et compresser
        const outputPath = path.join(outputDir, `${baseName}_${key}.jpg`);
        await sharp(inputPath)
          .resize(config.width, config.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: config.quality, mozjpeg: true })
          .toFile(outputPath);
        
        results[key] = outputPath;
        results.sizes[key] = fs.statSync(outputPath).size;
      }
    }

    // Générer les versions WebP
    for (const [key, config] of Object.entries(RESOLUTIONS)) {
      if (key === 'original') {
        const webpPath = path.join(outputDir, `${baseName}.webp`);
        await sharp(inputPath)
          .webp({ quality: config.quality })
          .toFile(webpPath);
        results.webp.original = webpPath;
        results.sizes.webpOriginal = fs.statSync(webpPath).size;
      } else {
        const webpPath = path.join(outputDir, `${baseName}_${key}.webp`);
        await sharp(inputPath)
          .resize(config.width, config.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: config.quality })
          .toFile(webpPath);
        
        results.webp[key] = webpPath;
        results.sizes[`webp${key.charAt(0).toUpperCase() + key.slice(1)}`] = fs.statSync(webpPath).size;
      }
    }

    return results;
  } catch (error) {
    console.error('[IMAGE PROCESSOR] Erreur:', error);
    throw new Error(`Erreur lors du traitement de l'image: ${error.message}`);
  }
}

/**
 * Traite plusieurs images en parallèle
 * @param {Array} images - Tableau d'objets {path, baseName}
 * @param {string} outputDir - Dossier de sortie
 * @returns {Promise<Array>} Tableau des résultats
 */
async function processMultipleImages(images, outputDir) {
  const promises = images.map(img => processImage(img.path, outputDir, img.baseName));
  return Promise.all(promises);
}

/**
 * Optimise une image existante (compression sans redimensionnement)
 * @param {string} inputPath - Chemin de l'image source
 * @param {string} outputPath - Chemin de sortie
 * @param {number} quality - Qualité (1-100)
 * @returns {Promise<string>} Chemin de l'image optimisée
 */
async function optimizeImage(inputPath, outputPath, quality = 85) {
  try {
    await sharp(inputPath)
      .jpeg({ quality, mozjpeg: true })
      .toFile(outputPath);
    return outputPath;
  } catch (error) {
    throw new Error(`Erreur lors de l'optimisation: ${error.message}`);
  }
}

/**
 * Convertit une image en WebP
 * @param {string} inputPath - Chemin de l'image source
 * @param {string} outputPath - Chemin de sortie
 * @param {number} quality - Qualité (1-100)
 * @returns {Promise<string>} Chemin de l'image WebP
 */
async function convertToWebP(inputPath, outputPath, quality = 85) {
  try {
    await sharp(inputPath)
      .webp({ quality })
      .toFile(outputPath);
    return outputPath;
  } catch (error) {
    throw new Error(`Erreur lors de la conversion WebP: ${error.message}`);
  }
}

/**
 * Génère uniquement une miniature
 * @param {string} inputPath - Chemin de l'image source
 * @param {string} outputPath - Chemin de sortie
 * @param {number} size - Taille de la miniature (carré)
 * @returns {Promise<string>} Chemin de la miniature
 */
async function generateThumbnail(inputPath, outputPath, size = 150) {
  try {
    await sharp(inputPath)
      .resize(size, size, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(outputPath);
    return outputPath;
  } catch (error) {
    throw new Error(`Erreur lors de la génération de la miniature: ${error.message}`);
  }
}

/**
 * Nettoie les fichiers temporaires
 * @param {Array} paths - Tableau de chemins à supprimer
 */
function cleanupFiles(paths) {
  paths.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`[IMAGE PROCESSOR] Erreur suppression ${filePath}:`, error);
    }
  });
}

module.exports = {
  processImage,
  processMultipleImages,
  optimizeImage,
  convertToWebP,
  generateThumbnail,
  cleanupFiles,
  RESOLUTIONS
};

