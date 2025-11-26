const Request = require('../models/Request');
const Unit = require('../models/Unit');
const Building = require('../models/Building');
const User = require('../models/User');

/**
 * Vérifie si une demande dupliquée existe
 * @param {Object} requestData - Données de la demande
 * @returns {Object|null} - La demande existante ou null
 */
async function checkDuplicateRequest(requestData) {
  const { createdBy, unit, type, title, description } = requestData;
  
  const query = {
    createdBy: createdBy,
    type: type || 'autre'
  };
  
  // Si une unité est spécifiée, l'inclure dans la vérification
  if (unit) {
    query.unit = unit;
  }
  
  // Vérifier les demandes similaires créées récemment (dans les dernières 24h)
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);
  
  query.createdAt = { $gte: oneDayAgo };
  
  // Si titre et description sont similaires
  if (title) {
    query.title = title;
  }
  
  // Chercher une demande existante qui n'est pas terminée ou refusée
  const existingRequest = await Request.findOne({
    ...query,
    status: { $nin: ['termine', 'refuse'] }
  });
  
  if (existingRequest) {
    console.log('[REQUEST SYNC] Doublon détecté:', existingRequest._id);
    return existingRequest;
  }
  
  return null;
}

/**
 * Enregistre une nouvelle demande ou retourne un doublon existant
 * @param {Object} requestData - Données de la demande
 * @returns {Object} - La demande créée ou existante
 */
async function recordRequest(requestData) {
  const {
    title,
    description,
    type,
    unit,
    building,
    createdBy,
    assignedTo,
    priority = 'moyenne',
    status = 'en_attente'
  } = requestData;
  
  // Vérifier les doublons
  const duplicate = await checkDuplicateRequest({
    createdBy,
    unit,
    type,
    title,
    description
  });
  
  if (duplicate) {
    console.log('[REQUEST SYNC] Retour de la demande existante au lieu de créer un doublon');
    return duplicate;
  }
  
  // Créer la nouvelle demande
  const request = await Request.create({
    title,
    description,
    type,
    unit,
    building,
    createdBy,
    assignedTo,
    priority,
    status,
    statusHistory: [{
      status: status,
      changedBy: createdBy,
      changedAt: new Date(),
      comment: 'Demande créée'
    }]
  });
  
  console.log('[REQUEST SYNC] Nouvelle demande créée:', request._id);
  return request;
}

/**
 * Met à jour toutes les vues après une modification de demande
 * Cette fonction est appelée automatiquement après chaque modification
 */
async function syncAllRequestViews(requestId) {
  try {
    console.log('[REQUEST SYNC] 🔄 Début synchronisation pour demande:', requestId);
    
    const request = await Request.findById(requestId)
      .populate('unit', 'unitNumber proprietaire locataire status')
      .populate('building', 'name admin')
      .populate('createdBy', 'firstName lastName email phone role')
      .populate('assignedTo', 'firstName lastName email phone');
    
    if (!request) {
      console.error('[REQUEST SYNC] ❌ Demande non trouvée:', requestId);
      return;
    }
    
    // 1. Mettre à jour l'unité si nécessaire
    if (request.unit) {
      await updateUnit(request);
    }
    
    // 2. Mettre à jour les statistiques du building
    if (request.building) {
      await updateBuildingStats(request.building._id || request.building);
    }
    
    // 3. Émettre un événement de synchronisation pour le frontend
    const syncEvent = emitRequestSyncEvent(request);
    console.log('[REQUEST SYNC] 📡 Événement de synchronisation émis:', syncEvent);
    
    console.log('[REQUEST SYNC] ✅ Synchronisation complète terminée pour demande:', requestId);
    
    return syncEvent;
  } catch (error) {
    console.error('[REQUEST SYNC] ❌ Erreur synchronisation:', error);
    console.error('[REQUEST SYNC] Stack:', error.stack);
    return null;
  }
}

/**
 * Met à jour l'unité après une modification de demande
 * Recalcule les métadonnées depuis la base de données
 */
async function updateUnit(request) {
  try {
    if (!request.unit) return;
    
    const unitId = request.unit._id || request.unit;
    const unit = await Unit.findById(unitId);
    
    if (!unit) return;
    
    // Recalculer les métadonnées de demandes depuis la base de données
    const unitRequests = await Request.find({ unit: unitId });
    
    const stats = {
      total: unitRequests.length,
      pending: 0,
      inProgress: 0,
      completed: 0,
      urgent: 0,
      lastRequestDate: null
    };
    
    unitRequests.forEach(r => {
      if (r.status === 'en_attente') {
        stats.pending++;
      } else if (r.status === 'en_cours') {
        stats.inProgress++;
      } else if (r.status === 'termine' || r.status === 'accepte') {
        stats.completed++;
      }
      
      if (r.priority === 'urgente') {
        stats.urgent++;
      }
      
      if (r.createdAt && (!stats.lastRequestDate || r.createdAt > stats.lastRequestDate)) {
        stats.lastRequestDate = r.createdAt;
      }
    });
    
    // Mettre à jour les métadonnées
    if (!unit.metadata) {
      unit.metadata = {};
    }
    unit.metadata.requests = stats;
    
    await unit.save();
    console.log('[REQUEST SYNC] ✅ Unité mise à jour avec métadonnées recalculées:', unit.unitNumber, stats);
  } catch (error) {
    console.error('[REQUEST SYNC] Erreur mise à jour unité:', error);
  }
}

/**
 * Met à jour les statistiques du building
 * Recalcule les statistiques depuis la base de données
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
      console.log('[REQUEST SYNC] Aucune unité pour le building:', building.name);
      return;
    }
    
    // Calculer les statistiques de demandes pour toutes les unités du building
    const stats = await calculateRequestStats({ unit: { $in: unitIds } });
    
    // Mettre à jour les métadonnées du building si nécessaire
    if (!building.metadata) {
      building.metadata = {};
    }
    building.metadata.requests = {
      total: stats.total || 0,
      pending: stats.pending || 0,
      inProgress: stats.inProgress || 0,
      completed: stats.completed || 0,
      urgent: stats.urgent || 0,
      lastUpdated: new Date()
    };
    
    await building.save();
    console.log('[REQUEST SYNC] ✅ Statistiques building mises à jour:', building.name, building.metadata.requests);
  } catch (error) {
    console.error('[REQUEST SYNC] Erreur mise à jour building:', error);
  }
}

/**
 * Émet un événement de synchronisation pour notifier le frontend
 */
function emitRequestSyncEvent(request) {
  const event = {
    type: 'REQUEST_SYNC',
    requestId: request._id?.toString() || request._id,
    status: request.status,
    priority: request.priority,
    requestType: request.type, // Renommé pour éviter conflit avec 'type' de l'événement
    unitId: request.unit?._id?.toString() || request.unit?.toString() || request.unit,
    buildingId: request.building?._id?.toString() || request.building?.toString() || request.building,
    createdById: request.createdBy?._id?.toString() || request.createdBy?.toString() || request.createdBy,
    assignedToId: request.assignedTo?._id?.toString() || request.assignedTo?.toString() || request.assignedTo,
    timestamp: new Date().toISOString()
  };
  
  console.log('[REQUEST SYNC] Événement de synchronisation créé:', event);
  
  // TODO: Émettre via WebSocket ou SSE si disponible
  // Pour l'instant, le frontend écoutera les événements via polling ou WebSocket
  
  return event;
}

/**
 * Récupère les demandes avec filtrage unifié selon le rôle
 * C'est la fonction principale que tous les endpoints doivent utiliser
 */
async function getRequestsUnified(user, filters = {}) {
  let query = { ...filters };
  
  // Filtres selon le rôle
  if (user.role === 'locataire') {
    // Locataire : voir ses demandes ou celles de son unité
    const userUnits = await Unit.find({
      locataire: user._id || user.id
    }).distinct('_id');
    
    query.$or = [
      { createdBy: user._id || user.id },
      ...(userUnits.length > 0 ? [{ unit: { $in: userUnits } }] : [])
    ];
  } else if (user.role === 'proprietaire') {
    // Propriétaire : voir les demandes de ses unités ou celles qu'il a créées
    const userUnits = await Unit.find({
      proprietaire: user._id || user.id
    }).distinct('_id');
    
    query.$or = [
      { createdBy: user._id || user.id },
      ...(userUnits.length > 0 ? [{ unit: { $in: userUnits } }] : [])
    ];
  }
  // Admin : voir toutes les demandes (pas de filtre supplémentaire)
  
  return await Request.find(query)
    .populate('createdBy', 'firstName lastName email')
    .populate('assignedTo', 'firstName lastName email')
    .populate('unit', 'unitNumber')
    .populate('building', 'name')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Récupère les demandes par statut
 */
async function getRequestsByStatus(status, filters = {}) {
  const query = { status, ...filters };
  return await Request.find(query)
    .populate('createdBy', 'firstName lastName email phone role')
    .populate('assignedTo', 'firstName lastName email phone')
    .populate('unit', 'unitNumber')
    .populate('building', 'name')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Récupère les demandes en attente
 */
async function getPendingRequests(filters = {}) {
  return await getRequestsByStatus('en_attente', filters);
}

/**
 * Récupère les demandes en cours
 */
async function getInProgressRequests(filters = {}) {
  return await getRequestsByStatus('en_cours', filters);
}

/**
 * Récupère les demandes terminées
 */
async function getCompletedRequests(filters = {}) {
  return await Request.find({
    status: { $in: ['termine', 'accepte'] },
    ...filters
  })
    .populate('createdBy', 'firstName lastName email phone role')
    .populate('assignedTo', 'firstName lastName email phone')
    .populate('unit', 'unitNumber')
    .populate('building', 'name')
    .sort({ completedAt: -1, updatedAt: -1 })
    .lean();
}

/**
 * Récupère les demandes urgentes
 */
async function getUrgentRequests(filters = {}) {
  return await Request.find({
    priority: 'urgente',
    status: { $nin: ['termine', 'refuse'] },
    ...filters
  })
    .populate('createdBy', 'firstName lastName email phone role')
    .populate('assignedTo', 'firstName lastName email phone')
    .populate('unit', 'unitNumber')
    .populate('building', 'name')
    .sort({ createdAt: 1 }) // Les plus anciennes en premier
    .lean();
}

/**
 * Calcule les statistiques de demandes pour un utilisateur, une unité ou un building
 * Met à jour automatiquement les statuts avant de calculer
 */
async function calculateRequestStats(filters = {}) {
  const [
    total,
    pending,
    inProgress,
    completed,
    urgent,
    byType,
    byPriority
  ] = await Promise.all([
    Request.countDocuments(filters),
    Request.countDocuments({ ...filters, status: 'en_attente' }),
    Request.countDocuments({ ...filters, status: 'en_cours' }),
    Request.countDocuments({ ...filters, status: { $in: ['termine', 'accepte'] } }),
    Request.countDocuments({ ...filters, priority: 'urgente', status: { $nin: ['termine', 'refuse'] } }),
    Request.aggregate([
      { $match: filters },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]),
    Request.aggregate([
      { $match: filters },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ])
  ]);

  // Organiser les résultats par type
  const byTypeObj = {};
  (byType || []).forEach(item => {
    byTypeObj[item._id] = item.count;
  });

  // Organiser les résultats par priorité
  const byPriorityObj = {};
  (byPriority || []).forEach(item => {
    byPriorityObj[item._id] = item.count;
  });

  return {
    total: total || 0,
    pending: pending || 0,
    inProgress: inProgress || 0,
    completed: completed || 0,
    urgent: urgent || 0,
    byType: byTypeObj,
    byPriority: byPriorityObj
  };
}

/**
 * Met à jour l'historique des statuts d'une demande
 */
async function updateRequestStatusHistory(requestId, newStatus, changedBy, comment = null) {
  try {
    const request = await Request.findById(requestId);
    if (!request) return;
    
    if (!request.statusHistory) {
      request.statusHistory = [];
    }
    
    // Vérifier que le statut a vraiment changé
    const lastStatus = request.statusHistory[request.statusHistory.length - 1];
    if (lastStatus && lastStatus.status === newStatus) {
      // Statut identique, ne pas ajouter d'entrée
      return;
    }
    
    // Ajouter une nouvelle entrée dans l'historique
    request.statusHistory.push({
      status: newStatus,
      changedBy: changedBy,
      changedAt: new Date(),
      comment: comment || `Statut changé en ${newStatus}`
    });
    
    await request.save();
    console.log('[REQUEST SYNC] ✅ Historique mis à jour pour demande:', requestId);
  } catch (error) {
    console.error('[REQUEST SYNC] Erreur mise à jour historique:', error);
  }
}

module.exports = {
  // Fonctions principales
  checkDuplicateRequest,
  recordRequest,
  syncAllRequestViews,
  emitRequestSyncEvent,
  updateRequestStatusHistory,
  
  // Fonctions de mise à jour
  updateUnit,
  updateBuildingStats,
  
  // Fonctions de récupération centralisées (source unique de vérité)
  getRequestsUnified,
  getRequestsByStatus,
  getPendingRequests,
  getInProgressRequests,
  getCompletedRequests,
  getUrgentRequests,
  calculateRequestStats
};

