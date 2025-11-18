const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'expéditeur est requis']
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le destinataire est requis']
  },
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit'
  },
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building'
  },
  subject: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Le contenu du message est requis'],
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  status: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read'],
    default: 'sent'
  },
  isSystemMessage: {
    type: Boolean,
    default: false
  },
  systemMessageType: {
    type: String,
    enum: ['contract_signed', 'maintenance_request', 'payment_received', 'unit_assigned', 'other']
  },
  attachments: [{
    filename: String,
    path: String,
    size: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index pour améliorer les performances des requêtes
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ unit: 1 });
messageSchema.index({ building: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ isRead: 1, receiver: 1 });

module.exports = mongoose.model('Message', messageSchema);

