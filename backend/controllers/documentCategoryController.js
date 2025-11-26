const DocumentCategory = require('../models/DocumentCategory');
const Document = require('../models/Document');

// @desc    Obtenir toutes les catégories
// @route   GET /api/documents/categories
// @access  Private
exports.getCategories = async (req, res) => {
  try {
    const categories = await DocumentCategory.find()
      .populate('createdBy', 'firstName lastName')
      .sort('name');

    // Ajouter le nombre de documents par catégorie
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const count = await Document.countDocuments({ category: category._id });
        return {
          ...category.toObject(),
          documentCount: count
        };
      })
    );

    res.status(200).json({
      success: true,
      count: categoriesWithCount.length,
      data: categoriesWithCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Créer une catégorie
// @route   POST /api/documents/categories
// @access  Private (Admin seulement)
exports.createCategory = async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;

    // Vérifier si la catégorie existe déjà
    const existingCategory = await DocumentCategory.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Une catégorie avec ce nom existe déjà'
      });
    }

    const category = await DocumentCategory.create({
      name,
      description,
      color: color || '#3B82F6',
      icon: icon || 'file',
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Catégorie créée avec succès',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mettre à jour une catégorie
// @route   PUT /api/documents/categories/:id
// @access  Private (Admin seulement)
exports.updateCategory = async (req, res) => {
  try {
    let category = await DocumentCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      });
    }

    // Ne pas permettre la modification des catégories système
    if (category.isSystem && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Les catégories système ne peuvent pas être modifiées'
      });
    }

    category = await DocumentCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Catégorie mise à jour',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Supprimer une catégorie
// @route   DELETE /api/documents/categories/:id
// @access  Private (Admin seulement)
exports.deleteCategory = async (req, res) => {
  try {
    const category = await DocumentCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Catégorie non trouvée'
      });
    }

    // Ne pas permettre la suppression des catégories système
    if (category.isSystem) {
      return res.status(403).json({
        success: false,
        message: 'Les catégories système ne peuvent pas être supprimées'
      });
    }

    // Vérifier si des documents utilisent cette catégorie
    const documentsCount = await Document.countDocuments({ category: category._id });
    if (documentsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer cette catégorie car ${documentsCount} document(s) l'utilise(nt)`
      });
    }

    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Catégorie supprimée',
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

