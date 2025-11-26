const DocumentTag = require('../models/DocumentTag');
const Document = require('../models/Document');

// @desc    Obtenir tous les tags
// @route   GET /api/documents/tags
// @access  Private
exports.getTags = async (req, res) => {
  try {
    const { search, sortBy } = req.query;
    const query = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    let sortOptions = {};
    if (sortBy === 'usage') {
      sortOptions = { usageCount: -1 };
    } else {
      sortOptions = { name: 1 };
    }

    const tags = await DocumentTag.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort(sortOptions);

    res.status(200).json({
      success: true,
      count: tags.length,
      data: tags
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Créer un tag
// @route   POST /api/documents/tags
// @access  Private
exports.createTag = async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du tag est requis'
      });
    }

    // Normaliser le nom (minuscules, pas d'espaces multiples)
    const normalizedName = name.toLowerCase().trim().replace(/\s+/g, '-');

    // Vérifier si le tag existe déjà
    let tag = await DocumentTag.findOne({ name: normalizedName });

    if (tag) {
      // Si le tag existe, retourner le tag existant
      return res.status(200).json({
        success: true,
        message: 'Tag existant récupéré',
        data: tag
      });
    }

    tag = await DocumentTag.create({
      name: normalizedName,
      color: color || '#6B7280',
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Tag créé avec succès',
      data: tag
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mettre à jour un tag
// @route   PUT /api/documents/tags/:id
// @access  Private
exports.updateTag = async (req, res) => {
  try {
    let tag = await DocumentTag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag non trouvé'
      });
    }

    tag = await DocumentTag.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Tag mis à jour',
      data: tag
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Supprimer un tag
// @route   DELETE /api/documents/tags/:id
// @access  Private
exports.deleteTag = async (req, res) => {
  try {
    const tag = await DocumentTag.findById(req.params.id);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag non trouvé'
      });
    }

    // Vérifier si des documents utilisent ce tag
    const documentsCount = await Document.countDocuments({ tags: tag._id });
    if (documentsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer ce tag car ${documentsCount} document(s) l'utilise(nt)`
      });
    }

    await tag.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Tag supprimé',
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mettre à jour le compteur d'utilisation d'un tag
// @route   PATCH /api/documents/tags/:id/usage
// @access  Private
exports.updateTagUsage = async (tagId, increment = true) => {
  try {
    const tag = await DocumentTag.findById(tagId);
    if (tag) {
      tag.usageCount = increment ? tag.usageCount + 1 : Math.max(0, tag.usageCount - 1);
      await tag.save();
    }
  } catch (error) {
    console.error('Erreur mise à jour usage tag:', error);
  }
};

