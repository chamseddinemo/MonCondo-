const DocumentFolder = require('../models/DocumentFolder');
const Document = require('../models/Document');
const Unit = require('../models/Unit');

// @desc    Obtenir tous les dossiers
// @route   GET /api/documents/folders
// @access  Private
exports.getFolders = async (req, res) => {
  try {
    const { building, unit, parentFolder } = req.query;
    const query = {};

    if (building) query.building = building;
    if (unit) query.unit = unit;
    if (parentFolder === 'null' || parentFolder === null) {
      query.parentFolder = null;
    } else if (parentFolder) {
      query.parentFolder = parentFolder;
    }

    // Vérifier les permissions selon le rôle
    if (req.user.role !== 'admin') {
      const userUnits = await Unit.find({
        $or: [
          { proprietaire: req.user.id },
          { locataire: req.user.id }
        ]
      }).select('_id');

      query.$or = [
        { isPublic: true },
        { createdBy: req.user.id },
        { accessRoles: req.user.role },
        { unit: { $in: userUnits.map(u => u._id) } }
      ];
    }

    const folders = await DocumentFolder.find(query)
      .populate('building', 'name')
      .populate('unit', 'unitNumber')
      .populate('parentFolder', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort('name');

    // Ajouter le nombre de documents et sous-dossiers
    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => {
        const documentCount = await Document.countDocuments({ folder: folder._id });
        const subfolderCount = await DocumentFolder.countDocuments({ parentFolder: folder._id });
        return {
          ...folder.toObject(),
          documentCount,
          subfolderCount
        };
      })
    );

    res.status(200).json({
      success: true,
      count: foldersWithCounts.length,
      data: foldersWithCounts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Obtenir l'arborescence des dossiers
// @route   GET /api/documents/folders/tree
// @access  Private
exports.getFolderTree = async (req, res) => {
  try {
    const { building, unit } = req.query;
    const query = { building };

    if (unit) query.unit = unit;

    // Vérifier les permissions
    if (req.user.role !== 'admin') {
      const userUnits = await Unit.find({
        $or: [
          { proprietaire: req.user.id },
          { locataire: req.user.id }
        ]
      }).select('_id');

      query.$or = [
        { isPublic: true },
        { createdBy: req.user.id },
        { accessRoles: req.user.role },
        { unit: { $in: userUnits.map(u => u._id) } }
      ];
    }

    const folders = await DocumentFolder.find(query)
      .populate('building', 'name')
      .populate('unit', 'unitNumber')
      .populate('createdBy', 'firstName lastName')
      .sort('name');

    // Construire l'arborescence
    const buildTree = (parentId = null) => {
      return folders
        .filter(folder => {
          const folderParentId = folder.parentFolder ? folder.parentFolder.toString() : null;
          return folderParentId === parentId;
        })
        .map(folder => ({
          ...folder.toObject(),
          children: buildTree(folder._id.toString())
        }));
    };

    const tree = buildTree();

    res.status(200).json({
      success: true,
      data: tree
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Créer un dossier
// @route   POST /api/documents/folders
// @access  Private
exports.createFolder = async (req, res) => {
  try {
    const { name, description, parentFolder, building, unit, accessRoles, isPublic } = req.body;

    if (!name || !building) {
      return res.status(400).json({
        success: false,
        message: 'Le nom et l\'immeuble sont requis'
      });
    }

    // Si une unité est fournie, récupérer le building automatiquement
    let buildingId = building;
    if (unit && !building) {
      const unitDoc = await Unit.findById(unit).select('building');
      if (unitDoc && unitDoc.building) {
        buildingId = unitDoc.building.toString();
      }
    }

    // Vérifier que le dossier parent existe si fourni
    if (parentFolder) {
      const parent = await DocumentFolder.findById(parentFolder);
      if (!parent) {
        return res.status(404).json({
          success: false,
          message: 'Dossier parent non trouvé'
        });
      }
    }

    const folder = await DocumentFolder.create({
      name,
      description,
      parentFolder: parentFolder || null,
      building: buildingId,
      unit: unit || null,
      accessRoles: accessRoles || [],
      isPublic: isPublic || false,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Dossier créé avec succès',
      data: folder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mettre à jour un dossier
// @route   PUT /api/documents/folders/:id
// @access  Private
exports.updateFolder = async (req, res) => {
  try {
    let folder = await DocumentFolder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Dossier non trouvé'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin' && folder.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Empêcher de mettre un dossier comme son propre parent
    if (req.body.parentFolder && req.body.parentFolder === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Un dossier ne peut pas être son propre parent'
      });
    }

    folder = await DocumentFolder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Dossier mis à jour',
      data: folder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Supprimer un dossier
// @route   DELETE /api/documents/folders/:id
// @access  Private
exports.deleteFolder = async (req, res) => {
  try {
    const folder = await DocumentFolder.findById(req.params.id);

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Dossier non trouvé'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin' && folder.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Vérifier s'il y a des documents dans ce dossier
    const documentsCount = await Document.countDocuments({ folder: folder._id });
    if (documentsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer ce dossier car il contient ${documentsCount} document(s)`
      });
    }

    // Vérifier s'il y a des sous-dossiers
    const subfoldersCount = await DocumentFolder.countDocuments({ parentFolder: folder._id });
    if (subfoldersCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer ce dossier car il contient ${subfoldersCount} sous-dossier(s)`
      });
    }

    await folder.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Dossier supprimé',
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

