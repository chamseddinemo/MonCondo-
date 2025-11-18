const Document = require('../models/Document');
const fs = require('fs');
const path = require('path');

// @desc    Obtenir tous les documents
// @route   GET /api/documents
// @access  Private
exports.getDocuments = async (req, res) => {
  try {
    const { building, unit, category } = req.query;
    const query = {};

    if (building) query.building = building;
    if (unit) query.unit = unit;
    if (category) query.category = category;

    // Vérifier les permissions selon le rôle
    if (req.user.role !== 'admin') {
      const userUnits = await require('../models/Unit').find({
        $or: [
          { proprietaire: req.user.id },
          { locataire: req.user.id }
        ]
      }).select('_id');

      query.$or = [
        { isPublic: true },
        { uploadedBy: req.user.id },
        { accessRoles: req.user.role },
        { unit: { $in: userUnits.map(u => u._id) } }
      ];
    }

    const documents = await Document.find(query)
      .populate('building', 'name')
      .populate('unit', 'unitNumber')
      .populate('uploadedBy', 'firstName lastName email')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Obtenir un document par ID
// @route   GET /api/documents/:id
// @access  Private
exports.getDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('building', 'name')
      .populate('unit', 'unitNumber')
      .populate('uploadedBy', 'firstName lastName email');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin') {
      const hasAccess = document.isPublic ||
        document.uploadedBy.toString() === req.user.id ||
        document.accessRoles.includes(req.user.role);

      if (!hasAccess && document.unit) {
        const unit = await require('../models/Unit').findById(document.unit);
        if (unit) {
          const isOwner = unit.proprietaire && unit.proprietaire.toString() === req.user.id;
          const isTenant = unit.locataire && unit.locataire.toString() === req.user.id;
          if (!isOwner && !isTenant) {
            return res.status(403).json({
              success: false,
              message: 'Accès non autorisé'
            });
          }
        }
      } else if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: document
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Télécharger un document
// @route   GET /api/documents/:id/download
// @access  Private
exports.downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Vérifier les permissions (même logique que getDocument)
    if (req.user.role !== 'admin') {
      const hasAccess = document.isPublic ||
        document.uploadedBy.toString() === req.user.id ||
        document.accessRoles.includes(req.user.role);

      if (!hasAccess && document.unit) {
        const unit = await require('../models/Unit').findById(document.unit);
        if (unit) {
          const isOwner = unit.proprietaire && unit.proprietaire.toString() === req.user.id;
          const isTenant = unit.locataire && unit.locataire.toString() === req.user.id;
          if (!isOwner && !isTenant) {
            return res.status(403).json({
              success: false,
              message: 'Accès non autorisé'
            });
          }
        }
      } else if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé'
        });
      }
    }

    const filePath = path.join(__dirname, '..', document.path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé sur le serveur'
      });
    }

    // Incrémenter le compteur de téléchargements
    document.downloadCount += 1;
    await document.save();

    res.download(filePath, document.originalName);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Upload un document
// @route   POST /api/documents
// @access  Private
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    const { building, unit, category, description, accessRoles, isPublic } = req.body;

    // Si une unité est fournie, récupérer le building automatiquement
    let buildingId = building;
    if (unit && !building) {
      const Unit = require('../models/Unit');
      const unitDoc = await Unit.findById(unit).select('building');
      if (unitDoc && unitDoc.building) {
        buildingId = unitDoc.building.toString();
      }
    }

    // Validation : le building est requis selon le modèle
    if (!buildingId) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'L\'immeuble est requis. Veuillez sélectionner une unité ou un immeuble.'
      });
    }

    // Convertir le chemin absolu en chemin relatif
    const relativePath = path.relative(path.join(__dirname, '..'), req.file.path);

    const document = await Document.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: relativePath,
      mimeType: req.file.mimetype,
      size: req.file.size,
      building: buildingId,
      unit: unit || null,
      uploadedBy: req.user.id,
      category: category || 'autre',
      description: description || '',
      accessRoles: accessRoles ? JSON.parse(accessRoles) : [],
      isPublic: isPublic === 'true' || false
    });

    res.status(201).json({
      success: true,
      message: 'Document uploadé avec succès',
      data: document
    });
  } catch (error) {
    // Supprimer le fichier si l'enregistrement échoue
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mettre à jour un document
// @route   PUT /api/documents/:id
// @access  Private
exports.updateDocument = async (req, res) => {
  try {
    let document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin' && document.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    document = await Document.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: document
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Supprimer un document
// @route   DELETE /api/documents/:id
// @access  Private
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin' && document.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Supprimer le fichier physique
    const filePath = path.join(__dirname, '..', document.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await document.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Document supprimé',
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

