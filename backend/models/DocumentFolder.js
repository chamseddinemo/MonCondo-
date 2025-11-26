const mongoose = require('mongoose');

const documentFolderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom du dossier est requis'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  parentFolder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentFolder',
    default: null // null = dossier racine
  },
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    default: null // null = dossier au niveau de l'immeuble
  },
  accessRoles: [{
    type: String,
    enum: ['admin', 'proprietaire', 'locataire', 'visiteur']
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documentCount: {
    type: Number,
    default: 0
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

documentFolderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index pour recherche rapide
documentFolderSchema.index({ name: 'text', description: 'text' });
documentFolderSchema.index({ building: 1, parentFolder: 1 });

module.exports = mongoose.model('DocumentFolder', documentFolderSchema);

