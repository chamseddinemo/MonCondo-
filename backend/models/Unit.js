const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'L\'immeuble est requis']
  },
  unitNumber: {
    type: String,
    required: [true, 'Le numéro d\'unité est requis'],
    trim: true
  },
  floor: {
    type: Number,
    required: [true, 'L\'étage est requis']
  },
  type: {
    type: String,
    enum: ['studio', '1br', '2br', '3br', '4br', 'penthouse', 'commercial'],
    required: [true, 'Le type d\'unité est requis']
  },
  size: {
    type: Number,
    required: [true, 'La superficie est requise']
  },
  bedrooms: {
    type: Number,
    default: 0
  },
  bathrooms: {
    type: Number,
    default: 1
  },
  proprietaire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  locataire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['disponible', 'loue', 'vendu', 'maintenance', 'negociation', 'vendue_louee'],
    default: 'disponible'
  },
  rentPrice: Number,
  salePrice: Number,
  // Prix unique (peut être loyer ou prix de vente selon transactionType)
  prix: {
    type: Number,
    min: 0
  },
  monthlyCharges: {
    type: Number,
    default: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  availableFrom: Date,
  description: String,
  features: [{
    type: String,
    trim: true
  }],
  // Champs pour consultation intelligente
  titre: {
    type: String,
    trim: true
  },
  ville: {
    type: String,
    trim: true
  },
  quartier: {
    type: String,
    trim: true
  },
  transactionType: {
    type: String,
    enum: ['vente', 'location'],
    default: 'location'
  },
  etatRenovation: {
    type: String,
    enum: ['renovation_complete', 'renovation_partielle', 'acceptable'],
    default: 'acceptable'
  },
  nombrePieces: {
    type: Number,
    default: 0
  },
  images: [{
    type: String,
    trim: true
  }],
  datePublication: {
    type: Date,
    default: Date.now
  },
  isPremium: {
    type: Boolean,
    default: false
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

unitSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // La génération d'image sera faite après la création dans le contrôleur
  // car this._id peut ne pas être disponible dans pre-save lors de la création
  next();
});

// Virtual pour obtenir l'URL de l'image (uniquement images stockées par l'admin)
unitSchema.virtual('imageUrl').get(function() {
  // Retourner uniquement les images uploadées par l'admin
  if (this.images && this.images.length > 0) {
    return this.images[0];
  }
  // Pas d'image - retourner null (le frontend utilisera un placeholder)
  return null;
});

// S'assurer que les virtuals sont inclus dans JSON
unitSchema.set('toJSON', { virtuals: true });
unitSchema.set('toObject', { virtuals: true });

// Index composé pour unitNumber et building
unitSchema.index({ building: 1, unitNumber: 1 }, { unique: true });

// Index pour recherche rapide
unitSchema.index({ ville: 1, quartier: 1 });
unitSchema.index({ transactionType: 1, status: 1 });
unitSchema.index({ datePublication: -1 });
unitSchema.index({ isPremium: 1, datePublication: -1 });
unitSchema.index({ prix: 1 }); // Pour tri par prix

module.exports = mongoose.model('Unit', unitSchema);

