const Request = require('../models/Request');
const Unit = require('../models/Unit');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');
const { generateLeaseAgreement, generateSaleAgreement } = require('../services/documentService');
const { notifyNewRequest, notifyRequestAccepted, notifyRequestRejected, notifyDocumentSigned, notifyInitialPaymentReceived, notifyUnitAssigned } = require('../services/notificationService');
const path = require('path');
const fs = require('fs');

// @desc    Obtenir toutes les demandes
// @route   GET /api/requests
// @access  Private
exports.getRequests = async (req, res) => {
  try {
    const { building, unit, type, status, createdBy, assignedTo, priority } = req.query;
    const { getRequestsUnified, getPendingRequests, getInProgressRequests, getCompletedRequests, getUrgentRequests } = require('../services/requestSyncService');
    
    // Construire les filtres de base
    const filters = {};
    if (building) filters.building = building;
    if (unit) filters.unit = unit;
    if (type) filters.type = type;
    if (createdBy) filters.createdBy = createdBy;
    if (assignedTo) filters.assignedTo = assignedTo;
    if (priority) filters.priority = priority;

    let requests = [];
    
    // Utiliser les fonctions centralisées selon le statut
    if (status === 'en_attente') {
      requests = await getPendingRequests(filters);
    } else if (status === 'en_cours') {
      requests = await getInProgressRequests(filters);
    } else if (status === 'termine' || status === 'accepte') {
      requests = await getCompletedRequests(filters);
    } else if (priority === 'urgente') {
      requests = await getUrgentRequests(filters);
    } else {
      // Toutes les demandes - utiliser la fonction unifiée
      requests = await getRequestsUnified(req.user, filters);
    }

    // Appliquer le tri et la pagination
    const { page, limit, sortField, sortOrder } = getPaginationParams(req.query, {
      allowedSortFields: ['createdAt', 'updatedAt', 'status', 'priority'],
      defaultSortField: 'createdAt',
      defaultOrder: 'desc'
    });
    
    // Trier les résultats
    requests.sort((a, b) => {
      const aVal = a[sortField] || a.createdAt;
      const bVal = b[sortField] || b.createdAt;
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    const total = requests.length;
    const skip = (page - 1) * limit;
    const paginatedRequests = requests.slice(skip, skip + limit);

    const pagination = buildPaginationMeta({ page, limit, total });

    res.status(200).json({
      success: true,
      count: paginatedRequests.length,
      ...pagination,
      data: paginatedRequests
    });
  } catch (error) {
    console.error('[REQUEST] Erreur getRequests:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Obtenir une demande par ID
// @route   GET /api/requests/:id
// @access  Private
exports.getRequest = async (req, res) => {
  try {
    // Toujours inclure toutes les informations du profil du demandeur pour synchronisation
    const populateFields = 'firstName lastName email phone role monthlyIncome numberOfChildren creditScore reputation previousTenant';

    const request = await Request.findById(req.params.id)
      .populate('building', 'name address')
      .populate('unit', 'unitNumber floor type size bedrooms rentPrice salePrice')
      .populate('createdBy', populateFields)
      .populate('assignedTo', 'firstName lastName email phone')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName')
      .populate('statusHistory.changedBy', 'firstName lastName')
      .populate('adminNotes.addedBy', 'firstName lastName')
      .populate('generatedDocuments.signedBy', 'firstName lastName')
      .lean(); // Utiliser lean() pour obtenir un objet plain JavaScript

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin') {
      const userUnits = await Unit.find({
        $or: [
          { proprietaire: req.user._id },
          { locataire: req.user._id }
        ]
      }).select('_id');

      const userId = req.user._id.toString();
      const creatorId = request.createdBy ? (request.createdBy._id ? request.createdBy._id.toString() : request.createdBy.toString()) : null;
      
      // Vérifier si l'utilisateur est le créateur
      const isCreator = creatorId === userId;
      
      // Vérifier si la demande concerne une unité de l'utilisateur
      let hasUnitAccess = false;
      if (request.unit) {
        const requestUnitId = request.unit._id ? request.unit._id.toString() : request.unit.toString();
        hasUnitAccess = userUnits.some(u => u._id.toString() === requestUnitId);
      }

      if (!isCreator && !hasUnitAccess) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé. Vous ne pouvez voir que vos propres demandes ou celles liées à vos unités.'
        });
      }
    }

    // Récupérer les paiements liés à cette demande
    const Payment = require('../models/Payment');
    const payments = await Payment.find({ requestId: request._id })
      .populate('payer', 'firstName lastName email')
      .populate('recipient', 'firstName lastName email')
      .populate('unit', 'unitNumber')
      .populate('building', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Ajouter les paiements à la réponse
    const requestWithPayments = {
      ...request,
      payments: payments || []
    };
    
    // Log pour déboguer - vérifier que les documents sont présents
    console.log('[GET REQUEST] 📋 Demande récupérée:', {
      requestId: request._id,
      status: request.status,
      hasGeneratedDocuments: !!(request.generatedDocuments && request.generatedDocuments.length > 0),
      documentsCount: request.generatedDocuments?.length || 0,
      documents: request.generatedDocuments?.map(doc => ({
        _id: doc._id,
        type: doc.type,
        filename: doc.filename,
        signed: doc.signed || false
      })) || [],
      userRole: req.user.role,
      userId: req.user._id
    });

    res.status(200).json({
      success: true,
      data: requestWithPayments
    });
  } catch (error) {
    console.error('[GET REQUEST] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération de la demande'
    });
  }
};

// @desc    Créer une demande
// @route   POST /api/requests
// @access  Private
exports.createRequest = async (req, res) => {
  try {
    // Ajouter le créateur automatiquement
    req.body.createdBy = req.user._id;
    
    console.log('[CREATE REQUEST] 📝 Création de demande:', {
      userId: req.user._id,
      userEmail: req.user.email,
      userRole: req.user.role,
      type: req.body.type,
      unit: req.body.unit,
      building: req.body.building,
      createdBy: req.body.createdBy
    });

    // Si une unité est fournie mais pas de building, récupérer le building depuis l'unité
    let unit = null;
    if (req.body.unit && !req.body.building) {
      unit = await Unit.findById(req.body.unit).select('building unitNumber');
      if (unit && unit.building) {
        req.body.building = unit.building;
      }
    } else if (req.body.unit) {
      unit = await Unit.findById(req.body.unit).select('unitNumber');
    }

    // Générer un titre automatiquement si non fourni
    if (!req.body.title || req.body.title.trim() === '') {
      const typeLabel = req.body.type === 'location' ? 'Location' : 
                       req.body.type === 'achat' ? 'Achat' : 
                       req.body.type === 'maintenance' ? 'Maintenance' :
                       req.body.type === 'service' ? 'Service' :
                       req.body.type === 'reclamation' ? 'Réclamation' : 'Demande';
      
      if (unit) {
        req.body.title = `Demande de ${typeLabel} - Unité ${unit.unitNumber}`;
      } else {
        req.body.title = `Demande de ${typeLabel}`;
      }
    }

    // Pour les locataires sans unité spécifique, chercher leur unité assignée
    if (!req.body.building && req.user.role === 'locataire') {
      const locataireUnit = await Unit.findOne({ locataire: req.user._id }).select('building');
      if (locataireUnit && locataireUnit.building) {
        req.body.building = locataireUnit.building;
      }
    }

    // Si toujours pas de building, chercher le premier building depuis une unité
    if (!req.body.building) {
      const firstUnit = await Unit.findOne().select('building').populate('building', '_id');
      if (firstUnit && firstUnit.building) {
        req.body.building = firstUnit.building._id || firstUnit.building;
      }
    }

    // Utiliser le service centralisé pour éviter les doublons
    const { recordRequest } = require('../services/requestSyncService');
    const request = await recordRequest({
      ...req.body,
      createdBy: req.user._id
    });

    console.log('[CREATE REQUEST] ✅ Demande créée avec succès:', {
      requestId: request._id,
      type: request.type,
      status: request.status,
      createdBy: request.createdBy,
      unit: request.unit,
      building: request.building,
      hasInitialPayment: !!request.initialPayment,
      initialPaymentStatus: request.initialPayment?.status || 'non créé'
    });

    const populatedRequest = await Request.findById(request._id)
      .populate('building', 'name address')
      .populate('unit', 'unitNumber')
      .populate('createdBy', 'firstName lastName email phone role');

    // Synchroniser toutes les vues après la création via le service global
    try {
      const { syncRequestGlobally } = require('../services/globalSyncService');
      await syncRequestGlobally(request._id);
      console.log('[CREATE REQUEST] ✅ Synchronisation globale terminée');
    } catch (syncError) {
      console.error('[CREATE REQUEST] ⚠️  Erreur synchronisation (non bloquante):', syncError);
      // Fallback vers la synchronisation locale si la globale échoue
      try {
        const { syncAllRequestViews } = require('../services/requestSyncService');
        await syncAllRequestViews(request._id);
      } catch (fallbackError) {
        console.error('[CREATE REQUEST] ⚠️  Erreur synchronisation fallback:', fallbackError);
      }
    }

    // AUTOMATISATION: Créer une conversation et envoyer un message système si une unité est associée
    if (request.unit) {
      try {
        const { syncMaintenanceRequest } = require('../services/messagingSync');
        await syncMaintenanceRequest(request._id);
      } catch (error) {
        console.error('[CREATE REQUEST] Erreur automatisation conversation:', error);
        // Ne pas faire échouer la création de la demande si l'automatisation échoue
      }
    }

    // NOTIFICATION: Notifier les administrateurs de la nouvelle demande
    try {
      const adminUsers = await User.find({ role: 'admin', isActive: true });
      if (adminUsers.length > 0) {
        const populatedRequestForNotification = await Request.findById(request._id)
          .populate('createdBy', 'firstName lastName')
          .populate('unit', 'unitNumber')
          .populate('building', 'name');
        
        await notifyNewRequest(populatedRequestForNotification, adminUsers);
      }
    } catch (error) {
      console.error('[CREATE REQUEST] Erreur notification nouvelle demande:', error);
      // Ne pas faire échouer la création de la demande si la notification échoue
    }

    res.status(201).json({
      success: true,
      message: 'Demande créée avec succès',
      data: populatedRequest
    });
  } catch (error) {
    console.error('[CREATE REQUEST] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la création de la demande',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Mettre à jour une demande
// @route   PUT /api/requests/:id
// @access  Private
exports.updateRequest = async (req, res) => {
  try {
    let request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    // Vérifier les permissions
    const userId = req.user._id.toString();
    const creatorId = request.createdBy ? request.createdBy.toString() : null;
    const isCreator = creatorId === userId;
    const isAdmin = req.user.role === 'admin';
    
    // Vérifier si l'utilisateur est le propriétaire de l'unité concernée (pour les candidatures)
    let isUnitOwner = false;
    if (request.unit && (request.type === 'location' || request.type === 'achat')) {
      const unit = await Unit.findById(request.unit).select('proprietaire');
      if (unit && unit.proprietaire) {
        isUnitOwner = unit.proprietaire.toString() === userId;
      }
    }

    if (!isCreator && !isAdmin && !isUnitOwner) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Si changement de statut, mettre à jour l'historique via le service centralisé
    const oldStatus = request.status;
    if (req.body.status && req.body.status !== request.status) {
      const { updateRequestStatusHistory } = require('../services/requestSyncService');
      await updateRequestStatusHistory(
        req.params.id,
        req.body.status,
        req.user._id,
        req.body.statusComment
      );
    }

    request = await Request.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    // Synchroniser toutes les vues après la modification via le service global
    try {
      const { syncRequestGlobally } = require('../services/globalSyncService');
      await syncRequestGlobally(request._id);
      console.log('[UPDATE REQUEST] ✅ Synchronisation globale terminée');
    } catch (syncError) {
      console.error('[UPDATE REQUEST] ⚠️  Erreur synchronisation (non bloquante):', syncError);
      // Fallback vers la synchronisation locale si la globale échoue
      try {
        const { syncAllRequestViews } = require('../services/requestSyncService');
        await syncAllRequestViews(request._id);
      } catch (fallbackError) {
        console.error('[UPDATE REQUEST] ⚠️  Erreur synchronisation fallback:', fallbackError);
      }
    }

    // Synchronisation automatique : Envoyer des notifications lors du changement de statut
    if (req.body.status && req.body.status !== oldStatus) {
      try {
        const Notification = require('../models/Notification');
        const populatedRequest = await Request.findById(req.params.id)
          .populate('createdBy', 'firstName lastName email')
          .populate('unit', 'unitNumber')
          .populate('building', 'name');
        
        // Notification pour le créateur de la demande
        if (populatedRequest.createdBy) {
          const statusMessages = {
            'en_cours': 'Votre demande est maintenant en cours de traitement.',
            'termine': 'Votre demande a été terminée.',
            'accepte': 'Votre candidature a été acceptée ! Félicitations.',
            'refuse': 'Votre candidature a été refusée.'
          };
          
          await Notification.create({
            user: populatedRequest.createdBy._id,
            type: populatedRequest.type === 'location' || populatedRequest.type === 'achat' ? 'contract' : 'maintenance',
            title: `Demande ${populatedRequest.title} - ${req.body.status === 'accepte' ? 'Acceptée' : req.body.status === 'refuse' ? 'Refusée' : 'Mise à jour'}`,
            content: statusMessages[req.body.status] || `Le statut de votre demande a été mis à jour: ${req.body.status}`,
            sender: req.user._id,
            request: populatedRequest._id,
            unit: populatedRequest.unit?._id,
            building: populatedRequest.building?._id
          });
        }

        // Si c'est une candidature acceptée, notifier aussi le propriétaire de l'unité
        if (req.body.status === 'accepte' && populatedRequest.type === 'location' && populatedRequest.unit) {
          const Unit = require('../models/Unit');
          const unit = await Unit.findById(populatedRequest.unit._id).populate('proprietaire', 'firstName lastName email');
          if (unit && unit.proprietaire) {
            await Notification.create({
              user: unit.proprietaire._id,
              type: 'contract',
              title: 'Candidature acceptée - Unité assignée',
              content: `La candidature de ${populatedRequest.createdBy.firstName} ${populatedRequest.createdBy.lastName} pour l'unité ${populatedRequest.unit.unitNumber} a été acceptée.`,
              sender: req.user._id,
              request: populatedRequest._id,
              unit: populatedRequest.unit._id,
              building: populatedRequest.building?._id
            });
          }
        }
      } catch (notifError) {
        console.error('[UPDATE REQUEST] Erreur création notification:', notifError);
        // Ne pas faire échouer la mise à jour si la notification échoue
      }
    }

    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Supprimer une demande
// @route   DELETE /api/requests/:id
// @access  Private
exports.deleteRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    // Vérifier les permissions
    const userId = req.user._id.toString();
    const creatorId = request.createdBy ? request.createdBy.toString() : null;
    const isCreator = creatorId === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Récupérer les informations avant suppression pour synchroniser
    const unitId = request.unit;
    const buildingId = request.building;
    
    await request.deleteOne();

    // Synchroniser globalement après suppression
    try {
      const { recalculateAllStats } = require('../services/globalSyncService');
      // Recalculer les stats globales après suppression
      await recalculateAllStats();
      console.log('[DELETE REQUEST] ✅ Synchronisation globale terminée');
    } catch (syncError) {
      console.error('[DELETE REQUEST] ⚠️  Erreur synchronisation (non bloquante):', syncError);
      // Fallback vers la synchronisation locale
      try {
        if (unitId) {
          const { updateUnit } = require('../services/requestSyncService');
          const minimalRequest = {
            unit: unitId,
            building: buildingId,
            status: 'annule'
          };
          await updateUnit(minimalRequest);
        }
        if (buildingId) {
          const { updateBuildingStats } = require('../services/requestSyncService');
          await updateBuildingStats(buildingId);
        }
      } catch (fallbackError) {
        console.error('[DELETE REQUEST] ⚠️  Erreur synchronisation fallback:', fallbackError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Demande supprimée',
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Changer le statut d'une demande
// @route   PUT /api/requests/:id/status
// @access  Private/Admin
exports.updateStatus = async (req, res) => {
  try {
    const { status, comment } = req.body;

    let request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    // Ajouter à l'historique
    if (!request.statusHistory) {
      request.statusHistory = [];
    }

    request.statusHistory.push({
      status: status,
      changedBy: req.user._id,
      changedAt: new Date(),
      comment: comment || ''
    });

    request.status = status;

    if (status === 'termine' || status === 'accepte') {
      request.completedAt = new Date();
    }

    await request.save();

    res.status(200).json({
      success: true,
      message: 'Statut mis à jour avec succès',
      data: request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Assigner une demande à un utilisateur
// @route   PUT /api/requests/:id/assign
// @access  Private/Admin
exports.assignRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    request.assignedTo = req.body.assignedTo;
    if (request.status === 'en_attente') {
      request.status = 'en_cours';
    }

    await request.save();

    res.status(200).json({
      success: true,
      message: 'Demande assignée avec succès',
      data: request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Créer une demande de location/achat par un visiteur
// @route   POST /api/requests/visitor-request
// @access  Private
exports.createVisitorRequest = async (req, res) => {
  try {
    // Vérifier que l'utilisateur est visiteur
    if (req.user.role !== 'visiteur') {
      return res.status(403).json({
        success: false,
        message: 'Seuls les visiteurs peuvent créer ce type de demande'
      });
    }

    const { unitId, type, message } = req.body;

    if (!unitId || !type) {
      return res.status(400).json({
        success: false,
        message: 'UnitId et type sont requis'
      });
    }

    const unit = await require('../models/Unit').findById(unitId);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unité non trouvée'
      });
    }

    const request = await Request.create({
      title: `Demande de ${type} - Unité ${unit.unitNumber}`,
      description: message || `Demande de ${type} pour l'unité ${unit.unitNumber}`,
      type: type === 'location' ? 'location' : 'achat',
      building: unit.building,
      unit: unitId,
      createdBy: req.user.id,
      status: 'en_attente'
    });

    const populatedRequest = await Request.findById(request._id)
      .populate('building', 'name')
      .populate('unit', 'unitNumber')
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Demande créée avec succès',
      data: populatedRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Accepter une demande
// @route   PUT /api/requests/:id/accept
// @access  Private/Admin
exports.acceptRequest = async (req, res) => {
  console.log('[ACCEPT REQUEST] ⚡ Fonction acceptRequest appelée');
  console.log('[ACCEPT REQUEST]   ID reçu:', req.params.id);
  console.log('[ACCEPT REQUEST]   Method:', req.method);
  console.log('[ACCEPT REQUEST]   URL:', req.originalUrl);
  console.log('[ACCEPT REQUEST]   Path:', req.path);
  console.log('[ACCEPT REQUEST]   User:', req.user ? req.user.email : 'non authentifié');
  console.log('[ACCEPT REQUEST]   Role:', req.user ? req.user.role : 'non authentifié');
  
  try {
    // Nettoyer et valider l'ID
    const requestId = String(req.params.id || '').trim().replace(/\s+/g, '');
    console.log('[ACCEPT REQUEST]   ID nettoyé:', requestId);
    
    if (!requestId || requestId.length === 0) {
      console.error('[ACCEPT REQUEST] ❌ ID invalide');
      return res.status(400).json({
        success: false,
        message: 'ID de la demande invalide'
      });
    }

    // Récupérer la demande
    const request = await Request.findById(requestId)
      .populate('unit', 'unitNumber type size bedrooms rentPrice salePrice building proprietaire')
      .populate('building', 'name address')
      .populate('createdBy', 'firstName lastName email phone monthlyIncome numberOfChildren creditScore reputation previousTenant');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    // Vérifier que la demande est en attente
    if (request.status !== 'en_attente') {
      const statusLabels = {
        'accepte': 'acceptée',
        'refuse': 'refusée',
        'en_cours': 'en cours de traitement',
        'termine': 'terminée'
      };
      const statusLabel = statusLabels[request.status] || request.status;
      return res.status(400).json({
        success: false,
        message: `Cette demande a déjà été traitée (statut: ${statusLabel}).`,
        currentStatus: request.status
      });
    }

    // Valider le profil du demandeur (avertissement seulement, ne bloque pas)
    if (request.type === 'location' && request.unit && request.createdBy) {
      const unit = await Unit.findById(request.unit._id || request.unit);
      if (unit && unit.rentPrice && request.createdBy.monthlyIncome) {
        const minIncome = unit.rentPrice * 3;
        if (request.createdBy.monthlyIncome < minIncome) {
          // Avertissement seulement, ne bloque pas l'acceptation
          console.warn(`[ACCEPT] Avertissement: Revenu insuffisant pour ${request.createdBy.email}`);
        }
      }
    }

    // Mettre à jour le statut de la demande
    request.status = 'accepte';
    request.approvedBy = req.user._id;
    request.approvedAt = new Date();

    // Ajouter à l'historique
    if (!request.statusHistory) {
      request.statusHistory = [];
    }
    request.statusHistory.push({
      status: 'accepte',
      changedBy: req.user._id,
      changedAt: new Date(),
      comment: 'Demande acceptée par l\'administrateur'
    });

    // Initialiser le paiement initial pour location/achat
    if ((request.type === 'location' || request.type === 'achat') && request.unit) {
      const unit = await Unit.findById(request.unit._id || request.unit);
      if (unit) {
        let amount = 0;
        
        if (request.type === 'location') {
          // Pour location: montant = premier loyer mensuel
          amount = unit.rentPrice || 0;
        } else if (request.type === 'achat') {
          // Pour achat: montant = 10% du prix de vente (acompte)
          // Si salePrice est 0 ou non défini, utiliser un montant minimum ou le rentPrice * 12
          if (unit.salePrice && unit.salePrice > 0) {
            amount = unit.salePrice * 0.1; // 10% du prix de vente
          } else if (unit.rentPrice && unit.rentPrice > 0) {
            // Fallback: utiliser 12 mois de loyer si pas de prix de vente
            amount = unit.rentPrice * 12;
            console.log('[ACCEPT REQUEST] ⚠️  Prix de vente non défini, utilisation de 12 mois de loyer comme acompte:', amount);
          } else {
            // Montant minimum par défaut pour un achat
            amount = 10000; // $10,000 par défaut
            console.log('[ACCEPT REQUEST] ⚠️  Aucun prix défini, utilisation du montant minimum pour achat:', amount);
          }
        }
        
        if (amount > 0) {
          request.initialPayment = {
            amount: amount,
            status: 'en_attente'
          };
          console.log('[ACCEPT REQUEST] 💰 Paiement initial créé:', {
            amount: amount,
            status: 'en_attente',
            type: request.type,
            unitNumber: unit.unitNumber,
            salePrice: unit.salePrice,
            rentPrice: unit.rentPrice
          });
        } else {
          console.log('[ACCEPT REQUEST] ⚠️  Montant paiement initial = 0, aucun paiement créé');
        }
      }
    }

    // Générer les documents (bail ou contrat de vente) - INSTANTANÉ
    if ((request.type === 'location' || request.type === 'achat') && request.unit) {
      console.log('[ACCEPT REQUEST] 📄 Génération des documents - Début');
      try {
        const unit = await Unit.findById(request.unit._id || request.unit)
          .populate('building', 'name address')
          .populate('proprietaire', 'firstName lastName email phone');
        
        // Le building est déjà dans unit.building après populate
        const building = unit.building || request.building;
        const requester = await User.findById(request.createdBy._id || request.createdBy);
        const owner = unit.proprietaire || await User.findOne({ role: 'admin' });

        if (!building) {
          console.error('[ACCEPT REQUEST] ❌ Building manquant');
          throw new Error('Building manquant pour la génération du document');
        }
        if (!requester) {
          console.error('[ACCEPT REQUEST] ❌ Requester manquant');
          throw new Error('Requester manquant pour la génération du document');
        }
        if (!owner) {
          console.error('[ACCEPT REQUEST] ⚠️  Owner manquant, utilisation de l\'admin par défaut');
          const adminUser = await User.findOne({ role: 'admin' });
          if (!adminUser) {
            throw new Error('Aucun propriétaire ou admin trouvé pour la génération du document');
          }
        }

        console.log('[ACCEPT REQUEST] 📄 Génération du document:', {
          type: request.type,
          unit: unit.unitNumber,
          building: building.name,
          requester: `${requester.firstName} ${requester.lastName}`,
          owner: owner ? `${owner.firstName} ${owner.lastName}` : 'Admin par défaut'
        });

        let documentResult;
        if (request.type === 'location') {
          console.log('[ACCEPT REQUEST] 📝 Génération du bail...');
          documentResult = await generateLeaseAgreement(request, unit, building, requester, owner);
        } else if (request.type === 'achat') {
          console.log('[ACCEPT REQUEST] 📝 Génération du contrat de vente...');
          documentResult = await generateSaleAgreement(request, unit, building, requester, owner);
        }

        if (documentResult && documentResult.success) {
          console.log('[ACCEPT REQUEST] ✅ Document généré avec succès:', {
            filename: documentResult.filename,
            path: documentResult.path,
            type: documentResult.type
          });

          if (!request.generatedDocuments) {
            request.generatedDocuments = [];
          }
          
          const uploadsDir = path.join(__dirname, '../uploads');
          // Calculer le chemin relatif depuis uploads
          let relativePath;
          if (path.isAbsolute(documentResult.path)) {
            relativePath = path.relative(uploadsDir, documentResult.path).replace(/\\/g, '/');
          } else {
            // Si c'est déjà relatif, l'utiliser tel quel
            relativePath = documentResult.path.replace(/\\/g, '/');
          }
          
          // S'assurer que le chemin commence par "documents/" si le fichier est dans ce dossier
          if (!relativePath.startsWith('documents/') && !relativePath.startsWith('/')) {
            relativePath = 'documents/' + relativePath;
          }
          
          console.log('[ACCEPT REQUEST] 📁 Chemin document final:', {
            original: documentResult.path,
            relative: relativePath,
            filename: documentResult.filename,
            uploadsDir: uploadsDir
          });
          
          const docType = documentResult.type === 'bail' ? 'bail' : 
                         documentResult.type === 'contrat_vente' ? 'contrat_vente' : 'autre';
          
          const newDocument = {
            type: docType,
            filename: documentResult.filename,
            path: relativePath,
            signed: false,
            generatedAt: documentResult.generatedAt || new Date(),
            signedBy: undefined, // Pas encore signé
            signedAt: undefined  // Pas encore signé
          };

          request.generatedDocuments.push(newDocument);
          console.log('[ACCEPT REQUEST] ✅ Document ajouté à la demande:', {
            documentId: newDocument._id,
            type: newDocument.type,
            filename: newDocument.filename,
            path: newDocument.path,
            totalDocuments: request.generatedDocuments.length,
            signed: false,
            signedBy: undefined,
            signedAt: undefined,
            generatedAt: newDocument.generatedAt,
            note: 'Le document sera signé par le demandeur après consultation'
          });

          // ❌ SIGNATURE AUTOMATIQUE DÉSACTIVÉE
          // Le demandeur doit maintenant consulter et signer manuellement les documents
          // Les documents sont créés avec signed: false et le demandeur les signera via l'interface
        } else {
          console.error('[ACCEPT REQUEST] ❌ Échec de la génération du document:', documentResult);
          throw new Error('La génération du document a échoué');
        }
      } catch (error) {
        console.error('[ACCEPT REQUEST] ❌ Erreur génération document:', error);
        console.error('[ACCEPT REQUEST] Stack:', error.stack);
        // Faire échouer l'acceptation si la génération des documents échoue
        // Les documents doivent être générés automatiquement lors de l'acceptation
        return res.status(500).json({
          success: false,
          message: `Impossible d'accepter la demande : erreur lors de la génération des documents. ${error.message || 'Veuillez vérifier que toutes les informations nécessaires sont présentes (unité, bâtiment, demandeur, propriétaire).'}`
        });
      }
      console.log('[ACCEPT REQUEST] ✅ Génération des documents - Terminé');
      
      // Vérifier que les documents ont bien été générés
      if (!request.generatedDocuments || request.generatedDocuments.length === 0) {
        console.error('[ACCEPT REQUEST] ❌ Aucun document généré malgré le succès de la fonction');
        return res.status(500).json({
          success: false,
          message: 'Impossible d\'accepter la demande : aucun document n\'a pu être généré. Veuillez vérifier que toutes les informations nécessaires sont présentes.'
        });
      }
    }

    // Sauvegarder la demande AVANT de récupérer la version peuplée
    await request.save();
    console.log('[ACCEPT REQUEST] 💾 Demande sauvegardée avec documents:', {
      requestId: request._id,
      documentsCount: request.generatedDocuments?.length || 0,
      documents: request.generatedDocuments?.map(doc => {
        const docObj = doc.toObject ? doc.toObject() : doc;
        return {
          filename: docObj.filename,
          type: docObj.type,
          signed: docObj.signed || false,
          _id: docObj._id
        };
      }) || []
    });
    
    // Attendre un court instant pour s'assurer que la sauvegarde est bien persistée
    await new Promise(resolve => setTimeout(resolve, 100));

    // Promouvoir le visiteur selon le type de demande
    // IMPORTANT: On ne fait QUE la promotion de rôle ici, PAS l'assignation de l'unité
    // L'unité sera assignée plus tard via assignUnit() après paiement et signatures complètes
    try {
      const requester = await User.findById(request.createdBy._id || request.createdBy);
      if (requester && requester.role === 'visiteur' && (request.type === 'location' || request.type === 'achat')) {
        const roleToPromote = request.type === 'achat' ? 'proprietaire' : 'locataire';
        
        console.log(`[ACCEPT REQUEST] 🔄 Promotion du visiteur ${requester.email} vers ${roleToPromote}`);
        
        // Promouvoir directement le visiteur (mais NE PAS assigner l'unité ici)
        requester.role = roleToPromote;
        await requester.save();
        
        console.log(`[ACCEPT REQUEST] ✅ Visiteur promu ${roleToPromote} avec succès`);
        console.log(`[ACCEPT REQUEST] ⏳ L'unité sera assignée plus tard après paiement et signatures complètes des documents`);

        // ❌ ASSIGNATION D'UNITÉ RETIRÉE ICI
        // L'unité doit être assignée UNIQUEMENT après :
        // 1. Tous les documents signés
        // 2. Paiement initial confirmé (paye)
        // 3. Via la fonction assignUnit() appelée par l'admin
        // OU automatiquement via markPaymentAsPaid() après paiement réussi
      }
    } catch (promotionError) {
      console.error('[ACCEPT REQUEST] ⚠️  Erreur promotion visiteur (non bloquante):', promotionError);
      // Ne pas faire échouer l'acceptation si la promotion échoue
    }

    // Synchroniser toutes les vues après l'acceptation via le service global
    try {
      const { updateRequestStatusHistory } = require('../services/requestSyncService');
      const { syncRequestGlobally } = require('../services/globalSyncService');
      await updateRequestStatusHistory(request._id, 'accepte', req.user._id, 'Demande acceptée par l\'administrateur');
      await syncRequestGlobally(request._id);
      console.log('[ACCEPT REQUEST] ✅ Synchronisation globale terminée');
    } catch (syncError) {
      console.error('[ACCEPT REQUEST] ⚠️  Erreur synchronisation (non bloquante):', syncError);
    }

    // Récupérer la demande peuplée pour la réponse (avec les documents générés et signés)
    // Utiliser lean() pour obtenir un objet plain JavaScript (plus rapide)
    let populatedRequest = await Request.findById(request._id)
      .populate('building', 'name address')
      .populate('unit', 'unitNumber type size bedrooms rentPrice salePrice')
      .populate('createdBy', 'firstName lastName email phone monthlyIncome numberOfChildren creditScore reputation')
      .populate('approvedBy', 'firstName lastName')
      .populate('statusHistory.changedBy', 'firstName lastName')
      .lean(); // Utiliser lean() pour obtenir un objet plain JavaScript
    
    // Vérifier que les documents sont bien présents après récupération
    console.log('[ACCEPT REQUEST] 📋 Vérification après récupération:', {
      hasPopulatedRequest: !!populatedRequest,
      hasDocuments: !!(populatedRequest?.generatedDocuments && populatedRequest.generatedDocuments.length > 0),
      documentsCount: populatedRequest?.generatedDocuments?.length || 0,
      requestId: populatedRequest?._id,
      type: populatedRequest?.type,
      requestIdFromDb: request._id
    });
    
    // Si les documents ne sont pas présents, les récupérer depuis la demande sauvegardée
    if (populatedRequest && (!populatedRequest.generatedDocuments || populatedRequest.generatedDocuments.length === 0)) {
      console.log('[ACCEPT REQUEST] ⚠️ Documents absents dans populatedRequest, récupération depuis DB...');
      const savedRequest = await Request.findById(request._id).select('generatedDocuments').lean();
      if (savedRequest && savedRequest.generatedDocuments && savedRequest.generatedDocuments.length > 0) {
        // Convertir les documents en objets plain si nécessaire
        populatedRequest.generatedDocuments = savedRequest.generatedDocuments.map(doc => {
          if (doc.toObject) {
            return doc.toObject();
          }
          return doc;
        });
        console.log('[ACCEPT REQUEST] ✅ Documents récupérés depuis DB:', populatedRequest.generatedDocuments.length);
      } else {
        // Si toujours pas de documents, vérifier directement dans request (objet Mongoose)
        if (request.generatedDocuments && request.generatedDocuments.length > 0) {
          populatedRequest.generatedDocuments = request.generatedDocuments.map(doc => {
            const docObj = doc.toObject ? doc.toObject() : doc;
            return {
              type: docObj.type,
              filename: docObj.filename,
              path: docObj.path,
              signed: docObj.signed || false,
              signedBy: docObj.signedBy,
              signedAt: docObj.signedAt,
              generatedAt: docObj.generatedAt,
              _id: docObj._id
            };
          });
          console.log('[ACCEPT REQUEST] ✅ Documents récupérés depuis request (objet Mongoose):', populatedRequest.generatedDocuments.length);
        }
      }
    }
    
    // Peupler manuellement signedBy pour chaque document (Mongoose peut avoir des difficultés avec le populate imbriqué)
    if (populatedRequest && populatedRequest.generatedDocuments && populatedRequest.generatedDocuments.length > 0) {
      for (let i = 0; i < populatedRequest.generatedDocuments.length; i++) {
        const doc = populatedRequest.generatedDocuments[i];
        if (doc.signedBy && (typeof doc.signedBy === 'string' || doc.signedBy.toString)) {
          try {
            const signerId = doc.signedBy.toString ? doc.signedBy.toString() : doc.signedBy;
            const signer = await User.findById(signerId).select('firstName lastName email').lean();
            if (signer) {
              populatedRequest.generatedDocuments[i].signedBy = signer;
            }
          } catch (populateError) {
            console.error('[ACCEPT REQUEST] Erreur populate signedBy:', populateError);
          }
        } else if (doc.signedBy && typeof doc.signedBy === 'object' && doc.signedBy._id) {
          // signedBy est déjà peuplé, s'assurer qu'il est en format plain
          populatedRequest.generatedDocuments[i].signedBy = doc.signedBy.toObject ? doc.signedBy.toObject() : doc.signedBy;
        }
      }
    }

    // Utiliser populatedRequest comme finalRequest
    const finalRequest = populatedRequest;
    
    // S'assurer que generatedDocuments est bien présent dans la réponse
    if (finalRequest && finalRequest.generatedDocuments && finalRequest.generatedDocuments.length > 0) {
      console.log('[ACCEPT REQUEST] ✅ Documents dans la réponse finale:', finalRequest.generatedDocuments.length);
      finalRequest.generatedDocuments.forEach((doc, index) => {
        console.log(`[ACCEPT REQUEST]   Document ${index + 1}:`, {
          type: doc.type,
          filename: doc.filename,
          path: doc.path,
          signed: doc.signed || false,
          signedBy: doc.signedBy ? {
            id: doc.signedBy._id || doc.signedBy,
            name: doc.signedBy.firstName && doc.signedBy.lastName ? `${doc.signedBy.firstName} ${doc.signedBy.lastName}` : 'N/A',
            email: doc.signedBy.email || 'N/A'
          } : null,
          signedAt: doc.signedAt
        });
      });
    } else {
      console.warn('[ACCEPT REQUEST] ⚠️  Aucun document généré dans la réponse finale');
      console.warn('[ACCEPT REQUEST]   Type de demande:', request.type);
      console.warn('[ACCEPT REQUEST]   Unité présente:', !!request.unit);
      console.warn('[ACCEPT REQUEST]   Documents dans request (avant récupération):', request.generatedDocuments?.length || 0);
      console.warn('[ACCEPT REQUEST]   Documents dans finalRequest:', finalRequest?.generatedDocuments?.length || 0);
      
      // Dernière tentative : récupérer directement depuis la base
      try {
        const dbRequest = await Request.findById(request._id).select('generatedDocuments');
        if (dbRequest && dbRequest.generatedDocuments && dbRequest.generatedDocuments.length > 0) {
          console.log('[ACCEPT REQUEST] ✅ Documents trouvés directement dans la DB:', dbRequest.generatedDocuments.length);
          if (!finalRequest.generatedDocuments) {
            finalRequest.generatedDocuments = [];
          }
          finalRequest.generatedDocuments = dbRequest.generatedDocuments.map(doc => doc.toObject ? doc.toObject() : doc);
        }
      } catch (dbError) {
        console.error('[ACCEPT REQUEST] ❌ Erreur récupération directe DB:', dbError);
      }
    }

    // Envoyer une notification au demandeur pour signer les documents
    try {
      const requester = await User.findById(request.createdBy._id || request.createdBy);
      if (requester && finalRequest.generatedDocuments && finalRequest.generatedDocuments.length > 0) {
        await notifyRequestAccepted(finalRequest, requester);
        
        // Notification supplémentaire pour informer qu'il doit signer les documents
        const Notification = require('../models/Notification');
        const docTypeLabel = finalRequest.type === 'achat' ? 'contrat de vente' : finalRequest.type === 'location' ? 'bail' : 'document';
        await Notification.create({
          user: requester._id,
          type: 'contract',
          title: '📝 Documents à signer - Action requise',
          content: `Votre demande de ${docTypeLabel} pour l'unité ${finalRequest.unit?.unitNumber || 'N/A'} a été acceptée. ${finalRequest.generatedDocuments.length} document(s) ${finalRequest.generatedDocuments.length > 1 ? 'ont été générés automatiquement et sont' : 'a été généré automatiquement et est'} en attente de votre signature. Veuillez consulter votre tableau de bord pour télécharger et signer les documents.`,
          sender: req.user._id,
          request: finalRequest._id,
          unit: finalRequest.unit?._id || finalRequest.unit,
          building: finalRequest.building?._id || finalRequest.building,
          isRead: false
        });
        console.log('[ACCEPT] ✅ Notification envoyée au demandeur pour signature des documents:', requester.email);
      }
    } catch (error) {
      console.error('[ACCEPT] Erreur notification demandeur:', error.message);
      // Ne pas faire échouer l'acceptation si la notification échoue
    }

    // Envoyer une notification au propriétaire de l'unité (si applicable)
    try {
      if (finalRequest.unit && (finalRequest.type === 'location' || finalRequest.type === 'achat')) {
        const unit = await Unit.findById(finalRequest.unit._id || finalRequest.unit)
          .populate('proprietaire', 'firstName lastName email');
        
        if (unit && unit.proprietaire) {
          const requester = await User.findById(request.createdBy._id || request.createdBy);
          const unitNumber = finalRequest.unit.unitNumber || 'N/A';
          const requesterName = requester ? `${requester.firstName} ${requester.lastName}` : 'Un demandeur';
          
          // Créer une notification détaillée pour le propriétaire
          const Notification = require('../models/Notification');
          const notificationContent = finalRequest.generatedDocuments && finalRequest.generatedDocuments.length > 0
            ? `La candidature de ${requesterName} pour l'unité ${unitNumber} a été acceptée. ${finalRequest.generatedDocuments.length} document(s) ${finalRequest.generatedDocuments.length > 1 ? 'sont' : 'est'} en attente de votre signature.`
            : `La candidature de ${requesterName} pour l'unité ${unitNumber} a été acceptée. Veuillez consulter votre tableau de bord pour plus de détails.`;
          
          await Notification.create({
            user: unit.proprietaire._id,
            type: 'contract',
            title: '✅ Candidature acceptée - Action requise',
            content: notificationContent,
            sender: req.user._id,
            request: finalRequest._id,
            unit: finalRequest.unit._id || finalRequest.unit,
            building: finalRequest.building?._id || finalRequest.building,
            isRead: false
          });
          
          console.log('[ACCEPT] Notification envoyée au propriétaire:', unit.proprietaire.email);
        }
      }
    } catch (error) {
      console.error('[ACCEPT] Erreur notification propriétaire:', error.message);
      // Ne pas faire échouer l'acceptation si la notification échoue
    }

    // Construire le message de confirmation
    let message = 'Demande acceptée avec succès.';
    
    if (finalRequest.generatedDocuments && finalRequest.generatedDocuments.length > 0) {
      const docTypes = finalRequest.generatedDocuments.map(doc => {
        return doc.type === 'bail' ? 'bail' : doc.type === 'contrat_vente' ? 'contrat de vente' : 'document';
      }).join(' et ');
      message += ` Le${finalRequest.generatedDocuments.length > 1 ? 's' : ''} ${docTypes} ${finalRequest.generatedDocuments.length > 1 ? 'ont été générés automatiquement' : 'a été généré automatiquement'} et ${finalRequest.generatedDocuments.length > 1 ? 'ont été envoyés' : 'a été envoyé'} au demandeur pour signature.`;
    }
    
    if (finalRequest.initialPayment && finalRequest.initialPayment.amount > 0) {
      message += ` Un paiement initial de ${finalRequest.initialPayment.amount.toFixed(2)} $ sera requis après la signature complète des documents.`;
    }
    
    message += ' Une notification a été envoyée au demandeur pour qu\'il consulte et signe les documents.';

    console.log('[ACCEPT REQUEST] 📤 Envoi de la réponse finale:', {
      hasDocuments: !!(finalRequest.generatedDocuments && finalRequest.generatedDocuments.length > 0),
      documentsCount: finalRequest.generatedDocuments?.length || 0
    });

    return res.status(200).json({
      success: true,
      message: message,
      data: finalRequest
    });
  } catch (error) {
    console.error('[ACCEPT] Erreur:', error);
    return res.status(500).json({
      success: false,
      message: 'Impossible d\'accepter la demande pour le moment. Veuillez réessayer plus tard.'
    });
  }
};

// @desc    Refuser une demande
// @route   PUT /api/requests/:id/reject
// @access  Private/Admin
exports.rejectRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    if (request.status !== 'en_attente') {
      return res.status(400).json({
        success: false,
        message: 'Cette demande a déjà été traitée'
      });
    }

    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Une raison de refus est requise'
      });
    }

    // Mettre à jour le statut
    request.status = 'refuse';
    request.rejectedBy = req.user._id;
    request.rejectedAt = new Date();
    request.rejectionReason = reason;

    // Ajouter à l'historique
    if (!request.statusHistory) {
      request.statusHistory = [];
    }
    request.statusHistory.push({
      status: 'refuse',
      changedBy: req.user._id,
      changedAt: new Date(),
      comment: reason
    });

    await request.save();

    // Synchroniser toutes les vues après le refus via le service global
    try {
      const { updateRequestStatusHistory } = require('../services/requestSyncService');
      const { syncRequestGlobally } = require('../services/globalSyncService');
      await updateRequestStatusHistory(request._id, 'refuse', req.user._id, reason);
      await syncRequestGlobally(request._id);
      console.log('[REJECT REQUEST] ✅ Synchronisation globale terminée');
    } catch (syncError) {
      console.error('[REJECT REQUEST] ⚠️  Erreur synchronisation (non bloquante):', syncError);
    }

    // NOTIFICATION: Notifier le demandeur
    try {
      const requester = await User.findById(request.createdBy);
      if (requester) {
        await notifyRequestRejected(request, requester, reason);
      }
    } catch (error) {
      console.error('[REJECT REQUEST] Erreur notification demande refusée:', error);
      // Ne pas faire échouer le refus si la notification échoue
    }

    const populatedRequest = await Request.findById(request._id)
      .populate('building', 'name address')
      .populate('unit', 'unitNumber')
      .populate('createdBy', 'firstName lastName email')
      .populate('rejectedBy', 'firstName lastName')
      .populate('statusHistory.changedBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Demande refusée',
      data: populatedRequest
    });
  } catch (error) {
    console.error('[REJECT REQUEST] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors du refus de la demande'
    });
  }
};

// @desc    Ajouter une note interne à une demande
// @route   POST /api/requests/:id/notes
// @access  Private/Admin
exports.addAdminNote = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    const { note } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Une note est requise'
      });
    }

    if (!request.adminNotes) {
      request.adminNotes = [];
    }

    request.adminNotes.push({
      note: note,
      addedBy: req.user._id,
      addedAt: new Date()
    });

    await request.save();

    const populatedRequest = await Request.findById(request._id)
      .populate('adminNotes.addedBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Note ajoutée avec succès',
      data: populatedRequest
    });
  } catch (error) {
    console.error('[ADD NOTE] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'ajout de la note'
    });
  }
};

// @desc    Signer un document électroniquement
// @route   PUT /api/requests/:id/documents/:docId/sign
// @access  Private
exports.signDocument = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le demandeur, le propriétaire de l'unité, ou l'admin
    let hasPermission = false;
    
    if (req.user.role === 'admin') {
      hasPermission = true;
    } else if (request.createdBy && request.createdBy.toString() === req.user._id.toString()) {
      hasPermission = true;
    } else if (request.unit && (request.type === 'location' || request.type === 'achat')) {
      // Vérifier si l'utilisateur est le propriétaire de l'unité
      const unit = await Unit.findById(request.unit._id || request.unit).select('proprietaire');
      if (unit && unit.proprietaire && unit.proprietaire.toString() === req.user._id.toString()) {
        hasPermission = true;
      }
    }
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas le droit de signer ce document'
      });
    }

    const docId = req.params.docId;
    const document = request.generatedDocuments?.find(doc => doc._id.toString() === docId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    if (document.signed) {
      return res.status(400).json({
        success: false,
        message: 'Ce document a déjà été signé'
      });
    }

    // Marquer le document comme signé
    document.signed = true;
    document.signedAt = new Date();
    document.signedBy = req.user._id;

    console.log('[SIGN DOCUMENT] ✅ Document signé:', {
      requestId: request._id,
      documentId: docId,
      documentType: document.type,
      documentFilename: document.filename,
      signedBy: req.user._id,
      signerEmail: req.user.email,
      signerRole: req.user.role,
      signedAt: document.signedAt
    });

    await request.save();

    // Vérifier si tous les documents sont signés
    let allDocumentsSigned = false;
    if (request.generatedDocuments && request.generatedDocuments.length > 0) {
      allDocumentsSigned = request.generatedDocuments.every(doc => doc.signed === true);
    }

    // Synchroniser toutes les vues après la signature via le service global
    try {
      const { syncRequestGlobally } = require('../services/globalSyncService');
      await syncRequestGlobally(request._id);
      console.log('[SIGN DOCUMENT] ✅ Synchronisation globale terminée');
    } catch (syncError) {
      console.error('[SIGN DOCUMENT] ⚠️  Erreur synchronisation (non bloquante):', syncError);
    }

    // NOTIFICATION: Notifier l'admin, le demandeur et le propriétaire
    try {
      const requester = await User.findById(request.createdBy);
      const adminUsers = await User.find({ role: 'admin', isActive: true });
      const Notification = require('../models/Notification');
      
      // Notifier l'admin et le demandeur
      if (requester && adminUsers.length > 0) {
        await notifyDocumentSigned(request, requester, req.user);
      }
      
      // Si tous les documents sont signés, notifier l'admin qu'il peut créer un paiement
      if (allDocumentsSigned && (request.type === 'location' || request.type === 'achat')) {
        for (const admin of adminUsers) {
          await Notification.create({
            user: admin._id,
            type: 'payment',
            title: '📄 Documents signés - Créer un paiement',
            content: `Tous les documents pour la demande "${request.title}" ont été signés. Vous pouvez maintenant créer une demande de paiement pour le client.`,
            sender: req.user._id,
            request: request._id,
            unit: request.unit?._id || request.unit,
            building: request.building?._id || request.building,
            isRead: false
          });
        }
        console.log('[SIGN DOCUMENT] ✅ Tous les documents sont signés - Notification envoyée aux admins pour créer un paiement');
      }
      
      // Notifier le propriétaire si c'est le demandeur qui a signé
      if (request.unit && (request.type === 'location' || request.type === 'achat') && 
          request.createdBy && request.createdBy.toString() === req.user._id.toString()) {
        const unit = await Unit.findById(request.unit._id || request.unit)
          .populate('proprietaire', 'firstName lastName email');
        
        if (unit && unit.proprietaire) {
          await Notification.create({
            user: unit.proprietaire._id,
            type: 'contract',
            title: 'Document signé par le demandeur',
            content: `Le demandeur ${requester.firstName} ${requester.lastName} a signé un document pour l'unité ${request.unit.unitNumber}. Veuillez consulter votre tableau de bord pour signer votre partie.`,
            sender: req.user._id,
            request: request._id,
            unit: request.unit._id || request.unit,
            building: request.building?._id || request.building,
            isRead: false
          });
          console.log('[SIGN DOCUMENT] Notification envoyée au propriétaire:', unit.proprietaire.email);
        }
      }
      
      // Notifier le demandeur si c'est le propriétaire qui a signé
      if (request.unit && (request.type === 'location' || request.type === 'achat') && 
          request.createdBy && request.createdBy.toString() !== req.user._id.toString() && req.user.role === 'proprietaire') {
        if (requester) {
          await Notification.create({
            user: requester._id,
            type: 'contract',
            title: 'Document signé par le propriétaire',
            content: `Le propriétaire a signé un document pour votre demande d'unité ${request.unit.unitNumber}. Veuillez consulter votre tableau de bord pour signer votre partie.`,
            sender: req.user._id,
            request: request._id,
            unit: request.unit._id || request.unit,
            building: request.building?._id || request.building,
            isRead: false
          });
          console.log('[SIGN DOCUMENT] Notification envoyée au demandeur:', requester.email);
        }
      }
    } catch (error) {
      console.error('[SIGN DOCUMENT] Erreur notification:', error);
    }

    const populatedRequest = await Request.findById(request._id)
      .populate('generatedDocuments.signedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName email');

    res.status(200).json({
      success: true,
      message: 'Document signé avec succès',
      data: populatedRequest
    });
  } catch (error) {
    console.error('[SIGN DOCUMENT] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la signature du document'
    });
  }
};

// @desc    Annuler la signature d'un document (Admin uniquement)
// @route   PUT /api/requests/:id/documents/:docId/unsign
// @access  Private/Admin
exports.unsignDocument = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    const docId = req.params.docId;
    const document = request.generatedDocuments?.find(doc => doc._id.toString() === docId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    if (!document.signed) {
      return res.status(400).json({
        success: false,
        message: 'Ce document n\'est pas signé'
      });
    }

    // Annuler la signature (admin uniquement)
    document.signed = false;
    document.signedAt = undefined;
    document.signedBy = undefined;

    await request.save();

    const populatedRequest = await Request.findById(request._id)
      .populate('generatedDocuments.signedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName email');

    res.status(200).json({
      success: true,
      message: 'Signature du document annulée avec succès',
      data: populatedRequest
    });
  } catch (error) {
    console.error('[UNSIGN DOCUMENT] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'annulation de la signature du document'
    });
  }
};

// @desc    Initier le paiement initial (pour propriétaire dans le cas d'un achat)
// @route   POST /api/requests/:id/payment/initiate
// @access  Private/Proprietaire
exports.initiateInitialPayment = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('unit', 'unitNumber proprietaire')
      .populate('building', 'name');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    if (request.status !== 'accepte') {
      return res.status(400).json({
        success: false,
        message: 'Cette demande doit être acceptée avant de pouvoir effectuer le paiement'
      });
    }

    if (!request.initialPayment || request.initialPayment.status === 'paye') {
      return res.status(400).json({
        success: false,
        message: 'Aucun paiement initial en attente pour cette demande'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire de l'unité (pour les achats)
    if (request.type === 'achat' && request.unit) {
      const unit = await Unit.findById(request.unit._id || request.unit).select('proprietaire');
      if (!unit || !unit.proprietaire || unit.proprietaire.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Seul le propriétaire de l\'unité peut effectuer ce paiement'
        });
      }
    }

    // Pour un achat, le propriétaire paie l'admin
    // Créer un paiement dans la table Payment
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      return res.status(500).json({
        success: false,
        message: 'Aucun administrateur trouvé dans le système'
      });
    }

    // Créer le paiement via le service centralisé (évite les doublons)
    const { recordPayment } = require('../services/paymentSyncService');
    const payment = await recordPayment({
      amount: request.initialPayment.amount,
      type: request.type === 'location' ? 'loyer' : 'achat',
      payer: req.user._id, // Le propriétaire paie
      recipient: adminUser._id, // L'admin reçoit
      unit: request.unit?._id || request.unit,
      building: request.building?._id || request.building,
      dueDate: new Date(),
      paymentMethod: 'autre',
      description: `Paiement initial - ${request.type === 'achat' ? 'Commission de vente' : 'Premier loyer'} - ${request.title}`,
      requestId: request._id // Lier le paiement à la demande
    });

    const populatedPayment = await Payment.findById(payment._id)
      .populate('payer', 'firstName lastName email')
      .populate('recipient', 'firstName lastName email')
      .populate('unit', 'unitNumber')
      .populate('building', 'name');

    res.status(200).json({
      success: true,
      message: 'Paiement créé avec succès',
      data: populatedPayment
    });
  } catch (error) {
    console.error('[INITIATE PAYMENT] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la création du paiement'
    });
  }
};

// @desc    Générer manuellement les documents pour une demande acceptée
// @route   POST /api/requests/:id/generate-documents
// @access  Private/Admin
exports.generateDocuments = async (req, res) => {
  console.log('[GENERATE DOCUMENTS] ⚡ Fonction generateDocuments appelée');
  console.log('[GENERATE DOCUMENTS]   ID reçu:', req.params.id);
  console.log('[GENERATE DOCUMENTS]   Method:', req.method);
  console.log('[GENERATE DOCUMENTS]   URL:', req.originalUrl);
  console.log('[GENERATE DOCUMENTS]   Path:', req.path);
  console.log('[GENERATE DOCUMENTS]   User:', req.user ? req.user.email : 'non authentifié');
  console.log('[GENERATE DOCUMENTS]   Role:', req.user ? req.user.role : 'non authentifié');
  
  try {
    const requestId = String(req.params.id || '').trim().replace(/\s+/g, '');
    
    if (!requestId || requestId.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ID de la demande invalide'
      });
    }

    // Récupérer la demande
    const request = await Request.findById(requestId)
      .populate('unit', 'unitNumber type size bedrooms rentPrice salePrice building proprietaire')
      .populate('building', 'name address')
      .populate('createdBy', 'firstName lastName email phone monthlyIncome numberOfChildren creditScore reputation previousTenant');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    // Vérifier que la demande est acceptée
    if (request.status !== 'accepte') {
      return res.status(400).json({
        success: false,
        message: 'Les documents ne peuvent être générés que pour une demande acceptée'
      });
    }

    // Vérifier si des documents existent déjà
    if (request.generatedDocuments && request.generatedDocuments.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Les documents ont déjà été générés pour cette demande'
      });
    }

    // Vérifier que la demande a une unité et un building
    if (!request.unit || !request.building) {
      return res.status(400).json({
        success: false,
        message: 'La demande doit avoir une unité et un immeuble associés pour générer les documents'
      });
    }

    const unit = request.unit;
    const building = request.building;
    const requester = request.createdBy;

    if (!requester) {
      return res.status(400).json({
        success: false,
        message: 'Le demandeur n\'a pas été trouvé'
      });
    }

    // Récupérer le propriétaire de l'unité
    const Unit = require('../models/Unit');
    const populatedUnit = await Unit.findById(unit._id || unit)
      .populate('proprietaire', 'firstName lastName email phone');

    if (!populatedUnit || !populatedUnit.proprietaire) {
      return res.status(400).json({
        success: false,
        message: 'Le propriétaire de l\'unité n\'a pas été trouvé'
      });
    }

    const owner = populatedUnit.proprietaire;

    // Générer le document selon le type de demande
    console.log('[GENERATE DOCUMENTS] 📄 Génération du document:', {
      type: request.type,
      unit: unit.unitNumber,
      building: building.name,
      requester: `${requester.firstName} ${requester.lastName}`,
      owner: `${owner.firstName} ${owner.lastName}`
    });

    let documentResult;
    if (request.type === 'location') {
      console.log('[GENERATE DOCUMENTS] 📝 Génération du bail...');
      documentResult = await generateLeaseAgreement(request, unit, building, requester, owner);
    } else if (request.type === 'achat') {
      console.log('[GENERATE DOCUMENTS] 📝 Génération du contrat de vente...');
      documentResult = await generateSaleAgreement(request, unit, building, requester, owner);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Type de demande non pris en charge pour la génération de documents'
      });
    }

    if (!documentResult || !documentResult.success) {
      console.error('[GENERATE DOCUMENTS] ❌ Échec de la génération du document:', documentResult);
      return res.status(500).json({
        success: false,
        message: 'La génération du document a échoué'
      });
    }

    // Ajouter le document à la demande
    if (!request.generatedDocuments) {
      request.generatedDocuments = [];
    }
    
    const uploadsDir = path.join(__dirname, '../uploads');
    let relativePath;
    if (path.isAbsolute(documentResult.path)) {
      relativePath = path.relative(uploadsDir, documentResult.path).replace(/\\/g, '/');
    } else {
      relativePath = documentResult.path.replace(/\\/g, '/');
    }
    
    if (!relativePath.startsWith('documents/') && !relativePath.startsWith('/')) {
      relativePath = 'documents/' + relativePath;
    }
    
    const docType = documentResult.type === 'bail' ? 'bail' : 
                   documentResult.type === 'contrat_vente' ? 'contrat_vente' : 'autre';
    
    const newDocument = {
      type: docType,
      filename: documentResult.filename,
      path: relativePath,
      signed: false,
      generatedAt: documentResult.generatedAt || new Date(),
      signedBy: undefined,
      signedAt: undefined
    };

    request.generatedDocuments.push(newDocument);
    await request.save();

    console.log('[GENERATE DOCUMENTS] ✅ Document généré et ajouté avec succès');

    // Envoyer une notification au demandeur
    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        user: requester._id,
        type: 'contract',
        title: 'Documents générés - Prêt à signer',
        content: `Les documents pour votre demande ${request.type === 'location' ? 'de location' : 'd\'achat'} de l'unité ${unit.unitNumber} ont été générés. Veuillez les consulter et les signer dans votre tableau de bord.`,
        sender: req.user._id,
        request: request._id,
        unit: unit._id || unit,
        building: building._id || building
      });
      console.log('[GENERATE DOCUMENTS] ✅ Notification envoyée au demandeur');
    } catch (notifError) {
      console.error('[GENERATE DOCUMENTS] Erreur notification:', notifError);
    }

    // Récupérer la demande mise à jour
    const finalRequest = await Request.findById(requestId)
      .populate('unit', 'unitNumber type size bedrooms rentPrice salePrice building proprietaire')
      .populate('building', 'name address')
      .populate('createdBy', 'firstName lastName email phone')
      .populate('generatedDocuments.signedBy', 'firstName lastName')
      .populate('statusHistory.changedBy', 'firstName lastName');

    return res.status(200).json({
      success: true,
      message: `Document (${docType === 'bail' ? 'bail de location' : 'contrat de vente'}) généré avec succès. Une notification a été envoyée au demandeur pour qu'il consulte et signe les documents.`,
      data: finalRequest
    });
  } catch (error) {
    console.error('[GENERATE DOCUMENTS] Erreur:', error);
    return res.status(500).json({
      success: false,
      message: 'Impossible de générer les documents pour le moment. Veuillez réessayer plus tard.'
    });
  }
};

// @desc    Valider le paiement initial
// @route   PUT /api/requests/:id/payment/validate
// @access  Private/Admin
exports.validateInitialPayment = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    if (request.status !== 'accepte') {
      return res.status(400).json({
        success: false,
        message: 'Cette demande doit être acceptée avant de valider le paiement'
      });
    }

    if (!request.initialPayment) {
      return res.status(400).json({
        success: false,
        message: 'Aucun paiement initial trouvé pour cette demande'
      });
    }

    const { paymentMethod, transactionId } = req.body;

    // Mettre à jour le paiement initial
    request.initialPayment.status = 'paye';
    request.initialPayment.paidAt = new Date();
    if (paymentMethod) {
      request.initialPayment.paymentMethod = paymentMethod;
    }
    if (transactionId) {
      request.initialPayment.transactionId = transactionId;
    }

    // Créer un enregistrement de paiement via le service centralisé
    try {
      const { recordPayment } = require('../services/paymentSyncService');
      const paymentData = {
        amount: request.initialPayment.amount,
        type: request.type === 'location' ? 'loyer' : 'achat',
        payer: request.createdBy,
        recipient: request.unit ? (await Unit.findById(request.unit).select('proprietaire')).proprietaire : null,
        unit: request.unit,
        building: request.building,
        dueDate: new Date(),
        paymentMethod: paymentMethod || 'autre',
        description: `Paiement initial - ${request.type} - ${request.title}`,
        requestId: request._id
      };
      
      const payment = await recordPayment(paymentData);
      
      // Marquer comme payé immédiatement
      const { markPaymentAsPaid } = require('../services/paymentService');
      await markPaymentAsPaid(payment._id, paymentMethod || 'autre', transactionId, null);

      // Synchroniser globalement le paiement ET la demande (car ils sont liés)
      try {
        const { syncPaymentAndRequestGlobally } = require('../services/globalSyncService');
        await syncPaymentAndRequestGlobally(payment._id, request._id);
        console.log('[VALIDATE PAYMENT] ✅ Synchronisation globale paiement + demande terminée');
      } catch (syncError) {
        console.error('[VALIDATE PAYMENT] ⚠️  Erreur synchronisation (non bloquante):', syncError);
      }

      // NOTIFICATION: Notifier le demandeur et l'admin
      try {
        const requester = await User.findById(request.createdBy);
        if (requester) {
          await notifyInitialPaymentReceived(request, requester, req.user);
        }
      } catch (error) {
        console.error('[VALIDATE PAYMENT] Erreur notification:', error);
      }
    } catch (error) {
      console.error('[VALIDATE PAYMENT] Erreur création paiement:', error);
      // Ne pas faire échouer la validation si la création du paiement échoue
    }

    await request.save();

    const populatedRequest = await Request.findById(request._id)
      .populate('initialPayment')
      .populate('createdBy', 'firstName lastName email')
      .populate('unit', 'unitNumber')
      .populate('building', 'name');

    res.status(200).json({
      success: true,
      message: 'Paiement initial validé avec succès',
      data: populatedRequest
    });
  } catch (error) {
    console.error('[VALIDATE PAYMENT] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la validation du paiement'
    });
  }
};

// @desc    Récupérer l'état du paiement d'une demande
// @route   GET /api/requests/:id/payment-status
// @access  Private
exports.getPaymentStatus = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .select('initialPayment status type unit building createdBy');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    // Vérifier les permissions
    if (req.user.role !== 'admin') {
      const userUnits = await Unit.find({
        $or: [
          { proprietaire: req.user._id },
          { locataire: req.user._id }
        ]
      }).select('_id');

      const userId = req.user._id.toString();
      const creatorId = request.createdBy ? request.createdBy.toString() : null;
      
      const isCreator = creatorId === userId;
      
      let hasUnitAccess = false;
      if (request.unit) {
        const requestUnitId = request.unit._id ? request.unit._id.toString() : request.unit.toString();
        hasUnitAccess = userUnits.some(u => u._id.toString() === requestUnitId);
      }

      if (!isCreator && !hasUnitAccess) {
        return res.status(403).json({
          success: false,
          message: 'Accès non autorisé'
        });
      }
    }

    // Récupérer aussi le paiement lié si disponible
    let payment = null;
    if (request.initialPayment) {
      payment = await Payment.findOne({ requestId: request._id })
        .select('status paidDate paymentMethod transactionId amount')
        .sort({ createdAt: -1 })
        .limit(1);
    }

    // Synchroniser le statut si nécessaire
    if (payment && payment.status === 'paye' && request.initialPayment.status !== 'paye') {
      request.initialPayment.status = 'paye';
      request.initialPayment.paidAt = payment.paidDate || new Date();
      if (payment.paymentMethod) {
        request.initialPayment.paymentMethod = payment.paymentMethod;
      }
      if (payment.transactionId) {
        request.initialPayment.transactionId = payment.transactionId;
      }
      await request.save();
    }

    // Recharger la demande complète pour avoir les données à jour
    const updatedRequest = await Request.findById(request._id)
      .select('initialPayment status type unit building createdBy')
      .populate('unit', 'unitNumber')
      .populate('building', 'name');
    
    res.status(200).json({
      success: true,
      data: {
        requestId: updatedRequest._id,
        paymentStatus: updatedRequest.initialPayment?.status || 'en_attente',
        paymentDate: updatedRequest.initialPayment?.paidAt || null,
        paymentAmount: updatedRequest.initialPayment?.amount || null,
        paymentMethod: updatedRequest.initialPayment?.paymentMethod || null,
        transactionId: updatedRequest.initialPayment?.transactionId || null,
        initialPayment: updatedRequest.initialPayment,
        payment: payment ? {
          status: payment.status,
          paidDate: payment.paidDate,
          paymentMethod: payment.paymentMethod,
          transactionId: payment.transactionId,
          amount: payment.amount
        } : null,
        requestStatus: updatedRequest.status,
        requestType: updatedRequest.type
      }
    });
  } catch (error) {
    console.error('[GET PAYMENT STATUS] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération du statut du paiement'
    });
  }
};

// @desc    Attribuer l'unité au demandeur
// @route   PUT /api/requests/:id/assign-unit
// @access  Private/Admin
exports.assignUnit = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    if (request.status !== 'accepte') {
      return res.status(400).json({
        success: false,
        message: 'Cette demande doit être acceptée avant d\'attribuer l\'unité'
      });
    }

    if (!request.unit) {
      return res.status(400).json({
        success: false,
        message: 'Aucune unité spécifiée pour cette demande'
      });
    }

    // Vérifier que le paiement initial a été validé
    if (!request.initialPayment || request.initialPayment.status !== 'paye') {
      return res.status(400).json({
        success: false,
        message: 'Le paiement initial doit être validé avant d\'attribuer l\'unité'
      });
    }

    // Vérifier que les documents sont signés
    const allDocumentsSigned = request.generatedDocuments && 
      request.generatedDocuments.length > 0 &&
      request.generatedDocuments.every(doc => doc.signed);

    if (!allDocumentsSigned) {
      return res.status(400).json({
        success: false,
        message: 'Tous les documents doivent être signés avant d\'attribuer l\'unité'
      });
    }

    const unit = await Unit.findById(request.unit);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unité non trouvée'
      });
    }

    // Attribuer l'unité selon le type de demande
    if (request.type === 'location') {
      // Attribuer comme locataire
      unit.locataire = request.createdBy;
      unit.status = 'loue';
      unit.isAvailable = false;
    } else if (request.type === 'achat') {
      // Attribuer comme propriétaire
      unit.proprietaire = request.createdBy;
      unit.status = 'vendu';
      unit.isAvailable = false;
      // Libérer l'ancien locataire s'il y en a un
      unit.locataire = null;
    }

    await unit.save();
    console.log(`[ASSIGN UNIT] ✅ Unité ${unit.unitNumber} assignée avec succès - Type: ${request.type}, Status: ${unit.status}, isAvailable: ${unit.isAvailable}`);

    // Mettre à jour le statut de la demande
    request.status = 'termine';
    request.completedAt = new Date();

    // Ajouter à l'historique
    if (!request.statusHistory) {
      request.statusHistory = [];
    }
    request.statusHistory.push({
      status: 'termine',
      changedBy: req.user._id,
      changedAt: new Date(),
      comment: 'Unité attribuée et demande finalisée'
    });

    await request.save();

    // NOTIFICATION: Notifier le demandeur
    try {
      const requester = await User.findById(request.createdBy);
      if (requester) {
        await notifyUnitAssigned(request, requester, unit);
      }
    } catch (error) {
      console.error('[ASSIGN UNIT] Erreur notification:', error);
    }

    const populatedRequest = await Request.findById(request._id)
      .populate('unit', 'unitNumber type size bedrooms rentPrice salePrice')
      .populate('building', 'name address')
      .populate('createdBy', 'firstName lastName email')
      .populate('statusHistory.changedBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Unité attribuée avec succès. La demande est maintenant terminée.',
      data: populatedRequest
    });
  } catch (error) {
    console.error('[ASSIGN UNIT] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'attribution de l\'unité'
    });
  }
};

// @desc    Télécharger un document généré
// @route   GET /api/requests/:id/documents/:docId/download
// @access  Private
exports.downloadDocument = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    // Vérifier les permissions (demandeur ou admin)
    if (req.user.role !== 'admin' && request.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas le droit de télécharger ce document'
      });
    }

    const docId = req.params.docId;
    const document = request.generatedDocuments?.find(doc => doc._id.toString() === docId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document non trouvé'
      });
    }

    // Construire le chemin complet du fichier
    // Le document.path peut être relatif (documents/filename.pdf) ou absolu
    let filePath;
    if (path.isAbsolute(document.path)) {
      filePath = document.path;
    } else {
      // Si le chemin commence par "documents/", il est déjà relatif à uploads
      // Sinon, on suppose qu'il est dans uploads/documents
      if (document.path.startsWith('documents/')) {
        filePath = path.join(__dirname, '../uploads', document.path);
      } else {
        filePath = path.join(__dirname, '../uploads/documents', document.path);
      }
    }

    // Normaliser le chemin pour éviter les problèmes avec les séparateurs
    filePath = path.normalize(filePath);

    console.log('[DOWNLOAD DOCUMENT] Chemin du fichier:', filePath);
    console.log('[DOWNLOAD DOCUMENT] document.path original:', document.path);
    console.log('[DOWNLOAD DOCUMENT] document.filename:', document.filename);

    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      console.error('[DOWNLOAD DOCUMENT] Fichier non trouvé au chemin:', filePath);
      
      // Essayer des chemins alternatifs
      const alternativePaths = [
        path.join(__dirname, '../uploads/documents', document.filename),
        path.join(__dirname, '../uploads', document.filename),
        path.join(__dirname, '../uploads', document.path),
        path.join(__dirname, '../uploads/documents', path.basename(document.path))
      ];
      
      let foundPath = null;
      for (const altPath of alternativePaths) {
        const normalizedAltPath = path.normalize(altPath);
        console.log('[DOWNLOAD DOCUMENT] Essai chemin alternatif:', normalizedAltPath);
        if (fs.existsSync(normalizedAltPath)) {
          foundPath = normalizedAltPath;
          console.log('[DOWNLOAD DOCUMENT] Fichier trouvé au chemin alternatif:', foundPath);
          break;
        }
      }
      
      if (!foundPath) {
        return res.status(404).json({
          success: false,
          message: 'Fichier non trouvé sur le serveur',
          debug: {
            originalPath: document.path,
            attemptedPath: filePath,
            filename: document.filename
          }
        });
      }
      
      filePath = foundPath;
    }

    // Envoyer le fichier
    res.download(filePath, document.filename, (err) => {
      if (err) {
        console.error('[DOWNLOAD DOCUMENT] Erreur:', err);
        res.status(500).json({
          success: false,
          message: 'Erreur lors du téléchargement du document'
        });
      }
    });
  } catch (error) {
    console.error('[DOWNLOAD DOCUMENT] Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors du téléchargement du document'
    });
  }
};

