const Message = require('../models/Message');
const User = require('../models/User');
const Unit = require('../models/Unit');

/**
 * Calcule le nombre de messages non lus pour un utilisateur
 * C'est la fonction principale que tous les endpoints doivent utiliser
 */
async function getUnreadCount(userId, filters = {}) {
  try {
    const query = {
      receiver: userId,
      isRead: false,
      ...filters
    };
    
    const count = await Message.countDocuments(query);
    return count;
  } catch (error) {
    console.error('[MESSAGE SYNC] Erreur calcul compteur non lus:', error);
    return 0;
  }
}

/**
 * Récupère les messages non lus pour un utilisateur
 */
async function getUnreadMessages(userId, filters = {}) {
  try {
    const query = {
      receiver: userId,
      isRead: false,
      ...filters
    };
    
    return await Message.find(query)
      .populate('sender', 'firstName lastName email')
      .populate('receiver', 'firstName lastName email')
      .populate('unit', 'unitNumber')
      .populate('building', 'name')
      .sort({ createdAt: -1 })
      .lean();
  } catch (error) {
    console.error('[MESSAGE SYNC] Erreur récupération messages non lus:', error);
    return [];
  }
}

/**
 * Récupère tous les messages pour un utilisateur avec filtrage unifié selon le rôle
 * C'est la fonction principale que tous les endpoints doivent utiliser
 */
async function getMessagesUnified(user, filters = {}) {
  let query = { ...filters };
  
  // Filtres selon le rôle
  if (user.role === 'admin') {
    // Admin : voir tous les messages (pas de filtre supplémentaire)
  } else if (user.role === 'proprietaire') {
    // Propriétaire : voir les messages liés à ses unités ou ses messages personnels
    const userUnits = await Unit.find({
      proprietaire: user._id || user.id
    }).distinct('_id');
    
    query.$or = [
      { sender: user._id || user.id },
      { receiver: user._id || user.id },
      ...(userUnits.length > 0 ? [{ unit: { $in: userUnits } }] : [])
    ];
  } else if (user.role === 'locataire') {
    // Locataire : voir ses messages ou ceux de son unité
    const userUnits = await Unit.find({
      locataire: user._id || user.id
    }).distinct('_id');
    
    query.$or = [
      { sender: user._id || user.id },
      { receiver: user._id || user.id },
      ...(userUnits.length > 0 ? [{ unit: { $in: userUnits } }] : [])
    ];
  } else {
    // Autres rôles : seulement leurs messages
    query.$or = [
      { sender: user._id || user.id },
      { receiver: user._id || user.id }
    ];
  }
  
  return await Message.find(query)
    .populate('sender', 'firstName lastName email')
    .populate('receiver', 'firstName lastName email')
    .populate('unit', 'unitNumber')
    .populate('building', 'name')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Regroupe les messages par expéditeur pour afficher une seule entrée par utilisateur
 * Retourne une liste unique avec le dernier message et le compteur de non lus
 */
async function getMessagesGroupedBySender(user, filters = {}) {
  try {
    // Récupérer tous les messages
    const allMessages = await getMessagesUnified(user, filters);
    
    // Identifier l'utilisateur actuel
    const currentUserId = (user._id || user.id).toString();
    
    // Grouper par expéditeur (pour les messages reçus) ou destinataire (pour les messages envoyés)
    const groupedMap = new Map();
    
    allMessages.forEach(message => {
      // Déterminer l'autre utilisateur (expéditeur si c'est un message reçu, destinataire si c'est un message envoyé)
      const receiverId = message.receiver?._id?.toString() || message.receiver?.toString();
      const senderId = message.sender?._id?.toString() || message.sender?.toString();
      const isReceived = receiverId === currentUserId;
      const isSent = senderId === currentUserId;
      
      // Pour les messages reçus, l'autre utilisateur est l'expéditeur
      // Pour les messages envoyés, l'autre utilisateur est le destinataire
      let otherUser, otherUserId;
      if (isReceived) {
        otherUser = message.sender;
        otherUserId = senderId;
      } else if (isSent) {
        otherUser = message.receiver;
        otherUserId = receiverId;
      } else {
        return; // Message non lié à l'utilisateur actuel
      }
      
      if (!otherUserId || !otherUser) return;
      
      // Si l'utilisateur n'existe pas encore dans le map, l'ajouter
      if (!groupedMap.has(otherUserId)) {
        groupedMap.set(otherUserId, {
          userId: otherUserId,
          user: otherUser,
          messages: [],
          unreadCount: 0,
          lastMessage: null,
          lastMessageDate: null
        });
      }
      
      const group = groupedMap.get(otherUserId);
      group.messages.push(message);
      
      // Compter les messages non lus (seulement pour les messages reçus)
      // Vérifier aussi isRead avec différentes variantes possibles
      const isUnread = isReceived && (message.isRead === false || message.isRead === undefined || !message.isRead);
      if (isUnread) {
        group.unreadCount++;
      }
      
      // Mettre à jour le dernier message si celui-ci est plus récent
      const messageDate = new Date(message.createdAt);
      if (!group.lastMessageDate || messageDate > group.lastMessageDate) {
        group.lastMessage = message;
        group.lastMessageDate = messageDate;
      }
    });
    
    // Convertir le map en tableau et trier par date du dernier message
    const groupedList = Array.from(groupedMap.values())
      .map(group => ({
        _id: group.userId, // Utiliser l'ID de l'utilisateur comme ID unique
        sender: group.user,
        receiver: user, // L'utilisateur actuel est toujours le destinataire dans cette vue
        lastMessage: group.lastMessage,
        lastMessageDate: group.lastMessageDate,
        unreadCount: group.unreadCount,
        totalMessages: group.messages.length,
        messages: group.messages, // Garder tous les messages pour l'affichage détaillé
        isRead: group.unreadCount === 0,
        createdAt: group.lastMessageDate,
        updatedAt: group.lastMessageDate
      }))
      .sort((a, b) => {
        // Trier par : d'abord les non lus, puis par date décroissante
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
        return new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime();
      });
    
    console.log(`[MESSAGE SYNC] ✅ Messages regroupés: ${groupedList.length} expéditeurs uniques sur ${allMessages.length} messages`);
    
    return groupedList;
  } catch (error) {
    console.error('[MESSAGE SYNC] Erreur regroupement messages:', error);
    // En cas d'erreur, retourner les messages non regroupés
    return await getMessagesUnified(user, filters);
  }
}

/**
 * Marque un message comme lu et synchronise toutes les vues
 */
async function markMessageAsRead(messageId, userId) {
  try {
    const message = await Message.findById(messageId);
    
    if (!message) {
      throw new Error('Message non trouvé');
    }
    
    // Vérifier que c'est bien le destinataire
    if (message.receiver.toString() !== userId.toString()) {
      throw new Error('Seul le destinataire peut marquer le message comme lu');
    }
    
    // Marquer comme lu
    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      message.status = 'read';
      await message.save();
      
      console.log('[MESSAGE SYNC] ✅ Message marqué comme lu:', messageId);
      
      // Émettre un événement de synchronisation
      emitMessageSyncEvent({
        messageId: message._id,
        action: 'read',
        userId: userId,
        receiverId: message.receiver,
        senderId: message.sender
      });
    }
    
    return message;
  } catch (error) {
    console.error('[MESSAGE SYNC] Erreur marquer message comme lu:', error);
    throw error;
  }
}

/**
 * Marque plusieurs messages comme lus
 */
async function markMessagesAsRead(messageIds, userId) {
  try {
    const messages = await Message.find({
      _id: { $in: messageIds },
      receiver: userId,
      isRead: false
    });
    
    if (messages.length === 0) {
      return { count: 0 };
    }
    
    const now = new Date();
    await Message.updateMany(
      { _id: { $in: messageIds }, receiver: userId },
      { 
        $set: { 
          isRead: true, 
          readAt: now,
          status: 'read'
        } 
      }
    );
    
    console.log('[MESSAGE SYNC] ✅ Messages marqués comme lus:', messages.length);
    
    // Émettre un événement de synchronisation pour chaque message
    messages.forEach(message => {
      emitMessageSyncEvent({
        messageId: message._id,
        action: 'read',
        userId: userId,
        receiverId: message.receiver,
        senderId: message.sender
      });
    });
    
    return { count: messages.length };
  } catch (error) {
    console.error('[MESSAGE SYNC] Erreur marquer messages comme lus:', error);
    throw error;
  }
}

/**
 * Synchronise toutes les vues après une modification de message
 */
async function syncAllMessageViews(messageId) {
  try {
    console.log('[MESSAGE SYNC] 🔄 Début synchronisation pour message:', messageId);
    
    const message = await Message.findById(messageId)
      .populate('sender', 'firstName lastName email')
      .populate('receiver', 'firstName lastName email')
      .populate('unit', 'unitNumber')
      .populate('building', 'name');
    
    if (!message) {
      console.error('[MESSAGE SYNC] ❌ Message non trouvé:', messageId);
      return;
    }
    
    // Émettre un événement de synchronisation
    emitMessageSyncEvent({
      messageId: message._id,
      action: 'updated',
      receiverId: message.receiver?._id || message.receiver,
      senderId: message.sender?._id || message.sender,
      isRead: message.isRead
    });
    
    console.log('[MESSAGE SYNC] ✅ Synchronisation terminée pour message:', messageId);
  } catch (error) {
    console.error('[MESSAGE SYNC] ❌ Erreur synchronisation:', error);
    console.error('[MESSAGE SYNC] Stack:', error.stack);
  }
}

/**
 * Émet un événement de synchronisation pour notifier le frontend
 */
function emitMessageSyncEvent(data) {
  const event = {
    type: 'MESSAGE_SYNC',
    timestamp: new Date().toISOString(),
    ...data
  };
  
  console.log('[MESSAGE SYNC] 📡 Événement de synchronisation créé:', event);
  
  // Émettre via WebSocket si disponible
  if (typeof global !== 'undefined' && global.io) {
    global.io.emit('messageSync', event);
  }
  
  // Émettre aussi un événement DOM pour le frontend (si en environnement browser)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('messageSync', {
      detail: event
    }));
    // Émettre aussi les événements spécifiques pour compatibilité
    window.dispatchEvent(new CustomEvent('messageListRefresh', {
      detail: event
    }));
    if (data.action === 'read') {
      window.dispatchEvent(new CustomEvent('messageStatusUpdated', {
        detail: event
      }));
    }
  }
  
  return event;
}

/**
 * Calcule les statistiques de messages pour un utilisateur
 */
async function calculateMessageStats(userId, filters = {}) {
  try {
    const [
      total,
      unread,
      read,
      sent,
      received
    ] = await Promise.all([
      Message.countDocuments({
        $or: [
          { sender: userId },
          { receiver: userId }
        ],
        ...filters
      }),
      Message.countDocuments({
        receiver: userId,
        isRead: false,
        ...filters
      }),
      Message.countDocuments({
        receiver: userId,
        isRead: true,
        ...filters
      }),
      Message.countDocuments({
        sender: userId,
        ...filters
      }),
      Message.countDocuments({
        receiver: userId,
        ...filters
      })
    ]);
    
    return {
      total: total || 0,
      unread: unread || 0,
      read: read || 0,
      sent: sent || 0,
      received: received || 0
    };
  } catch (error) {
    console.error('[MESSAGE SYNC] Erreur calcul statistiques:', error);
    return {
      total: 0,
      unread: 0,
      read: 0,
      sent: 0,
      received: 0
    };
  }
}

module.exports = {
  // Fonctions principales
  getUnreadCount,
  getUnreadMessages,
  getMessagesUnified,
  getMessagesGroupedBySender,
  markMessageAsRead,
  markMessagesAsRead,
  syncAllMessageViews,
  emitMessageSyncEvent,
  calculateMessageStats
};

