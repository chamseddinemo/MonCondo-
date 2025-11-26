const mongoose = require('mongoose');

const loanSimulationSchema = new mongoose.Schema({
  // Informations utilisateur
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utilisateur est requis']
  },
  userRole: {
    type: String,
    enum: ['admin', 'proprietaire', 'visiteur'],
    required: true
  },
  
  // Données du prêt
  propertyAmount: {
    type: Number,
    required: [true, 'Le montant du bien est requis'],
    min: [0, 'Le montant doit être positif']
  },
  downPayment: {
    type: Number,
    required: [true, 'L\'apport initial est requis'],
    min: [0, 'L\'apport doit être positif']
  },
  loanAmount: {
    type: Number,
    required: true,
    min: [0, 'Le montant du prêt doit être positif']
  },
  interestRate: {
    type: Number,
    required: [true, 'Le taux d\'intérêt est requis'],
    min: [0, 'Le taux doit être positif'],
    max: [100, 'Le taux ne peut pas dépasser 100%']
  },
  interestType: {
    type: String,
    enum: ['fixe', 'variable'],
    default: 'fixe'
  },
  loanDurationMonths: {
    type: Number,
    required: [true, 'La durée du prêt est requise'],
    min: [1, 'La durée doit être d\'au moins 1 mois']
  },
  loanDurationYears: {
    type: Number,
    required: true
  },
  
  // Frais annexes
  additionalFees: {
    insurance: {
      type: Number,
      default: 0,
      min: 0
    },
    taxes: {
      type: Number,
      default: 0,
      min: 0
    },
    notary: {
      type: Number,
      default: 0,
      min: 0
    },
    other: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Résultats des calculs
  monthlyPayment: {
    type: Number,
    required: true
  },
  totalInterest: {
    type: Number,
    required: true
  },
  totalCost: {
    type: Number,
    required: true
  },
  
  // Tableau d'amortissement (détaillé)
  amortizationSchedule: [{
    month: {
      type: Number,
      required: true
    },
    payment: {
      type: Number,
      required: true
    },
    principal: {
      type: Number,
      required: true
    },
    interest: {
      type: Number,
      required: true
    },
    remainingBalance: {
      type: Number,
      required: true
    }
  }],
  
  // Métadonnées
  title: {
    type: String,
    trim: true,
    default: 'Simulation de prêt'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Les notes ne peuvent pas dépasser 1000 caractères']
  },
  isSaved: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
loanSimulationSchema.index({ createdBy: 1, createdAt: -1 });
loanSimulationSchema.index({ userRole: 1, createdAt: -1 });
loanSimulationSchema.index({ isSaved: 1, createdBy: 1 });

module.exports = mongoose.model('LoanSimulation', loanSimulationSchema);

