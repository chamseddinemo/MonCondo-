const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Unit = require('../models/Unit');
const Building = require('../models/Building');
const Request = require('../models/Request');
const User = require('../models/User');

/**
 * Synchronisation intelligente de la messagerie avec les modules Contrats et Maintenance
 */

/**
 * Cas d'usage 1: Quand un contrat est créé ou signé
 * - Vérifie si une conversation existe déjà entre ces participants
 * - Sinon, crée une nouvelle conversation
 * - Envoie un message système "Contrat signé avec succès"
 */
async function syncContractConversation(unitId, contractData) {
  try {
    const unit = await Unit.findById(unitId)
      .populate('proprietaire', '_id')
      .populate('locataire', '_id')
      .populate('building', 'admin');

    if (!unit) {
      console.log('[MESSAGING SYNC] Unité non trouvée:', unitId);
      return;
    }

    // Créer la liste des participants
    const participants = [];
    if (unit.proprietaire) participants.push(unit.proprietaire._id);
    if (unit.locataire) participants.push(unit.locataire._id);
    if (unit.building && unit.building.admin) participants.push(unit.building.admin._id);

    if (participants.length === 0) {
      console.log('[MESSAGING SYNC] Aucun participant pour l\'unité:', unitId);
      return;
    }

    // Chercher une conversation existante pour cette unité
    let conversation = await Conversation.findOne({
      unit: unitId,
      type: 'unit'
    });

    // Créer la conversation si elle n'existe pas
    if (!conversation) {
      conversation = await Conversation.create({
        participants,
        type: 'unit',
        unit: unitId,
        building: unit.building?._id || null,
        unreadCount: new Map()
      });
      console.log('[MESSAGING SYNC] Conversation créée pour l\'unité:', unitId);
    }

    // Envoyer un message système
    const systemMessage = await Message.create({
      sender: participants[0], // Utiliser le premier participant comme expéditeur système
      receiver: participants[1] || participants[0],
      conversation: conversation._id,
      unit: unitId,
      building: unit.building?._id || null,
      content: `✅ Contrat signé avec succès pour l'unité ${unit.unitNumber}. Bienvenue !`,
      isSystemMessage: true,
      systemMessageType: 'contract_signed',
      status: 'sent'
    });

    // Mettre à jour la conversation
    conversation.lastMessage = systemMessage._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Émettre via Socket.io si disponible
    try {
      const serverModule = require('../server');
      const io = serverModule.io;
      if (io) {
        const populatedMessage = await Message.findById(systemMessage._id)
          .populate('sender', 'firstName lastName email role');
        
        conversation.participants.forEach(participantId => {
          io.to(`conversation:${conversation._id}`).emit('message:received', {
            message: populatedMessage,
            conversation: conversation
          });
        });
      }
    } catch (err) {
      console.log('[MESSAGING SYNC] Socket.io non disponible');
    }

    console.log('[MESSAGING SYNC] Message système envoyé pour contrat:', unitId);
  } catch (error) {
    console.error('[MESSAGING SYNC] Erreur synchronisation contrat:', error);
  }
}

/**
 * Cas d'usage 2: Quand une demande de maintenance est enregistrée
 * - Trouve la conversation liée à l'unité
 * - Envoie un message automatique "Une nouvelle demande de maintenance a été créée"
 */
async function syncMaintenanceRequest(requestId) {
  try {
    const request = await Request.findById(requestId)
      .populate('unit', 'unitNumber proprietaire locataire building')
      .populate('createdBy', 'firstName lastName');

    if (!request || !request.unit) {
      console.log('[MESSAGING SYNC] Demande ou unité non trouvée:', requestId);
      return;
    }

    const unit = request.unit;

    // Chercher la conversation de l'unité
    let conversation = await Conversation.findOne({
      unit: unit._id,
      type: 'unit'
    });

    // Créer la conversation si elle n'existe pas
    if (!conversation) {
      const participants = [];
      if (unit.proprietaire) participants.push(unit.proprietaire._id);
      if (unit.locataire) participants.push(unit.locataire._id);
      if (unit.building) {
        const building = await Building.findById(unit.building).populate('admin');
        if (building && building.admin) participants.push(building.admin._id);
      }

      if (participants.length > 0) {
        conversation = await Conversation.create({
          participants,
          type: 'unit',
          unit: unit._id,
          building: unit.building?._id || null,
          request: requestId,
          unreadCount: new Map()
        });
        console.log('[MESSAGING SYNC] Conversation créée pour demande:', requestId);
      }
    }

    if (conversation) {
      // Envoyer un message système
      const systemMessage = await Message.create({
        sender: request.createdBy._id,
        receiver: conversation.participants[0], // Premier participant comme destinataire
        conversation: conversation._id,
        unit: unit._id,
        building: unit.building?._id || null,
        content: `🔧 Une nouvelle demande de maintenance a été enregistrée pour l'unité ${unit.unitNumber}: "${request.title}"`,
        isSystemMessage: true,
        systemMessageType: 'maintenance_request',
        status: 'sent'
      });

      // Mettre à jour la conversation
      conversation.lastMessage = systemMessage._id;
      conversation.lastMessageAt = new Date();
      await conversation.save();

      // Émettre via Socket.io si disponible
      try {
        const serverModule = require('../server');
        const io = serverModule.io;
        if (io) {
          const populatedMessage = await Message.findById(systemMessage._id)
            .populate('sender', 'firstName lastName email role');
          
          conversation.participants.forEach(participantId => {
            io.to(`conversation:${conversation._id}`).emit('message:received', {
              message: populatedMessage,
              conversation: conversation
            });
          });
        }
      } catch (err) {
        console.log('[MESSAGING SYNC] Socket.io non disponible');
      }

      console.log('[MESSAGING SYNC] Message système envoyé pour demande:', requestId);
    }
  } catch (error) {
    console.error('[MESSAGING SYNC] Erreur synchronisation demande:', error);
  }
}

/**
 * Cas d'usage 3: Quand le bail expire
 * - Ferme la conversation avec statut "Archivée"
 * - Notifie les participants par message automatique
 */
async function syncLeaseExpiration(unitId) {
  try {
    const unit = await Unit.findById(unitId)
      .populate('proprietaire', '_id firstName lastName')
      .populate('locataire', '_id firstName lastName');

    if (!unit) {
      console.log('[MESSAGING SYNC] Unité non trouvée:', unitId);
      return;
    }

    // Trouver la conversation de l'unité
    const conversation = await Conversation.findOne({
      unit: unitId,
      type: 'unit',
      isArchived: false
    });

    if (conversation) {
      // Envoyer un message système avant d'archiver
      const participants = conversation.participants;
      if (participants.length > 0) {
        const systemMessage = await Message.create({
          sender: participants[0],
          receiver: participants[1] || participants[0],
          conversation: conversation._id,
          unit: unitId,
          content: `⚠️ Le bail de l'unité ${unit.unitNumber} a expiré. Cette conversation sera archivée.`,
          isSystemMessage: true,
          systemMessageType: 'lease_expired',
          status: 'sent'
        });

        // Mettre à jour la conversation
        conversation.lastMessage = systemMessage._id;
        conversation.lastMessageAt = new Date();
        conversation.isArchived = true;
        await conversation.save();

        // Émettre via Socket.io si disponible
        try {
          const serverModule = require('../server');
          const io = serverModule.io;
          if (io) {
            const populatedMessage = await Message.findById(systemMessage._id)
              .populate('sender', 'firstName lastName email role');
            
            participants.forEach(participantId => {
              io.to(`conversation:${conversation._id}`).emit('message:received', {
                message: populatedMessage,
                conversation: conversation
              });
            });
          }
        } catch (err) {
          console.log('[MESSAGING SYNC] Socket.io non disponible');
        }

        console.log('[MESSAGING SYNC] Conversation archivée pour bail expiré:', unitId);
      }
    }
  } catch (error) {
    console.error('[MESSAGING SYNC] Erreur synchronisation expiration bail:', error);
  }
}

/**
 * Cron job pour vérifier les contrats expirés
 */
async function checkExpiredLeases() {
  try {
    // Cette fonction vérifie les baux expirés
    // Pour l'instant, elle est désactivée car le modèle Unit n'a pas de champ leaseEndDate
    // À implémenter lorsque le champ sera ajouté au modèle
    
    console.log('[MESSAGING SYNC] Vérification des baux expirés - Fonction désactivée (champ leaseEndDate non disponible)');
    
    // Code commenté pour référence future:
    /*
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Trouver les unités avec des baux expirés
    const units = await Unit.find({
      'leaseEndDate': { $lt: today },
      'status': { $ne: 'available' }
    });

    console.log(`[MESSAGING SYNC] Vérification des baux expirés: ${units.length} unités trouvées`);

    for (const unit of units) {
      await syncLeaseExpiration(unit._id);
      
      // Optionnel: Mettre à jour le statut de l'unité
      unit.status = 'available';
      unit.locataire = null;
      await unit.save();
    }
    */
  } catch (error) {
    console.error('[MESSAGING SYNC] Erreur vérification baux expirés:', error);
  }
}

module.exports = {
  syncContractConversation,
  syncMaintenanceRequest,
  syncLeaseExpiration,
  checkExpiredLeases
};

