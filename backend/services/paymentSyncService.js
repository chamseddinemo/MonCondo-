const Payment = require('../models/Payment');
const Unit = require('../models/Unit');
const Request = require('../models/Request');
const User = require('../models/User');
const Building = require('../models/Building');

/**
 * Vérifie si un paiement dupliqué existe
 * @param {Object} paymentData - Données du paiement
 * @returns {Object|null} - Le paiement existant ou null
 */
async function checkDuplicatePayment(paymentData) {
  const { payer, unit, amount, dueDate, type, requestId } = paymentData;
  
  const query = {
    payer: payer,
    unit: unit,
    amount: amount,
    type: type || 'autre'
  };
  
  // Si c'est un paiement initial, vérifier aussi le requestId
  if (requestId) {
    query.requestId = requestId;
  }
  
  // Vérifier les paiements avec la même dueDate (à 1 jour près)
  if (dueDate) {
    const dueDateStart = new Date(dueDate);
    dueDateStart.setHours(0, 0, 0, 0);
    const dueDateEnd = new Date(dueDate);
    dueDateEnd.setHours(23, 59, 59, 999);
    
    query.dueDate = {
      $gte: dueDateStart,
      $lte: dueDateEnd
    };
  }
  
  // Chercher un paiement existant qui n'est pas annulé
  const existingPayment = await Payment.findOne({
    ...query,
    status: { $ne: 'annule' }
  });
  
  if (existingPayment) {
    console.log('[PAYMENT SYNC] Doublon détecté:', existingPayment._id);
    return existingPayment;
  }
  
  return null;
}

/**
 * Enregistre un nouveau paiement ou retourne un doublon existant
 * @param {Object} paymentData - Données du paiement
 * @returns {Object} - Le paiement créé ou existant
 */
async function recordPayment(paymentData) {
  const {
    payer,
    unit,
    building,
    amount,
    type = 'autre',
    dueDate,
    description,
    requestId,
    recipient,
    paymentMethod = 'autre',
    status = 'en_attente'
  } = paymentData;
  
  // Vérifier les doublons
  const duplicate = await checkDuplicatePayment({
    payer,
    unit,
    amount,
    dueDate,
    type,
    requestId
  });
  
  if (duplicate) {
    console.log('[PAYMENT SYNC] Retour du paiement existant au lieu de créer un doublon');
    return duplicate;
  }
  
  // Créer le nouveau paiement
  const payment = await Payment.create({
    payer,
    unit,
    building,
    amount,
    type,
    dueDate: dueDate || new Date(),
    description,
    requestId,
    recipient,
    paymentMethod,
    status: status || 'en_attente'
  });
  
  console.log('[PAYMENT SYNC] Nouveau paiement créé:', payment._id, 'avec statut:', payment.status);
  return payment;
}

/**
 * Met à jour toutes les vues après un paiement
 * Cette fonction est appelée automatiquement après chaque paiement réussi
 * Elle synchronise : unité, demande, building, et émet un événement pour le frontend
 */
async function syncAllPaymentViews(paymentId) {
  try {
    console.log('[PAYMENT SYNC] 🔄 Début synchronisation complète pour paiement:', paymentId);
    
    const payment = await Payment.findById(paymentId)
      .populate('unit', 'unitNumber proprietaire locataire status')
      .populate('building', 'name admin')
      .populate('payer', 'firstName lastName email')
      .populate('recipient', 'firstName lastName email');
    
    if (!payment) {
      console.error('[PAYMENT SYNC] ❌ Paiement non trouvé:', paymentId);
      return;
    }
    
    // 1. Mettre à jour l'unité (recalcule les métadonnées depuis la base)
    await updateUnit(payment);
    
    // 2. Mettre à jour la demande si c'est un paiement initial
    if (payment.requestId) {
      await updateRequest(payment);
    }
    
    // 3. Mettre à jour les statistiques du building
    if (payment.building) {
      await updateBuildingStats(payment.building._id || payment.building);
    }
    
    // 4. Mettre à jour les statuts en retard (au cas où ce paiement était en retard)
    await updateOverdueStatus();
    
    // 5. Émettre un événement de synchronisation pour le frontend
    const syncEvent = emitPaymentSyncEvent(payment);
    console.log('[PAYMENT SYNC] 📡 Événement de synchronisation émis:', syncEvent);
    
    // Émettre aussi via Socket.io si disponible
    if (typeof global !== 'undefined' && global.io) {
      // Émettre un événement spécifique pour les paiements payés
      if (payment.status === 'paye') {
        global.io.emit('paymentPaid', {
          paymentId: payment._id?.toString() || payment._id,
          requestId: payment.requestId?._id?.toString() || payment.requestId?.toString() || payment.requestId,
          status: 'paye',
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          transactionId: payment.transactionId,
          paidDate: payment.paidDate,
          timestamp: new Date().toISOString(),
          ...syncEvent
        });
        console.log('[PAYMENT SYNC] 📡 Événement Socket.io paymentPaid émis');
      }
      
      // Émettre aussi un événement de synchronisation générale
      global.io.emit('paymentSync', {
        paymentId: payment._id?.toString() || payment._id,
        requestId: payment.requestId?._id?.toString() || payment.requestId?.toString() || payment.requestId,
        status: payment.status,
        timestamp: new Date().toISOString(),
        ...syncEvent
      });
      console.log('[PAYMENT SYNC] 📡 Événement Socket.io paymentSync émis');
    }
    
    console.log('[PAYMENT SYNC] ✅ Synchronisation complète terminée pour paiement:', paymentId);
    
    return syncEvent;
  } catch (error) {
    console.error('[PAYMENT SYNC] ❌ Erreur synchronisation:', error);
    console.error('[PAYMENT SYNC] Stack:', error.stack);
    // Ne pas faire échouer le paiement si la synchronisation échoue
    // On retourne null pour indiquer qu'il y a eu une erreur mais on ne bloque pas
    return null;
  }
}

/**
 * Met à jour l'unité après un paiement
 * Recalcule toutes les métadonnées de paiement depuis la base de données pour garantir la cohérence
 */
async function updateUnit(payment) {
  try {
    if (!payment.unit) return;
    
    const unitId = payment.unit._id || payment.unit;
    const unit = await Unit.findById(unitId);
    
    if (!unit) return;
    
    // Si c'est un paiement initial et que le paiement est payé
    if (payment.requestId && payment.status === 'paye') {
      // Marquer l'unité comme louée si c'est une location
      const request = await Request.findById(payment.requestId);
      if (request && request.type === 'location' && unit.status === 'disponible') {
        unit.status = 'loue';
        if (request.createdBy) {
          unit.locataire = request.createdBy;
        }
        await unit.save();
        console.log('[PAYMENT SYNC] ✅ Unité marquée comme louée:', unit.unitNumber);
      }
    }
    
    // Recalculer les métadonnées de paiement depuis la base de données pour garantir la cohérence
    // Au lieu d'incrémenter, on recalcule tout depuis zéro
    const now = new Date();
    const unitPayments = await Payment.find({ unit: unitId });
    
    const stats = {
      totalReceived: 0,
      totalPending: 0,
      totalLate: 0,
      lastPaymentDate: null
    };
    
    unitPayments.forEach(p => {
      if (p.status === 'paye') {
        stats.totalReceived += p.amount || 0;
        if (p.paidDate && (!stats.lastPaymentDate || p.paidDate > stats.lastPaymentDate)) {
          stats.lastPaymentDate = p.paidDate;
        }
      } else if (p.status === 'en_attente') {
        // Vérifier si c'est en retard
        if (p.dueDate && p.dueDate < now) {
          stats.totalLate += p.amount || 0;
        } else {
          stats.totalPending += p.amount || 0;
        }
      } else if (p.status === 'en_retard') {
        stats.totalLate += p.amount || 0;
      }
    });
    
    // Mettre à jour les métadonnées
    if (!unit.metadata) {
      unit.metadata = {};
    }
    unit.metadata.payments = stats;
    
    await unit.save();
    console.log('[PAYMENT SYNC] ✅ Unité mise à jour avec métadonnées recalculées:', unit.unitNumber, stats);
  } catch (error) {
    console.error('[PAYMENT SYNC] Erreur mise à jour unité:', error);
  }
}

/**
 * Met à jour la demande après un paiement initial
 */
async function updateRequest(payment) {
  try {
    if (!payment.requestId) return;
    
    const request = await Request.findById(payment.requestId);
    if (!request || !request.initialPayment) return;
    
    // Mettre à jour le statut du paiement initial
    if (payment.status === 'paye') {
      request.initialPayment.status = 'paye';
      request.initialPayment.paidAt = payment.paidDate || new Date();
      request.initialPayment.paymentMethod = payment.paymentMethod;
      request.initialPayment.transactionId = payment.transactionId;
      
      await request.save();
      console.log('[PAYMENT SYNC] ✅ Demande mise à jour:', request._id);
    }
  } catch (error) {
    console.error('[PAYMENT SYNC] Erreur mise à jour demande:', error);
  }
}

/**
 * Met à jour les statistiques du building
 * Recalcule les statistiques depuis la base de données pour garantir la cohérence
 */
async function updateBuildingStats(buildingId) {
  try {
    const building = await Building.findById(buildingId);
    if (!building) return;
    
    // Recalculer les statistiques depuis la base de données
    const Unit = require('../models/Unit');
    const units = await Unit.find({ building: buildingId });
    const unitIds = units.map(u => u._id);
    
    if (unitIds.length === 0) {
      console.log('[PAYMENT SYNC] Aucune unité pour le building:', building.name);
      return;
    }
    
    // Calculer les statistiques de paiements pour toutes les unités du building
    const stats = await calculatePaymentStats({ unit: { $in: unitIds } });
    
    // Mettre à jour les métadonnées du building si nécessaire
    if (!building.metadata) {
      building.metadata = {};
    }
    building.metadata.payments = {
      totalReceived: stats.paidAmount || 0,
      totalPending: stats.pendingAmount || 0,
      totalLate: stats.overdueAmount || 0,
      lastUpdated: new Date()
    };
    
    await building.save();
    console.log('[PAYMENT SYNC] ✅ Statistiques building mises à jour:', building.name, building.metadata.payments);
  } catch (error) {
    console.error('[PAYMENT SYNC] Erreur mise à jour building:', error);
  }
}

/**
 * Émet un événement de synchronisation pour notifier le frontend
 * Cette fonction est appelée automatiquement après chaque modification de paiement
 */
function emitPaymentSyncEvent(payment) {
  const event = {
    type: 'PAYMENT_SYNC',
    paymentId: payment._id?.toString() || payment._id,
    status: payment.status,
    unitId: payment.unit?._id?.toString() || payment.unit?.toString() || payment.unit,
    buildingId: payment.building?._id?.toString() || payment.building?.toString() || payment.building,
    payerId: payment.payer?._id?.toString() || payment.payer?.toString() || payment.payer,
    recipientId: payment.recipient?._id?.toString() || payment.recipient?.toString() || payment.recipient,
    amount: payment.amount,
    paymentType: payment.type, // Renommé pour éviter conflit avec 'type' de l'événement
    paidDate: payment.paidDate,
    requestId: payment.requestId?._id?.toString() || payment.requestId?.toString() || payment.requestId,
    timestamp: new Date().toISOString()
  };
  
  console.log('[PAYMENT SYNC] Événement de synchronisation créé:', event);
  return event;
}

/**
 * Service centralisé pour récupérer les paiements selon différents critères
 * Toutes les pages doivent utiliser ces fonctions pour garantir la cohérence
 */
async function getPaymentsByStatus(status, filters = {}) {
  const query = { status, ...filters };
  return await Payment.find(query)
    .populate('payer', 'firstName lastName email')
    .populate('recipient', 'firstName lastName email')
    .populate('unit', 'unitNumber')
    .populate('building', 'name')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Récupère les paiements reçus (payés) pour un utilisateur ou une unité
 */
async function getReceivedPayments(filters = {}) {
  return await getPaymentsByStatus('paye', filters);
}

/**
 * Récupère les paiements en attente
 */
async function getPendingPayments(filters = {}) {
  return await getPaymentsByStatus('en_attente', filters);
}

/**
 * Met à jour automatiquement les statuts des paiements en retard
 * Cette fonction doit être appelée périodiquement ou avant chaque récupération
 */
async function updateOverdueStatus() {
  try {
    const now = new Date();
    // Trouver tous les paiements en_attente avec dueDate passée
    // Limiter à 1000 pour éviter les problèmes de performance
    const overduePayments = await Payment.find({
      status: 'en_attente',
      dueDate: { $lt: now }
    }).limit(1000).lean();

    if (overduePayments.length > 0) {
      // Mettre à jour leur statut en batch
      const paymentIds = overduePayments.map(p => p._id);
      await Payment.updateMany(
        { _id: { $in: paymentIds } },
        { $set: { status: 'en_retard' } }
      );
      console.log(`[PAYMENT SYNC] ✅ ${overduePayments.length} paiement(s) mis à jour en "en_retard"`);
    }

    return overduePayments.length;
  } catch (error) {
    console.error('[PAYMENT SYNC] ❌ Erreur mise à jour statuts en retard:', error);
    console.error('[PAYMENT SYNC] Stack:', error.stack);
    // Retourner 0 plutôt que de faire échouer la fonction
    return 0;
  }
}

/**
 * Récupère les paiements en retard
 * Met à jour automatiquement les statuts avant de récupérer
 */
async function getOverduePayments(filters = {}) {
  // Mettre à jour les statuts en retard d'abord
  await updateOverdueStatus();
  
  const now = new Date();
  // Maintenant récupérer uniquement ceux avec status='en_retard'
  // OU ceux avec status='en_attente' et dueDate passée (pour les cas où la mise à jour n'a pas encore eu lieu)
  return await Payment.find({
    $or: [
      { status: 'en_retard', ...filters },
      {
        status: 'en_attente',
        dueDate: { $lt: now },
        ...filters
      }
    ]
  })
    .populate('payer', 'firstName lastName email')
    .populate('recipient', 'firstName lastName email')
    .populate('unit', 'unitNumber')
    .populate('building', 'name')
    .sort({ dueDate: 1 })
    .lean();
}

/**
 * Calcule les statistiques de paiements pour un utilisateur ou une unité
 * Met à jour automatiquement les statuts en retard avant de calculer
 */
async function calculatePaymentStats(filters = {}) {
  try {
    // Mettre à jour les statuts en retard d'abord (avec gestion d'erreur)
    try {
      await updateOverdueStatus();
    } catch (updateError) {
      console.error('[PAYMENT SYNC] ⚠️ Erreur updateOverdueStatus (non bloquante):', updateError.message);
      // Continuer même si updateOverdueStatus échoue
    }
    
    const now = new Date();
    
    // Construire les filtres pour les paiements en retard
    // Note: on doit gérer le cas où filters contient déjà un $or ou d'autres opérateurs
    const overdueFilters = {
      ...filters,
      $or: [
        { status: 'en_retard' },
        {
          status: 'en_attente',
          dueDate: { $lt: now }
        }
      ]
    };
    
    // Exécuter toutes les requêtes avec gestion d'erreur individuelle
    const [
      total,
      paid,
      pending,
      overdue,
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount
    ] = await Promise.all([
      Payment.countDocuments(filters).catch(() => 0),
      Payment.countDocuments({ ...filters, status: 'paye' }).catch(() => 0),
      Payment.countDocuments({ ...filters, status: 'en_attente' }).catch(() => 0),
      Payment.countDocuments(overdueFilters).catch(() => 0),
      Payment.aggregate([
        { $match: filters },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).catch(() => [{ total: 0 }]),
      Payment.aggregate([
        { $match: { ...filters, status: 'paye' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).catch(() => [{ total: 0 }]),
      Payment.aggregate([
        { $match: { ...filters, status: 'en_attente' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).catch(() => [{ total: 0 }]),
      Payment.aggregate([
        { $match: overdueFilters },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).catch(() => [{ total: 0 }])
    ]);

    return {
      total: total || 0,
      paid: paid || 0,
      pending: pending || 0,
      overdue: overdue || 0,
      totalAmount: totalAmount[0]?.total || 0,
      paidAmount: paidAmount[0]?.total || 0,
      pendingAmount: pendingAmount[0]?.total || 0,
      overdueAmount: overdueAmount[0]?.total || 0
    };
  } catch (error) {
    console.error('[PAYMENT SYNC] ❌ Erreur calculatePaymentStats:', error);
    console.error('[PAYMENT SYNC] Stack:', error.stack);
    // Retourner des stats vides en cas d'erreur plutôt que de faire échouer
    return {
      total: 0,
      paid: 0,
      pending: 0,
      overdue: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      overdueAmount: 0
    };
  }
}

/**
 * Récupère les paiements avec filtrage unifié selon le rôle
 * C'est la fonction principale que tous les endpoints doivent utiliser
 */
async function getPaymentsUnified(user, filters = {}) {
  try {
    // Mettre à jour les statuts en retard d'abord (non bloquant)
    try {
      await updateOverdueStatus();
    } catch (updateError) {
      console.error('[PAYMENT SYNC] ⚠️ Erreur updateOverdueStatus (non bloquante):', updateError.message);
      // Continuer même si updateOverdueStatus échoue
    }
    
    let query = { ...filters };
    
    // Filtres selon le rôle
    if (user.role === 'locataire') {
      // Locataire : voir seulement ses paiements
      query.payer = user._id || user.id;
    } else if (user.role === 'proprietaire') {
      // Propriétaire : voir les paiements de ses unités
      const Unit = require('../models/Unit');
      const userUnits = await Unit.find({
        proprietaire: user._id || user.id
      }).distinct('_id');
      if (userUnits.length > 0) {
        query.unit = { $in: userUnits };
      } else {
        // Si le propriétaire n'a pas d'unités, retourner un tableau vide
        return [];
      }
    }
    // Admin : voir tous les paiements (pas de filtre supplémentaire)
    
    const payments = await Payment.find(query)
      .populate('payer', 'firstName lastName email')
      .populate('recipient', 'firstName lastName email')
      .populate('unit', 'unitNumber')
      .populate('building', 'name')
      .sort({ createdAt: -1 })
      .lean();
    
    return payments;
  } catch (error) {
    console.error('[PAYMENT SYNC] ❌ Erreur getPaymentsUnified:', error);
    console.error('[PAYMENT SYNC] Stack:', error.stack);
    console.error('[PAYMENT SYNC] User:', user?._id, user?.role);
    console.error('[PAYMENT SYNC] Filters:', filters);
    
    // En cas d'erreur, retourner un tableau vide plutôt que de faire échouer
    // Cela permet à l'application de continuer à fonctionner même en cas d'erreur de base de données
    return [];
  }
}

module.exports = {
  // Fonctions principales
  checkDuplicatePayment,
  recordPayment,
  syncAllPaymentViews,
  emitPaymentSyncEvent,
  updateOverdueStatus,
  
  // Fonctions de mise à jour
  updateUnit,
  updateRequest,
  updateBuildingStats,
  
  // Fonctions de récupération centralisées (source unique de vérité)
  getPaymentsByStatus,
  getReceivedPayments,
  getPendingPayments,
  getOverduePayments,
  calculatePaymentStats,
  getPaymentsUnified
};

