const mongoose = require('mongoose');

const documentTagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom du tag est requis'],
    trim: true,
    unique: true,
    lowercase: true
  },
  color: {
    type: String,
    default: '#6B7280' // Gris par défaut
  },
  usageCount: {
    type: Number,
    default: 0
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

documentTagSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index pour recherche rapide
documentTagSchema.index({ name: 'text' });

module.exports = mongoose.model('DocumentTag', documentTagSchema);

