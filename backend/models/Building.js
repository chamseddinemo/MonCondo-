const mongoose = require('mongoose');

const buildingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom de l\'immeuble est requis'],
    trim: true
  },
  address: {
    street: {
      type: String,
      required: [true, 'L\'adresse est requise'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'La ville est requise'],
      trim: true
    },
    province: {
      type: String,
      required: [true, 'La province est requise'],
      trim: true
    },
    postalCode: {
      type: String,
      required: [true, 'Le code postal est requis'],
      trim: true
    },
    country: {
      type: String,
      default: 'Canada',
      trim: true
    }
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Un administrateur est requis']
  },
  totalUnits: {
    type: Number,
    default: 0
  },
  yearBuilt: Number,
  description: String,
  amenities: [{
    type: String,
    trim: true
  }],
  image: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
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

buildingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // La génération d'image sera faite après la création dans le contrôleur
  // car this._id peut ne pas être disponible dans pre-save lors de la création
  next();
});

// Virtual pour obtenir l'URL de l'image (uniquement image stockée par l'admin)
buildingSchema.virtual('imageUrl').get(function() {
  // Retourner uniquement l'image uploadée par l'admin
  if (this.image) {
    return this.image;
  }
  // Pas d'image - retourner null (le frontend utilisera un placeholder)
  return null;
});

// S'assurer que les virtuals sont inclus dans JSON
buildingSchema.set('toJSON', { virtuals: true });
buildingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Building', buildingSchema);

