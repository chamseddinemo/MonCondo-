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
    type: String,
    enum: ['contrat', 'facture', 'maintenance', 'reglement', 'autre'],
    default: 'autre'
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
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

documentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Document', documentSchema);

