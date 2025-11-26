const Document = require('../models/Document');
const fs = require('fs');
const path = require('path');

// @desc    Obtenir tous les documents avec recherche avancée
// @route   GET /api/documents
// @access  Private
exports.getDocuments = async (req, res) => {
  try {
    const {
      building,
      unit,
      category,
      folder,
      tags,
      search,
      sortBy,
      sortOrder,
      isArchived,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    // Filtres de base
    if (building) query.building = building;
    if (unit) query.unit = unit;
    if (category) query.category = category;
    if (folder) query.folder = folder;
    if (isArchived !== undefined) query.isArchived = isArchived === 'true';

    // Filtre par tags
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      query.tags = { $in: tagArray };
    }

    // Recherche textuelle
    if (search) {
      query.$or = [
        { filename: { $regex: search, $options: 'i' } },
        { originalName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Vérifier les permissions selon le rôle
    if (req.user.role !== 'admin') {
      const Unit = require('../models/Unit');
      const userUnits = await Unit.find({
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

    // Options de tri
    let sortOptions = {};
    const order = sortOrder === 'asc' ? 1 : -1;
    
    switch (sortBy) {
      case 'name':
        sortOptions = { originalName: order };
        break;
      case 'size':
        sortOptions = { size: order };
        break;
      case 'date':
        sortOptions = { createdAt: order };
        break;
      case 'downloads':
        sortOptions = { downloadCount: order };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const documents = await Document.find(query)
      .populate('building', 'name')
      .populate('unit', 'unitNumber')
      .populate('category', 'name color icon')
      .populate('folder', 'name')
      .populate('tags', 'name color')
      .populate('uploadedBy', 'firstName lastName email')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const total = await Document.countDocuments(query);

    res.status(200).json({
      success: true,
      count: documents.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
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
      .populate('category', 'name color icon')
      .populate('folder', 'name')
      .populate('tags', 'name color')
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

    const { building, unit, category, folder, tags, description, accessRoles, isPublic, metadata } = req.body;

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

    // Traiter les tags
    let tagIds = [];
    if (tags) {
      const DocumentTag = require('../models/DocumentTag');
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      
      // Créer ou récupérer les tags
      for (const tagName of tagArray) {
        const normalizedName = tagName.toLowerCase().trim().replace(/\s+/g, '-');
        let tag = await DocumentTag.findOne({ name: normalizedName });
        
        if (!tag) {
          tag = await DocumentTag.create({
            name: normalizedName,
            createdBy: req.user.id
          });
        }
        tagIds.push(tag._id);
      }
    }

    const document = await Document.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: relativePath,
      mimeType: req.file.mimetype,
      size: req.file.size,
      building: buildingId,
      unit: unit || null,
      uploadedBy: req.user.id,
      category: category || null,
      folder: folder || null,
      tags: tagIds,
      description: description || '',
      accessRoles: accessRoles ? (Array.isArray(accessRoles) ? accessRoles : JSON.parse(accessRoles)) : [],
      isPublic: isPublic === 'true' || false,
      metadata: metadata ? (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : {}
    });

    // Mettre à jour les compteurs d'utilisation des tags
    if (tagIds.length > 0) {
      const DocumentTag = require('../models/DocumentTag');
      await DocumentTag.updateMany(
        { _id: { $in: tagIds } },
        { $inc: { usageCount: 1 } }
      );
    }

    // Mettre à jour le compteur de documents du dossier
    if (folder) {
      const DocumentFolder = require('../models/DocumentFolder');
      await DocumentFolder.findByIdAndUpdate(folder, { $inc: { documentCount: 1 } });
    }

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

    // Gérer la mise à jour des tags
    if (req.body.tags) {
      const DocumentTag = require('../models/DocumentTag');
      const oldDocument = await Document.findById(req.params.id).select('tags');
      const oldTagIds = oldDocument.tags.map(t => t.toString());
      
      const newTagArray = Array.isArray(req.body.tags) ? req.body.tags : req.body.tags.split(',');
      const newTagIds = [];
      
      for (const tagName of newTagArray) {
        const normalizedName = tagName.toLowerCase().trim().replace(/\s+/g, '-');
        let tag = await DocumentTag.findOne({ name: normalizedName });
        
        if (!tag) {
          tag = await DocumentTag.create({
            name: normalizedName,
            createdBy: req.user.id
          });
        }
        newTagIds.push(tag._id.toString());
      }
      
      req.body.tags = newTagIds;
      
      // Mettre à jour les compteurs d'utilisation
      const tagsToIncrement = newTagIds.filter(id => !oldTagIds.includes(id));
      const tagsToDecrement = oldTagIds.filter(id => !newTagIds.includes(id));
      
      if (tagsToIncrement.length > 0) {
        await DocumentTag.updateMany(
          { _id: { $in: tagsToIncrement } },
          { $inc: { usageCount: 1 } }
        );
      }
      
      if (tagsToDecrement.length > 0) {
        await DocumentTag.updateMany(
          { _id: { $in: tagsToDecrement } },
          { $inc: { usageCount: -1 } }
        );
      }
    }

    // Gérer l'archivage
    if (req.body.isArchived !== undefined) {
      req.body.archivedAt = req.body.isArchived ? new Date() : null;
    }

    document = await Document.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
    .populate('category', 'name color icon')
    .populate('folder', 'name')
    .populate('tags', 'name color');

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

    // Mettre à jour les compteurs d'utilisation des tags
    if (document.tags && document.tags.length > 0) {
      const DocumentTag = require('../models/DocumentTag');
      await DocumentTag.updateMany(
        { _id: { $in: document.tags } },
        { $inc: { usageCount: -1 } }
      );
    }

    // Mettre à jour le compteur de documents du dossier
    if (document.folder) {
      const DocumentFolder = require('../models/DocumentFolder');
      await DocumentFolder.findByIdAndUpdate(document.folder, { $inc: { documentCount: -1 } });
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

