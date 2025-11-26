const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: [true, 'Le nom du fichier est requis']
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: [true, 'Le chemin du fichier est requis']
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit'
  },
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'L\'immeuble est requis']
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utilisateur est requis']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentCategory',
    default: null
  },
  // Ancien champ category pour compatibilité (deprecated)
  categoryLegacy: {
    type: String,
    enum: ['contrat', 'facture', 'maintenance', 'reglement', 'autre'],
    default: null
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentTag'
  }],
  folder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentFolder',
    default: null
  },
  accessRoles: [{
    type: String,
    enum: ['admin', 'proprietaire', 'locataire', 'visiteur']
  }],
  description: String,
  isPublic: {
    type: Boolean,
    default: false
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  version: {
    type: Number,
    default: 1
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date,
    default: null
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
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

// Index pour recherche avancée
documentSchema.index({ filename: 'text', originalName: 'text', description: 'text' });
documentSchema.index({ building: 1, unit: 1, folder: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ category: 1 });
documentSchema.index({ isArchived: 1, createdAt: -1 });

documentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Document', documentSchema);

