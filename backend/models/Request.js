const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Le titre est requis'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'La description est requise'],
    trim: true
  },
  type: {
    type: String,
    enum: ['maintenance', 'location', 'achat', 'service', 'reclamation', 'autre'],
    required: [true, 'Le type de demande est requis']
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit'
  },
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building'
    // Rendu optionnel pour permettre aux locataires de créer des demandes sans unité assignée
    // required: [true, 'L\'immeuble est requis']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le créateur est requis']
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  priority: {
    type: String,
    enum: ['faible', 'moyenne', 'haute', 'urgente'],
    default: 'moyenne'
  },
  status: {
    type: String,
    enum: ['en_attente', 'en_cours', 'termine', 'accepte', 'refuse'],
    default: 'en_attente'
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['en_attente', 'en_cours', 'termine', 'accepte', 'refuse']
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    comment: String
  }],
  // Informations pour l'approbation
  rejectionReason: String,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,
  // Documents générés
  generatedDocuments: [{
    type: {
      type: String,
      enum: ['bail', 'contrat_vente', 'autre']
    },
    filename: String,
    path: String,
    signed: Boolean,
    signedAt: Date,
    signedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    generatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Paiements associés
  initialPayment: {
    amount: Number,
    status: {
      type: String,
      enum: ['en_attente', 'paye', 'en_retard'],
      default: 'en_attente'
    },
    paidAt: Date,
    paymentMethod: String,
    transactionId: String
  },
  // Commentaires internes de l'admin
  adminNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  attachments: [{
    filename: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  estimatedCost: Number,
  actualCost: Number,
  completedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware pour enregistrer l'historique des changements de statut
requestSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    const historyEntry = {
      status: this.status,
      changedBy: this.assignedTo || this.createdBy,
      changedAt: new Date()
    };
    
    if (!this.statusHistory) {
      this.statusHistory = [];
    }
    
    // Éviter les doublons si le statut n'a pas vraiment changé
    const lastStatus = this.statusHistory[this.statusHistory.length - 1];
    if (!lastStatus || lastStatus.status !== this.status) {
      this.statusHistory.push(historyEntry);
    }
  }
  
  this.updatedAt = Date.now();
  next();
});

// Index pour accélérer les requêtes fréquentes
requestSchema.index({ createdAt: -1 });
requestSchema.index({ updatedAt: -1 });
requestSchema.index({ status: 1, priority: 1 });
requestSchema.index({ building: 1 });
requestSchema.index({ unit: 1 });
requestSchema.index({ createdBy: 1 });
requestSchema.index({ assignedTo: 1, status: 1 });

module.exports = mongoose.model('Request', requestSchema);

