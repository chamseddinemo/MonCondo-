const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalide']
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères'],
    select: false
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'proprietaire', 'locataire', 'visiteur'],
    default: 'visiteur',
    required: true
  },
  // Informations pour les demandes de location/achat
  monthlyIncome: {
    type: Number,
    default: 0
  },
  numberOfChildren: {
    type: Number,
    default: 0
  },
  creditScore: {
    type: Number,
    min: 0,
    max: 900
  },
  reputation: {
    type: String,
    enum: ['excellent', 'bon', 'moyen', 'faible'],
    default: 'moyen'
  },
  previousTenant: {
    type: Boolean,
    default: false
  },
  employmentProof: {
    filename: String,
    path: String,
    uploadedAt: Date
  },
  identityDocument: {
    filename: String,
    path: String,
    uploadedAt: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash du mot de passe avant sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Méthode pour comparer les mots de passe
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Mise à jour automatique de updatedAt
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);

