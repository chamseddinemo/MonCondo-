const Notification = require('../models/Notification');
const { sendPaymentConfirmationEmail } = require('./emailService');

/**
 * Crée une notification pour un utilisateur
 * @param {Object} options - Options de la notification
 * @returns {Promise<Object>} - Notification créée
 */
async function createNotification(options) {
  try {
    const {
      user,
      type,
      title,
      content,
      sender,
      request,
      unit,
      building,
      payment,
      conversation
    } = options;

    if (!user || !type || !title || !content) {
      throw new Error('Les champs user, type, title et content sont requis');
    }

    const notification = await Notification.create({
      user,
      type,
      title,
      content,
      sender,
      request,
      unit,
      building,
      payment,
      conversation,
      isRead: false
    });

    return {
      success: true,
      data: notification
    };
  } catch (error) {
    console.error('[NOTIFICATION SERVICE] Erreur création notification:', error);
    throw error;
  }
}

/**
 * Crée une notification pour une nouvelle demande
 * @param {Object} request - Demande créée
 * @param {Object} adminUsers - Liste des administrateurs
 * @returns {Promise<Array>} - Notifications créées
 */
async function notifyNewRequest(request, adminUsers) {
  try {
    const notifications = [];

    for (const admin of adminUsers) {
      const notification = await createNotification({
        user: admin._id,
        type: 'system',
        title: 'Nouvelle demande reçue',
        content: `Une nouvelle demande de type "${request.type}" a été reçue de ${request.createdBy.firstName} ${request.createdBy.lastName} pour l'unité ${request.unit?.unitNumber || 'non spécifiée'}.`,
        request: request._id,
        unit: request.unit,
        building: request.building
      });
      notifications.push(notification.data);
    }

    return {
      success: true,
      notifications: notifications
    };
  } catch (error) {
    console.error('[NOTIFICATION SERVICE] Erreur notification nouvelle demande:', error);
    throw error;
  }
}

/**
 * Crée une notification pour une demande acceptée
 * @param {Object} request - Demande acceptée
 * @param {Object} requester - Demandeur
 * @returns {Promise<Object>} - Notification créée
 */
async function notifyRequestAccepted(request, requester) {
  try {
    // Construire un message de notification détaillé
    const unitNumber = request.unit?.unitNumber || (request.unit && typeof request.unit === 'object' ? request.unit.unitNumber : null);
    const unitInfo = unitNumber ? ` pour l'unité ${unitNumber}` : '';
    const typeLabel = request.type === 'location' ? 'location' : request.type === 'achat' ? 'achat' : request.type;
    let notificationContent = `Félicitations ! Votre demande de ${typeLabel}${unitInfo} a été acceptée.`;
    
    // Ajouter des informations sur les documents et le paiement
    if (request.generatedDocuments && request.generatedDocuments.length > 0) {
      const docTypes = request.generatedDocuments.map(doc => {
        if (doc.type === 'bail') return 'bail';
        if (doc.type === 'contrat_vente') return 'contrat de vente';
        return 'document';
      }).join(' et ');
      notificationContent += ` Le${request.generatedDocuments.length > 1 ? 's' : ''} ${docTypes} ${request.generatedDocuments.length > 1 ? 'ont' : 'a'} été généré${request.generatedDocuments.length > 1 ? 's' : ''} et ${request.generatedDocuments.length > 1 ? 'sont' : 'est'} disponible${request.generatedDocuments.length > 1 ? 's' : ''} dans votre tableau de bord.`;
    }
    
    if (request.initialPayment && request.initialPayment.amount > 0) {
      notificationContent += ` Un paiement initial de ${request.initialPayment.amount.toFixed(2)} $ est requis pour finaliser la transaction.`;
    }
    
    notificationContent += ` Veuillez consulter votre tableau de bord pour plus de détails.`;

    // Récupérer les IDs correctement
    const unitId = request.unit?._id || (request.unit && typeof request.unit === 'object' ? request.unit._id : request.unit) || null;
    const buildingId = request.building?._id || (request.building && typeof request.building === 'object' ? request.building._id : request.building) || null;

    const notification = await createNotification({
      user: requester._id,
      type: 'contract',
      title: '✅ Demande acceptée',
      content: notificationContent,
      request: request._id,
      unit: unitId,
      building: buildingId
    });

    return {
      success: true,
      data: notification.data
    };
  } catch (error) {
    console.error('[NOTIFICATION SERVICE] Erreur notification demande acceptée:', error);
    throw error;
  }
}

/**
 * Crée une notification pour une demande refusée
 * @param {Object} request - Demande refusée
 * @param {Object} requester - Demandeur
 * @param {String} reason - Raison du refus
 * @returns {Promise<Object>} - Notification créée
 */
async function notifyRequestRejected(request, requester, reason) {
  try {
    const notification = await createNotification({
      user: requester._id,
      type: 'system',
      title: 'Demande refusée',
      content: `Votre demande de ${request.type} pour l'unité ${request.unit?.unitNumber || ''} a été refusée. Raison: ${reason}`,
      request: request._id,
      unit: request.unit,
      building: request.building
    });

    // TODO: Envoyer un email au demandeur
    // await sendRequestRejectedEmail(request, requester, reason);

    return {
      success: true,
      data: notification.data
    };
  } catch (error) {
    console.error('[NOTIFICATION SERVICE] Erreur notification demande refusée:', error);
    throw error;
  }
}

/**
 * Crée une notification pour un document signé
 * @param {Object} request - Demande avec document signé
 * @param {Object} requester - Demandeur
 * @param {Object} admin - Administrateur
 * @returns {Promise<Object>} - Notification créée
 */
async function notifyDocumentSigned(request, requester, admin) {
  try {
    // Notification pour le demandeur
    const requesterNotification = await createNotification({
      user: requester._id,
      type: 'contract',
      title: 'Document signé',
      content: `Votre document a été signé avec succès. Vous pouvez maintenant effectuer le paiement initial.`,
      request: request._id,
      unit: request.unit,
      building: request.building
    });

    // Notification pour l'admin
    const adminNotification = await createNotification({
      user: admin._id,
      type: 'contract',
      title: 'Document signé',
      content: `Le document pour la demande de ${request.type} (Unité ${request.unit?.unitNumber || ''}) a été signé par ${requester.firstName} ${requester.lastName}.`,
      request: request._id,
      unit: request.unit,
      building: request.building
    });

    return {
      success: true,
      requesterNotification: requesterNotification.data,
      adminNotification: adminNotification.data
    };
  } catch (error) {
    console.error('[NOTIFICATION SERVICE] Erreur notification document signé:', error);
    throw error;
  }
}

/**
 * Crée une notification pour un paiement initial reçu
 * @param {Object} request - Demande avec paiement
 * @param {Object} requester - Demandeur
 * @param {Object} admin - Administrateur
 * @returns {Promise<Object>} - Notification créée
 */
async function notifyInitialPaymentReceived(request, requester, admin) {
  try {
    // Notification pour le demandeur
    const requesterNotification = await createNotification({
      user: requester._id,
      type: 'payment',
      title: 'Paiement initial reçu',
      content: `Votre paiement initial de $${request.initialPayment.amount.toFixed(2)} a été reçu avec succès. Votre demande est en cours de traitement final.`,
      request: request._id,
      unit: request.unit,
      building: request.building
    });

    // Notification pour l'admin
    const adminNotification = await createNotification({
      user: admin._id,
      type: 'payment',
      title: 'Paiement initial reçu',
      content: `Le paiement initial de $${request.initialPayment.amount.toFixed(2)} pour la demande de ${request.type} (Unité ${request.unit?.unitNumber || ''}) a été reçu de ${requester.firstName} ${requester.lastName}.`,
      request: request._id,
      unit: request.unit,
      building: request.building
    });

    return {
      success: true,
      requesterNotification: requesterNotification.data,
      adminNotification: adminNotification.data
    };
  } catch (error) {
    console.error('[NOTIFICATION SERVICE] Erreur notification paiement initial:', error);
    throw error;
  }
}

/**
 * Crée une notification pour une unité attribuée
 * @param {Object} request - Demande finalisée
 * @param {Object} requester - Demandeur
 * @param {Object} unit - Unité attribuée
 * @returns {Promise<Object>} - Notification créée
 */
async function notifyUnitAssigned(request, requester, unit) {
  try {
    const moveInDate = new Date();
    moveInDate.setMonth(moveInDate.getMonth() + 1);
    
    const notification = await createNotification({
      user: requester._id,
      type: 'system',
      title: 'Unité attribuée',
      content: `Votre demande a été approuvée et finalisée. Vous pouvez désormais emménager à l'unité ${unit.unitNumber} à partir du ${moveInDate.toLocaleDateString('fr-FR')}.`,
      request: request._id,
      unit: unit._id,
      building: unit.building
    });

    // TODO: Envoyer un email au demandeur
    // await sendUnitAssignedEmail(request, requester, unit, moveInDate);

    return {
      success: true,
      data: notification.data
    };
  } catch (error) {
    console.error('[NOTIFICATION SERVICE] Erreur notification unité attribuée:', error);
    throw error;
  }
}

module.exports = {
  createNotification,
  notifyNewRequest,
  notifyRequestAccepted,
  notifyRequestRejected,
  notifyDocumentSigned,
  notifyInitialPaymentReceived,
  notifyUnitAssigned
};

