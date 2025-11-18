const mongoose = require('mongoose');

/**
 * Modèle Payment - Système de paiement simplifié et sécurisé
 * Gère les factures et paiements pour locataires, propriétaires et administration
 */
const paymentSchema = new mongoose.Schema({
  // Relations
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: [true, 'L\'unité est requise']
  },
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: [true, 'L\'immeuble est requis']
  },
  payer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le payeur est requis']
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // Non requis - sera rempli automatiquement par le middleware si manquant
    default: null
  },

  // Informations de facturation
  type: {
    type: String,
    enum: ['loyer', 'charges', 'entretien', 'stationnement', 'achat', 'autre'],
    required: [true, 'Le type de paiement est requis']
  },
  amount: {
    type: Number,
    required: [true, 'Le montant est requis'],
    min: [0.01, 'Le montant doit être positif']
  },
  description: {
    type: String,
    trim: true
  },

  // Dates
  dueDate: {
    type: Date,
    required: [true, 'La date d\'échéance est requise']
  },
  paidDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },

  // Statut
  status: {
    type: String,
    enum: ['en_attente', 'paye', 'en_retard', 'annule'],
    default: 'en_attente'
  },

  // Méthode de paiement
  paymentMethod: {
    type: String,
    enum: ['carte_credit', 'interac', 'virement', 'portefeuille', 'stripe', 'mastercard', 'visa', 'paypal', 'autre'],
    default: 'autre'
  },

  // Informations de transaction
  transactionId: String,
  referenceNumber: String,

  // Informations du bénéficiaire (pour Stripe, Interac, etc.)
  recipientEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  recipientContact: {
    phone: String,
    address: String
  },

  // Reçu
  receipt: {
    filename: String,
    path: String,
    url: String,
    generatedAt: Date
  },

  // Notes
  notes: String,

  // Référence à la demande (pour paiements initiaux)
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request'
  },

  // Métadonnées
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
paymentSchema.index({ payer: 1, status: 1 });
paymentSchema.index({ recipient: 1, status: 1 });
paymentSchema.index({ unit: 1, status: 1 });
paymentSchema.index({ building: 1, status: 1 });
paymentSchema.index({ dueDate: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ requestId: 1 });

// Index composé pour éviter les doublons
paymentSchema.index({ payer: 1, unit: 1, amount: 1, dueDate: 1, type: 1, requestId: 1 }, { 
  unique: false, // Pas unique car on peut avoir plusieurs paiements similaires à des dates différentes
  partialFilterExpression: { status: { $ne: 'annule' } } // Ignorer les paiements annulés
});

// Middleware pour mettre à jour updatedAt et s'assurer que recipient est défini
paymentSchema.pre('save', async function(next) {
  this.updatedAt = new Date();
  
  // S'assurer que recipient est toujours défini avant la sauvegarde
  if (!this.recipient && !this.isNew) {
    // Si c'est une mise à jour et recipient manque, on laisse le service le gérer
    return next();
  }
  
  if (!this.recipient && this.isNew) {
    // Pour un nouveau paiement, récupérer automatiquement le recipient
    try {
      const Unit = mongoose.model('Unit');
      const Building = mongoose.model('Building');
      const User = mongoose.model('User');
      
      // Essayer de récupérer depuis l'unité
      if (this.unit) {
        const unitDoc = await Unit.findById(this.unit).populate('proprietaire');
        if (unitDoc && unitDoc.proprietaire) {
          this.recipient = unitDoc.proprietaire._id || unitDoc.proprietaire;
          console.log('[PAYMENT MODEL] Recipient défini depuis l\'unité:', this.recipient);
        }
      }
      
      // Si toujours pas de recipient, essayer depuis le building
      if (!this.recipient && this.building) {
        const buildingDoc = await Building.findById(this.building).populate('admin');
        if (buildingDoc && buildingDoc.admin) {
          this.recipient = buildingDoc.admin._id || buildingDoc.admin;
          console.log('[PAYMENT MODEL] Recipient défini depuis le building:', this.recipient);
        }
      }
      
      // Si toujours pas de recipient, utiliser l'admin par défaut
      if (!this.recipient) {
        const adminUser = await User.findOne({ role: 'admin' });
        if (adminUser) {
          this.recipient = adminUser._id;
          console.log('[PAYMENT MODEL] Recipient défini comme admin par défaut:', this.recipient);
        } else if (this.payer) {
          // Dernier recours : utiliser le payeur
          this.recipient = this.payer;
          console.log('[PAYMENT MODEL] Recipient défini comme payeur (fallback):', this.recipient);
        }
      }
      
      // Récupérer l'email du recipient si disponible
      if (this.recipient && !this.recipientEmail) {
        const recipientUser = await User.findById(this.recipient);
        if (recipientUser && recipientUser.email) {
          this.recipientEmail = recipientUser.email;
        } else if (this.payer) {
          const payerUser = await User.findById(this.payer);
          if (payerUser && payerUser.email) {
            this.recipientEmail = payerUser.email;
          }
        }
      }
    } catch (error) {
      console.error('[PAYMENT MODEL] Erreur lors de la récupération automatique du recipient:', error);
      // Ne pas bloquer la sauvegarde, le service le gérera
    }
  }
  
  next();
});

// Méthode pour vérifier si le paiement est en retard
paymentSchema.methods.isOverdue = function() {
  return this.status === 'en_attente' && new Date() > this.dueDate;
};

// Méthode statique pour obtenir les paiements en retard
paymentSchema.statics.getOverduePayments = function() {
  return this.find({
    status: 'en_attente',
    dueDate: { $lt: new Date() }
  });
};

module.exports = mongoose.model('Payment', paymentSchema);

