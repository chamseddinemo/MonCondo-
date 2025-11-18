const Message = require('../models/Message');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');

// @desc    Obtenir tous les messages
// @route   GET /api/messages
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const { unit, building, sender, receiver, isRead, grouped } = req.query;
    const { getMessagesUnified, getMessagesGroupedBySender } = require('../services/messageSyncService');
    
    // Construire les filtres de base
    const filters = {};
    if (unit) filters.unit = unit;
    if (building) filters.building = building;
    if (sender) filters.sender = sender;
    if (receiver) filters.receiver = receiver;
    if (isRead !== undefined) filters.isRead = isRead === 'true';

    // Si grouped=true, regrouper par expéditeur
    let messages;
    if (grouped === 'true' || grouped === true) {
      messages = await getMessagesGroupedBySender(req.user, filters);
    } else {
      // Utiliser la fonction unifiée pour récupérer les messages (non regroupés)
      messages = await getMessagesUnified(req.user, filters);
    }

    // Appliquer le tri et la pagination
    const { page, limit, sortField, sortOrder } = getPaginationParams(req.query, {
      allowedSortFields: ['createdAt', 'updatedAt', 'lastMessageDate'],
      defaultSortField: grouped === 'true' ? 'lastMessageDate' : 'createdAt',
      defaultOrder: 'desc'
    });
    
    // Trier les résultats
    messages.sort((a, b) => {
      const aVal = a[sortField] || a.lastMessageDate || a.createdAt;
      const bVal = b[sortField] || b.lastMessageDate || b.createdAt;
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    const total = messages.length;
    const skip = (page - 1) * limit;
    const paginatedMessages = messages.slice(skip, skip + limit);

    const pagination = buildPaginationMeta({ page, limit, total });

    res.status(200).json({
      success: true,
      count: paginatedMessages.length,
      grouped: grouped === 'true' || grouped === true,
      ...pagination,
      data: paginatedMessages
    });
  } catch (error) {
    console.error('[MESSAGE] Erreur getMessages:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Obtenir une conversation entre deux utilisateurs
// @route   GET /api/messages/conversation/:userId
// @access  Private
exports.getConversation = async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const query = {
      $or: [
        { sender: req.user._id, receiver: otherUserId },
        { sender: otherUserId, receiver: req.user._id }
      ]
    };

    const messages = await Message.find(query)
      .populate('sender', 'firstName lastName email')
      .populate('receiver', 'firstName lastName email')
      .sort('createdAt')
      .lean();

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Obtenir un message par ID
// @route   GET /api/messages/:id
// @access  Private
exports.getMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('sender', 'firstName lastName email')
      .populate('receiver', 'firstName lastName email')
      .populate('unit', 'unitNumber')
      .populate('building', 'name');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin' && 
        message.sender._id.toString() !== req.user._id.toString() && 
        message.receiver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Marquer comme lu si c'est le destinataire via le service centralisé
    if (message.receiver._id.toString() === req.user._id.toString() && !message.isRead) {
      const { markMessageAsRead, syncAllMessageViews } = require('../services/messageSyncService');
      await markMessageAsRead(message._id, req.user._id);
      await syncAllMessageViews(message._id);
    }

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Créer un message
// @route   POST /api/messages
// @access  Private
exports.createMessage = async (req, res) => {
  try {
    const { receiver, subject, content, unit, building } = req.body;

    if (!receiver || !content) {
      return res.status(400).json({
        success: false,
        message: 'Destinataire et contenu sont requis'
      });
    }

    const message = await Message.create({
      sender: req.user._id,
      receiver,
      subject: subject || '',
      content,
      unit: unit || null,
      building: building || null,
      attachments: req.body.attachments || []
    });

    // Synchroniser toutes les vues après la création
    try {
      const { syncAllMessageViews } = require('../services/messageSyncService');
      await syncAllMessageViews(message._id);
      console.log('[CREATE MESSAGE] ✅ Synchronisation terminée');
    } catch (syncError) {
      console.error('[CREATE MESSAGE] ⚠️  Erreur synchronisation (non bloquante):', syncError);
    }

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'firstName lastName email')
      .populate('receiver', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Message envoyé avec succès',
      data: populatedMessage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mettre à jour un message
// @route   PUT /api/messages/:id
// @access  Private
exports.updateMessage = async (req, res) => {
  try {
    let message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    // Seul l'expéditeur peut modifier son message
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    message = await Message.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Synchroniser toutes les vues après la modification
    try {
      const { syncAllMessageViews } = require('../services/messageSyncService');
      await syncAllMessageViews(message._id);
      console.log('[UPDATE MESSAGE] ✅ Synchronisation terminée');
    } catch (syncError) {
      console.error('[UPDATE MESSAGE] ⚠️  Erreur synchronisation (non bloquante):', syncError);
    }

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Supprimer un message
// @route   DELETE /api/messages/:id
// @access  Private
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    // Seul l'expéditeur peut supprimer son message
    if (message.sender.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Récupérer les informations avant suppression pour synchroniser
    const receiverId = message.receiver;
    const senderId = message.sender;
    
    await message.deleteOne();

    // Synchroniser après suppression
    try {
      const { syncAllMessageViews } = require('../services/messageSyncService');
      // Émettre un événement pour notifier les utilisateurs concernés
      const { emitMessageSyncEvent } = require('../services/messageSyncService');
      emitMessageSyncEvent({
        messageId: message._id,
        action: 'deleted',
        receiverId: receiverId,
        senderId: senderId
      });
      console.log('[DELETE MESSAGE] ✅ Synchronisation terminée');
    } catch (syncError) {
      console.error('[DELETE MESSAGE] ⚠️  Erreur synchronisation (non bloquante):', syncError);
    }

    res.status(200).json({
      success: true,
      message: 'Message supprimé',
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Marquer un message comme lu
// @route   PUT /api/messages/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé'
      });
    }

    // Seul le destinataire peut marquer comme lu
    if (message.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Utiliser le service centralisé pour marquer comme lu
    const { markMessageAsRead, syncAllMessageViews } = require('../services/messageSyncService');
    const updatedMessage = await markMessageAsRead(message._id, req.user._id);
    await syncAllMessageViews(message._id);

    res.status(200).json({
      success: true,
      message: 'Message marqué comme lu',
      data: updatedMessage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Obtenir les messages non lus
// @route   GET /api/messages/unread
// @access  Private
exports.getUnreadMessages = async (req, res) => {
  try {
    const { getUnreadMessages, getUnreadCount } = require('../services/messageSyncService');
    
    // Construire les filtres
    const filters = {};
    if (req.query.unit) filters.unit = req.query.unit;
    if (req.query.building) filters.building = req.query.building;
    
    // Utiliser le service centralisé
    const messages = await getUnreadMessages(req.user._id, filters);
    const count = await getUnreadCount(req.user._id, filters);

    res.status(200).json({
      success: true,
      count: count,
      data: messages
    });
  } catch (error) {
    console.error('[MESSAGE] Erreur getUnreadMessages:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Obtenir le compteur de messages non lus
// @route   GET /api/messages/unread/count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const { getUnreadCount } = require('../services/messageSyncService');
    
    // Construire les filtres
    const filters = {};
    if (req.query.unit) filters.unit = req.query.unit;
    if (req.query.building) filters.building = req.query.building;
    
    const count = await getUnreadCount(req.user._id, filters);

    res.status(200).json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('[MESSAGE] Erreur getUnreadCount:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

