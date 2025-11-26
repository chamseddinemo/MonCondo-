const Payment = require('../models/Payment');
const Unit = require('../models/Unit');
const Notification = require('../models/Notification');
const { generateReceiptPDF } = require('./pdfService');
const { sendPaymentConfirmationEmail } = require('./emailService');
const { syncAllPaymentViews, emitPaymentSyncEvent } = require('./paymentSyncService');
const path = require('path');
const fs = require('fs');

const receiptsDir = path.join(__dirname, '../uploads/receipts');
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

/**
 * Vérifie les permissions d'accès à un paiement
 * @param {Object} payment - Le paiement
 * @param {Object} user - L'utilisateur actuel
 * @returns {Boolean} - true si l'utilisateur a accès
 */
function checkPaymentAccess(payment, user) {
  if (!payment || !user) return false;

  const userId = user._id?.toString() || user.id?.toString() || user.toString();
  const userRole = user.role;

  // Admin a toujours accès
  if (userRole === 'admin') {
    return true;
  }

  // Locataire : accès si c'est lui le payeur
  if (userRole === 'locataire') {
    const payerId = payment.payer?._id?.toString() || payment.payer?.toString();
    return payerId === userId;
  }

  // Propriétaire : accès dans plusieurs cas :
  // 1. Si c'est lui le payeur (ex: paiement d'achat, acompte, frais)
  // 2. Si c'est le bénéficiaire (ex: reçoit un loyer)
  // 3. Si c'est le propriétaire de l'unité concernée
  if (userRole === 'proprietaire') {
    // Vérifier si c'est le payeur
    const payerId = payment.payer?._id?.toString() || payment.payer?.toString();
    if (payerId === userId) {
      console.log('[PAYMENT_ACCESS] ✅ Propriétaire autorisé : il est le payeur');
      return true;
    }
    
    // Vérifier si c'est le bénéficiaire
    const recipientId = payment.recipient?._id?.toString() || payment.recipient?.toString();
    if (recipientId === userId) {
      console.log('[PAYMENT_ACCESS] ✅ Propriétaire autorisé : il est le bénéficiaire');
      return true;
    }
    
    // Vérifier si c'est le propriétaire de l'unité
    if (payment.unit?.proprietaire) {
      const unitOwnerId = payment.unit.proprietaire?._id?.toString() || payment.unit.proprietaire?.toString();
      if (unitOwnerId === userId) {
        console.log('[PAYMENT_ACCESS] ✅ Propriétaire autorisé : il est propriétaire de l\'unité');
        return true;
      }
    }
  }

  console.log('[PAYMENT_ACCESS] ❌ Accès refusé pour', userRole, 'userId:', userId);
  return false;
}

/**
 * Marque un paiement comme payé et génère le reçu
 */
async function markPaymentAsPaid(paymentId, paymentMethod, transactionId, notes) {
  // Charger le paiement avec toutes les relations nécessaires
  let payment = await Payment.findById(paymentId)
    .populate('unit', 'unitNumber proprietaire')
    .populate('building', 'name admin')
    .populate('payer', 'firstName lastName email')
    .populate('recipient', 'firstName lastName email');

  if (!payment) {
    throw new Error('Paiement non trouvé');
  }

  if (payment.status === 'paye') {
    throw new Error('Ce paiement est déjà payé');
  }

  // S'assurer que le recipient est défini AVANT toute opération
  // Vérifier si recipient est null, undefined, ou un ObjectId vide
  let recipientId = null;
  let recipientEmail = null;
  let recipientUser = null;
  
  if (payment.recipient) {
    // Si c'est un objet peuplé, prendre l'ID et l'email
    recipientId = payment.recipient._id || payment.recipient;
    recipientEmail = payment.recipient.email || null;
    recipientUser = payment.recipient;
  } else if (payment.recipient && typeof payment.recipient === 'object' && payment.recipient.toString) {
    // Si c'est un ObjectId non peuplé, le peupler
    recipientId = payment.recipient;
  }
  
  // Si toujours pas de recipient, le récupérer
  if (!recipientId) {
    console.log('[PAYMENT SERVICE] Recipient manquant, tentative de récupération...');
    console.log('[PAYMENT SERVICE] État actuel:', {
      hasUnit: !!payment.unit,
      hasUnitProprietaire: !!(payment.unit && payment.unit.proprietaire),
      hasBuilding: !!payment.building,
      hasBuildingAdmin: !!(payment.building && payment.building.admin)
    });
    
    const User = require('../models/User');
    
    // Essayer de récupérer le propriétaire de l'unité
    if (payment.unit && payment.unit.proprietaire) {
      recipientId = payment.unit.proprietaire._id || payment.unit.proprietaire;
      // Peupler pour obtenir l'email
      recipientUser = await User.findById(recipientId);
      if (recipientUser) {
        recipientEmail = recipientUser.email;
        console.log('[PAYMENT SERVICE] Recipient défini depuis l\'unité:', recipientId, 'Email:', recipientEmail);
      } else {
        console.log('[PAYMENT SERVICE] Propriétaire trouvé mais email non disponible');
      }
    } else if (payment.building) {
      // Essayer de récupérer l'admin du building
      if (payment.building.admin) {
        recipientId = payment.building.admin._id || payment.building.admin;
        recipientUser = await User.findById(recipientId);
        if (recipientUser) {
          recipientEmail = recipientUser.email;
          console.log('[PAYMENT SERVICE] Recipient défini depuis le building:', recipientId, 'Email:', recipientEmail);
        }
      } else {
        // Recharger le building pour avoir l'admin
        const Building = require('../models/Building');
        const buildingDoc = await Building.findById(payment.building._id || payment.building).populate('admin');
        if (buildingDoc && buildingDoc.admin) {
          recipientId = buildingDoc.admin._id || buildingDoc.admin;
          recipientUser = await User.findById(recipientId);
          if (recipientUser) {
            recipientEmail = recipientUser.email;
            console.log('[PAYMENT SERVICE] Recipient défini depuis le building (rechargé):', recipientId, 'Email:', recipientEmail);
          }
        }
      }
    }
    
    // Si toujours pas de recipient, utiliser l'admin par défaut
    if (!recipientId) {
      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        recipientId = adminUser._id;
        recipientEmail = adminUser.email;
        recipientUser = adminUser;
        console.log('[PAYMENT SERVICE] Recipient défini comme admin par défaut:', recipientId, 'Email:', recipientEmail);
      } else {
        // Dernier recours : utiliser l'email du payeur
        if (payment.payer) {
          const payerUser = await User.findById(payment.payer._id || payment.payer);
          if (payerUser) {
            recipientId = payerUser._id;
            recipientEmail = payerUser.email;
            recipientUser = payerUser;
            console.log('[PAYMENT SERVICE] Recipient défini comme payeur (fallback):', recipientId, 'Email:', recipientEmail);
          } else {
            throw new Error('Le bénéficiaire est requis. Veuillez contacter l\'administration.');
          }
        } else {
          throw new Error('Le bénéficiaire est requis. Veuillez contacter l\'administration.');
        }
      }
    }
    
    // Vérifier que l'email est disponible
    if (!recipientEmail && recipientUser) {
      recipientEmail = recipientUser.email;
    }
    
    if (!recipientEmail) {
      console.warn('[PAYMENT SERVICE] Avertissement: Email du recipient non disponible');
    }
    
    // Sauvegarder le recipient AVANT de continuer (utiliser updateOne pour éviter la validation Mongoose)
    await Payment.updateOne(
      { _id: paymentId },
      { $set: { recipient: recipientId } }
    );
    console.log('[PAYMENT SERVICE] Recipient sauvegardé avec succès:', recipientId, 'Email:', recipientEmail);
    
    // Recharger le paiement avec le recipient peuplé
    payment = await Payment.findById(paymentId)
      .populate('unit', 'unitNumber proprietaire')
      .populate('building', 'name')
      .populate('payer', 'firstName lastName email phone')
      .populate('recipient', 'firstName lastName email phone');
  } else {
    // S'assurer que recipientId est bien défini dans le document et récupérer l'email
    if (!payment.recipient || !payment.recipient._id) {
      await Payment.updateOne(
        { _id: paymentId },
        { $set: { recipient: recipientId } }
      );
      payment = await Payment.findById(paymentId)
        .populate('unit', 'unitNumber proprietaire')
        .populate('building', 'name')
        .populate('payer', 'firstName lastName email phone')
        .populate('recipient', 'firstName lastName email phone');
    }
    
    // Récupérer l'email du recipient si pas déjà disponible
    if (!recipientEmail && payment.recipient) {
      recipientEmail = payment.recipient.email;
      recipientUser = payment.recipient;
    } else if (!recipientEmail && recipientId) {
      const User = require('../models/User');
      recipientUser = await User.findById(recipientId);
      if (recipientUser) {
        recipientEmail = recipientUser.email;
      }
    }
  }
  
  // Vérification finale : s'assurer qu'on a au minimum un email
  if (!recipientEmail && payment.payer && payment.payer.email) {
    console.warn('[PAYMENT SERVICE] Utilisation de l\'email du payeur comme fallback');
    recipientEmail = payment.payer.email;
  }

  // Vérifier une dernière fois que le recipient est défini
  const finalRecipientId = payment.recipient?._id || payment.recipient || recipientId;
  if (!finalRecipientId) {
    console.error('[PAYMENT SERVICE] ERREUR: Recipient toujours manquant après récupération!');
    throw new Error('Le bénéficiaire est requis. Impossible de traiter le paiement.');
  }

  // Mapper les méthodes de paiement pour normalisation
  let finalPaymentMethod = paymentMethod;
  if (paymentMethod) {
    const methodMap = {
      'interac': 'interac',
      'virement': 'virement',
      'virement_bancaire': 'virement',
      'carte_credit': 'carte_credit',
      'carte': 'carte_credit',
      'stripe': 'carte_credit'
    };
    finalPaymentMethod = methodMap[paymentMethod] || paymentMethod;
  }

  console.log('[PAYMENT SERVICE] Mise à jour du paiement:', {
    paymentId: payment._id,
    status: 'paye',
    paymentMethod: finalPaymentMethod,
    transactionId: transactionId,
    recipient: finalRecipientId
  });

  // Utiliser updateOne pour éviter les problèmes de validation Mongoose
  const updateData = {
    status: 'paye',
    paidDate: new Date(),
    recipient: finalRecipientId // S'assurer que recipient est toujours défini
  };
  
  // S'assurer que recipientEmail est toujours défini
  if (recipientEmail) {
    updateData.recipientEmail = recipientEmail;
  } else if (payment.recipient && payment.recipient.email) {
    updateData.recipientEmail = payment.recipient.email;
  } else if (payment.payer && payment.payer.email) {
    // Fallback vers l'email du payeur
    updateData.recipientEmail = payment.payer.email;
    console.warn('[PAYMENT SERVICE] Utilisation de l\'email du payeur comme recipientEmail');
  }
  
  // Ajouter les informations de contact si disponibles
  if (recipientUser && recipientUser.phone) {
    updateData.recipientContact = {
      phone: recipientUser.phone
    };
  }
  
  if (finalPaymentMethod) {
    updateData.paymentMethod = finalPaymentMethod;
  }
  if (transactionId) {
    updateData.transactionId = transactionId;
  }
  if (notes) {
    updateData.notes = notes;
  }

  await Payment.updateOne(
    { _id: paymentId },
    { $set: updateData }
  );
  console.log('[PAYMENT SERVICE] Paiement sauvegardé avec succès:', {
    recipient: finalRecipientId,
    recipientEmail: updateData.recipientEmail
  });

  // Si ce paiement est lié à une demande, mettre à jour le statut initialPayment
  // Recharger le paiement pour avoir le requestId à jour
  const paymentWithRequestId = await Payment.findById(paymentId).select('requestId');
  
  if (paymentWithRequestId && paymentWithRequestId.requestId) {
    try {
      const Request = require('../models/Request');
      const request = await Request.findById(paymentWithRequestId.requestId);
      
      if (request && request.initialPayment) {
        // Utiliser updateOne pour forcer la mise à jour même si le document n'est pas modifié
        const updateData = {
          'initialPayment.status': 'paye',
          'initialPayment.paidAt': new Date()
        };
        
        if (finalPaymentMethod) {
          updateData['initialPayment.paymentMethod'] = finalPaymentMethod;
        }
        if (transactionId) {
          updateData['initialPayment.transactionId'] = transactionId;
        }
        
        // Mettre à jour directement avec updateOne pour garantir la persistance
        const updateResult = await Request.updateOne(
          { _id: paymentWithRequestId.requestId },
          { $set: updateData }
        );
        
        console.log('[PAYMENT SERVICE] ✅ Statut initialPayment mis à jour dans la demande:', {
          requestId: paymentWithRequestId.requestId,
          modifiedCount: updateResult.modifiedCount,
          matchedCount: updateResult.matchedCount,
          status: 'paye',
          paidAt: updateData['initialPayment.paidAt']
        });
        
        // Vérifier que la mise à jour a bien été effectuée
        const updatedRequest = await Request.findById(paymentWithRequestId.requestId).select('initialPayment');
        if (updatedRequest && updatedRequest.initialPayment) {
          console.log('[PAYMENT SERVICE] ✅ Vérification: statut confirmé:', updatedRequest.initialPayment.status);
        } else {
          console.error('[PAYMENT SERVICE] ⚠️  Vérification échouée: demande non trouvée après mise à jour');
        }
      } else {
        console.log('[PAYMENT SERVICE] ⚠️  Demande trouvée mais initialPayment manquant');
      }
    } catch (error) {
      console.error('[PAYMENT SERVICE] ❌ Erreur mise à jour demande:', error);
      console.error('[PAYMENT SERVICE] Stack:', error.stack);
      // Ne pas faire échouer le paiement si la mise à jour de la demande échoue
    }
  } else {
    console.log('[PAYMENT SERVICE] ℹ️  Paiement non lié à une demande (requestId manquant)');
  }

  // Recharger le paiement pour le retour
  payment = await Payment.findById(paymentId)
    .populate('unit', 'unitNumber proprietaire')
    .populate('building', 'name')
    .populate('payer', 'firstName lastName email')
    .populate('recipient', 'firstName lastName email');

  // Synchroniser toutes les vues après le paiement via le service global
  try {
    const { syncPaymentGlobally } = require('./globalSyncService');
    await syncPaymentGlobally(paymentId);
    console.log('[PAYMENT SERVICE] ✅ Synchronisation globale terminée');
  } catch (syncError) {
    console.error('[PAYMENT SERVICE] ⚠️  Erreur synchronisation (non bloquante):', syncError);
    // Fallback vers la synchronisation locale si la globale échoue
    try {
      await syncAllPaymentViews(paymentId);
    } catch (fallbackError) {
      console.error('[PAYMENT SERVICE] ⚠️  Erreur synchronisation fallback:', fallbackError);
    }
  }

  // Générer le reçu PDF
  const receiptFilename = `receipt_${payment._id}_${Date.now()}.pdf`;
  const receiptPath = path.join(receiptsDir, receiptFilename);
  
  try {
    console.log('[PAYMENT SERVICE] Génération du reçu PDF...');
    // S'assurer que le payment est peuplé avec toutes les données nécessaires
    const paymentForReceipt = await Payment.findById(payment._id)
      .populate('unit', 'unitNumber floor')
      .populate('building', 'name address')
      .populate('payer', 'firstName lastName email phone')
      .populate('recipient', 'firstName lastName email');
    
    await generateReceiptPDF(paymentForReceipt, receiptPath);
    payment.receipt = {
      filename: receiptFilename,
      path: `uploads/receipts/${receiptFilename}`,
      url: `${process.env.API_URL || 'http://localhost:5000'}/uploads/receipts/${receiptFilename}`,
      generatedAt: new Date()
    };
    await payment.save();
    console.log('[PAYMENT SERVICE] Reçu PDF généré avec succès:', receiptPath);
  } catch (error) {
    console.error('[PAYMENT SERVICE] Erreur génération reçu:', error);
    console.error('[PAYMENT SERVICE] Stack:', error.stack);
    // Ne pas faire échouer le paiement si le reçu ne peut pas être généré
  }

  // Envoyer l'email de confirmation
  try {
    await sendPaymentConfirmationEmail(payment, receiptPath);
  } catch (error) {
    console.error('[PAYMENT] Erreur envoi email:', error);
  }

  // Créer des notifications
  try {
    // Notification pour le payeur
    await Notification.create({
      user: payment.payer._id || payment.payer,
      type: 'payment',
      title: 'Paiement confirmé',
      content: `Votre paiement de ${payment.amount} $CAD a été confirmé. Un reçu a été généré.`,
      payment: payment._id,
      unit: payment.unit._id || payment.unit,
      building: payment.building._id || payment.building
    });

    // Notification pour le bénéficiaire
    await Notification.create({
      user: payment.recipient._id || payment.recipient,
      type: 'payment',
      title: 'Nouveau paiement reçu',
      content: `Vous avez reçu un paiement de ${payment.amount} $CAD de ${payment.payer.firstName} ${payment.payer.lastName}.`,
      payment: payment._id,
      unit: payment.unit._id || payment.unit,
      building: payment.building._id || payment.building
    });
  } catch (error) {
    console.error('[PAYMENT] Erreur création notifications:', error);
  }

  // Si le paiement est lié à une demande de location/achat, attribuer automatiquement l'unité
  if (payment.requestId) {
    try {
      const Request = require('../models/Request');
      const Unit = require('../models/Unit');
      
      const request = await Request.findById(payment.requestId)
        .populate('unit', 'unitNumber proprietaire locataire')
        .populate('createdBy', 'firstName lastName email role');
      
      if (request && request.unit && (request.type === 'location' || request.type === 'achat')) {
        const unit = await Unit.findById(request.unit._id || request.unit);
        
        if (unit) {
          // Vérifier que tous les documents sont signés
          const allDocumentsSigned = request.generatedDocuments && 
            request.generatedDocuments.length > 0 &&
            request.generatedDocuments.every(doc => doc.signed === true);
          
          if (allDocumentsSigned) {
            console.log('[PAYMENT SERVICE] 🔄 Attribution automatique de l\'unité après paiement...');
            
            if (request.type === 'location') {
              // Attribuer comme locataire
              unit.locataire = request.createdBy._id || request.createdBy;
              unit.status = 'loue';
              unit.isAvailable = false;
              await unit.save();
              console.log('[PAYMENT SERVICE] ✅ Unité assignée comme locataire:', unit.unitNumber);
              
              // Notifier le demandeur qu'il est maintenant locataire
              const Notification = require('../models/Notification');
              await Notification.create({
                user: request.createdBy._id || request.createdBy,
                type: 'contract',
                title: '🎉 Unité assignée - Vous êtes maintenant locataire !',
                content: `Félicitations ! Votre paiement a été confirmé et l'unité ${unit.unitNumber} vous a été assignée. Vous êtes maintenant locataire.`,
                sender: payment.recipient?._id || payment.recipient,
                request: request._id,
                unit: unit._id,
                building: request.building?._id || request.building,
                payment: payment._id,
                isRead: false
              });
            } else if (request.type === 'achat') {
              // Attribuer comme propriétaire
              unit.proprietaire = request.createdBy._id || request.createdBy;
              unit.status = 'vendu';
              unit.isAvailable = false;
              // Libérer l'ancien locataire s'il y en a un
              unit.locataire = null;
              await unit.save();
              console.log('[PAYMENT SERVICE] ✅ Unité assignée comme propriétaire:', unit.unitNumber);
              
              // Notifier le demandeur qu'il est maintenant propriétaire
              const Notification = require('../models/Notification');
              await Notification.create({
                user: request.createdBy._id || request.createdBy,
                type: 'contract',
                title: '🎉 Unité assignée - Vous êtes maintenant propriétaire !',
                content: `Félicitations ! Votre paiement a été confirmé et l'unité ${unit.unitNumber} vous appartient maintenant. Vous êtes maintenant propriétaire.`,
                sender: payment.recipient?._id || payment.recipient,
                request: request._id,
                unit: unit._id,
                building: request.building?._id || request.building,
                payment: payment._id,
                isRead: false
              });
            }
            
            // Mettre à jour le statut de la demande à 'termine'
            request.status = 'termine';
            request.completedAt = new Date();
            if (!request.statusHistory) {
              request.statusHistory = [];
            }
            request.statusHistory.push({
              status: 'termine',
              changedBy: payment.recipient?._id || payment.recipient,
              changedAt: new Date(),
              comment: 'Paiement confirmé - Unité assignée automatiquement'
            });
            await request.save();
            
            console.log('[PAYMENT SERVICE] ✅ Demande mise à jour - Statut: termine');
          } else {
            console.log('[PAYMENT SERVICE] ⚠️  Documents non tous signés - Attribution reportée');
          }
        }
      }
    } catch (error) {
      console.error('[PAYMENT SERVICE] ❌ Erreur attribution automatique unité (non bloquante):', error);
      // Ne pas faire échouer le paiement si l'attribution échoue
    }
  }

  // Émettre un événement de synchronisation pour notifier le frontend
  try {
    const syncEvent = emitPaymentSyncEvent(payment);
    console.log('[PAYMENT SERVICE] Événement de synchronisation émis:', syncEvent);
    // L'événement sera géré par le système d'événements (WebSocket, etc.)
  } catch (error) {
    console.error('[PAYMENT SERVICE] Erreur émission événement (non bloquante):', error);
  }

  return payment;
}

/**
 * Met à jour automatiquement le statut des paiements en retard
 */
async function updateOverduePayments() {
  const now = new Date();
  const result = await Payment.updateMany(
    {
      status: 'en_attente',
      dueDate: { $lt: now }
    },
    {
      $set: { status: 'en_retard' }
    }
  );
  return result;
}

module.exports = {
  checkPaymentAccess,
  markPaymentAsPaid,
  updateOverduePayments
};

