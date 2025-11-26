const mongoose = require('mongoose');

const documentCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom de la catégorie est requis'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    default: '#3B82F6' // Bleu par défaut
  },
  icon: {
    type: String,
    default: 'file'
  },
  isSystem: {
    type: Boolean,
    default: false // Catégories système ne peuvent pas être supprimées
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

documentCategorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index pour recherche rapide
documentCategorySchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('DocumentCategory', documentCategorySchema);

