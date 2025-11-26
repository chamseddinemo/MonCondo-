const Payment = require('../models/Payment');
const Unit = require('../models/Unit');
const User = require('../models/User');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');
const { checkPaymentAccess, markPaymentAsPaid } = require('../services/paymentService');
const { recordPayment } = require('../services/paymentSyncService');
const { 
  createStripePaymentIntent, 
  confirmStripePayment,
  generateInteracInstructions,
  generateBankTransferInstructions
} = require('../services/paymentProviders');
const { generateReceiptPDF, generatePaymentReportPDF } = require('../services/pdfService');
const { generatePaymentReportExcel } = require('../services/excelService');
const path = require('path');
const fs = require('fs');

const receiptsDir = path.join(__dirname, '../uploads/receipts');
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

// ==================== GET PAYMENTS ====================
exports.getPayments = async (req, res) => {
  try {
    const { unit, building, type, status, startDate, endDate } = req.query;
    const { getPaymentsUnified, getOverduePayments, getReceivedPayments, getPendingPayments } = require('../services/paymentSyncService');
    
    // Construire les filtres de base
    const filters = {};
    if (unit) filters.unit = unit;
    if (building) filters.building = building;
    if (type) filters.type = type;
    
    // Filtres de date
    if (startDate || endDate) {
      filters.createdAt = {};
      if (startDate) filters.createdAt.$gte = new Date(startDate);
      if (endDate) filters.createdAt.$lte = new Date(endDate);
    }

    let payments = [];
    
    // Utiliser les fonctions centralisées selon le statut
    if (status === 'en_retard') {
      payments = await getOverduePayments(filters);
    } else if (status === 'paye') {
      payments = await getReceivedPayments(filters);
    } else if (status === 'en_attente') {
      payments = await getPendingPayments(filters);
    } else {
      // Tous les paiements - utiliser la fonction unifiée
      payments = await getPaymentsUnified(req.user, filters);
    }

    // Appliquer le tri et la pagination
    const { page, limit, sortField, sortOrder } = getPaginationParams(req.query, {
      allowedSortFields: ['createdAt', 'dueDate', 'amount', 'status'],
      defaultSortField: 'dueDate',
      defaultOrder: 'desc'
    });
    
    // Trier les résultats
    payments.sort((a, b) => {
      const aVal = a[sortField] || a.createdAt;
      const bVal = b[sortField] || b.createdAt;
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    const total = payments.length;
    const skip = (page - 1) * limit;
    const paginatedPayments = payments.slice(skip, skip + limit);

    const pagination = buildPaginationMeta({ page, limit, total });

    res.status(200).json({
      success: true,
      count: paginatedPayments.length,
      ...pagination,
      data: paginatedPayments
    });
  } catch (error) {
    console.error('[PAYMENT] ❌ Erreur getPayments:', error);
    console.error('[PAYMENT] Stack:', error.stack);
    console.error('[PAYMENT] User:', req.user?._id, req.user?.role);
    console.error('[PAYMENT] Query:', req.query);
    
    // Vérifier si c'est une erreur de connexion MongoDB
    if (error.name === 'MongoNetworkError' || error.message?.includes('MongoServerError') || error.message?.includes('connection')) {
      return res.status(503).json({
        success: false,
        message: 'Erreur de connexion à la base de données. Le serveur est en cours d\'exécution mais n\'a pas pu traiter votre demande. Veuillez vérifier la connexion MongoDB.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur serveur. Le serveur est en cours d\'exécution mais n\'a pas pu traiter votre demande.',
      ...(process.env.NODE_ENV === 'development' && { 
        error: error.name,
        stack: error.stack
      })
    });
  }
};

// ==================== GET PAYMENT BY ID ====================
exports.getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('unit', 'unitNumber floor')
      .populate('building', 'name address')
      .populate('payer', 'firstName lastName email phone')
      .populate('recipient', 'firstName lastName email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    // Vérifier les permissions
    // Note: checkPaymentAccess permet maintenant aux propriétaires d'accéder
    // aux paiements où ils sont payeurs, bénéficiaires, ou propriétaires de l'unité
    if (!checkPaymentAccess(payment, req.user)) {
      console.error('[PROCESS_PAYMENT] Accès refusé:', {
        userId: req.user?._id,
        userRole: req.user?.role,
        paymentId: payment._id,
        payerId: payment.payer?._id || payment.payer,
        recipientId: payment.recipient?._id || payment.recipient
      });
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce paiement'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('[PAYMENT] Erreur getPayment:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== CREATE PAYMENT ====================
exports.createPayment = async (req, res) => {
  try {
    console.log('[CREATE_PAYMENT] Début de createPayment');
    console.log('[CREATE_PAYMENT] User:', req.user?.email, 'Role:', req.user?.role);
    console.log('[CREATE_PAYMENT] Body:', JSON.stringify(req.body, null, 2));
    
    // Vérifier que l'utilisateur est authentifié et a un rôle autorisé
    // Rôles autorisés: admin, proprietaire, locataire
    console.log('[CREATE_PAYMENT] ========== Création de paiement ==========');
    console.log('[CREATE_PAYMENT] User role:', req.user?.role);
    console.log('[CREATE_PAYMENT] User email:', req.user?.email);
    console.log('[CREATE_PAYMENT] User ID:', req.user?._id);
    
    if (!req.user || !req.user._id) {
      console.error('[CREATE_PAYMENT] ❌ ERREUR: Utilisateur non authentifié!');
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non authentifié'
      });
    }
    
    // Vérifier que l'utilisateur a un rôle autorisé
    // Cette vérification est redondante car le middleware authorizePayment le fait déjà
    // Mais on la garde pour sécurité supplémentaire
    const allowedRoles = ['admin', 'proprietaire', 'locataire'];
    if (!allowedRoles.includes(req.user.role)) {
      console.error('[CREATE_PAYMENT] ❌❌❌ RÔLE NON AUTORISÉ ❌❌❌');
      console.error('[CREATE_PAYMENT] Rôle utilisateur:', req.user.role);
      console.error('[CREATE_PAYMENT] Rôles autorisés:', allowedRoles);
      return res.status(403).json({
        success: false,
        message: `Accès refusé. Rôles autorisés: ${allowedRoles.join(', ')}. Votre rôle: ${req.user.role}`,
        code: 'INVALID_ROLE',
        allowedRoles: allowedRoles,
        userRole: req.user.role
      });
    }
    
    console.log('[CREATE_PAYMENT] ✅ Utilisateur authentifié avec rôle autorisé:', req.user.role);
    console.log('[CREATE_PAYMENT] =========================================');

    // Récupérer les données du body
    // Supporte: amount, method, unit (ou unitId), building, payerId, etc.
    const { unit, unitId, building, payer, payerId, recipient, type, amount, description, dueDate, method, requestId } = req.body;
    
    // Utiliser unitId si fourni, sinon utiliser unit
    const finalUnit = unitId || unit;
    
    // Utiliser payerId si fourni, sinon utiliser payer
    const finalPayerFromBody = payerId || payer;

    // Vérifier que l'unité est fournie
    if (!finalUnit) {
      console.error('[CREATE_PAYMENT] ❌ Unité non fournie dans le body');
      return res.status(400).json({
        success: false,
        message: 'L\'unité est requise (unit ou unitId)'
      });
    }

    // Vérifier que l'unité existe et peupler les relations nécessaires
    const unitDoc = await Unit.findById(finalUnit)
      .populate('proprietaire', 'firstName lastName email role')
      .populate('locataire', 'firstName lastName email role');
    if (!unitDoc) {
      console.error('[CREATE_PAYMENT] ❌ Unité non trouvée:', finalUnit);
      return res.status(404).json({
        success: false,
        message: 'Unité non trouvée'
      });
    }

    console.log('[CREATE_PAYMENT] Unité trouvée:', {
      unitId: unitDoc._id,
      unitNumber: unitDoc.unitNumber,
      proprietaire: unitDoc.proprietaire?._id || unitDoc.proprietaire
    });

    // Déterminer le payeur si non fourni
    // Si c'est un propriétaire ou locataire qui crée le paiement, il est le payeur par défaut
    let finalPayer = finalPayerFromBody;
    if (!finalPayer && (req.user.role === 'proprietaire' || req.user.role === 'locataire')) {
      finalPayer = req.user._id;
      console.log('[CREATE_PAYMENT] Payeur défini automatiquement (' + req.user.role + '):', finalPayer);
    }

    // VÉRIFICATION DES RÈGLES MÉTIER SELON LE RÔLE
    console.log('[CREATE_PAYMENT] ========== Vérification des règles métier ==========');
    console.log('[CREATE_PAYMENT] Rôle utilisateur:', req.user.role);
    console.log('[CREATE_PAYMENT] ID utilisateur:', req.user._id);
    console.log('[CREATE_PAYMENT] ID unité:', unitDoc._id);
    console.log('[CREATE_PAYMENT] Propriétaire de l\'unité:', unitDoc.proprietaire?._id || unitDoc.proprietaire);

    // ADMIN : Accès complet, peut créer tous les paiements
    if (req.user.role === 'admin') {
      console.log('[CREATE_PAYMENT] ✅ Admin - Accès complet autorisé');
      // Admin peut créer des paiements pour n'importe qui
      if (!finalPayer) {
        finalPayer = req.user._id; // Par défaut, admin est le payeur
      }
    }
    // PROPRIÉTAIRE : Peut payer ou encaisser pour ses unités
    else if (req.user.role === 'proprietaire') {
      const unitProprietaireId = (unitDoc.proprietaire?._id || unitDoc.proprietaire)?.toString();
      const userId = req.user._id.toString();
      
      console.log('[CREATE_PAYMENT] Vérification propriétaire:');
      console.log('[CREATE_PAYMENT]   - Propriétaire unité:', unitProprietaireId);
      console.log('[CREATE_PAYMENT]   - Utilisateur:', userId);
      console.log('[CREATE_PAYMENT]   - Match:', unitProprietaireId === userId);

      // Vérifier que l'utilisateur est le propriétaire de l'unité
      if (unitProprietaireId !== userId) {
        console.warn('[CREATE_PAYMENT] ❌ PROPRIÉTAIRE: L\'utilisateur n\'est pas propriétaire de cette unité');
        console.warn('[CREATE_PAYMENT]   - Unité appartient à:', unitProprietaireId);
        console.warn('[CREATE_PAYMENT]   - Utilisateur:', userId);
        return res.status(403).json({
          success: false,
          message: 'Accès refusé. Vous n\'êtes pas propriétaire de cette unité.',
          code: 'NOT_UNIT_OWNER',
          unitOwner: unitProprietaireId,
          userId: userId
        });
      }

      // Propriétaire peut créer des paiements pour lui-même
      if (finalPayer) {
        const payerId = finalPayer.toString();
        if (payerId !== userId) {
          console.warn('[CREATE_PAYMENT] ❌ PROPRIÉTAIRE: Tentative de créer un paiement pour quelqu\'un d\'autre');
          return res.status(403).json({
            success: false,
            message: 'Vous ne pouvez créer des paiements que pour vous-même'
          });
        }
      } else {
        finalPayer = req.user._id;
      }

      console.log('[CREATE_PAYMENT] ✅ PROPRIÉTAIRE: Accès autorisé pour son unité');
    }
    // LOCATAIRE : Peut seulement payer pour son propre logement
    else if (req.user.role === 'locataire') {
      // Vérifier que le locataire est assigné à cette unité
      // On vérifie si l'unité a un locataire assigné qui correspond à l'utilisateur
      const unitLocataireId = unitDoc.locataire?.toString();
      const userId = req.user._id.toString();

      console.log('[CREATE_PAYMENT] Vérification locataire:');
      console.log('[CREATE_PAYMENT]   - Locataire unité:', unitLocataireId);
      console.log('[CREATE_PAYMENT]   - Utilisateur:', userId);
      console.log('[CREATE_PAYMENT]   - Match:', unitLocataireId === userId);

      // Si l'unité a un locataire assigné, vérifier que c'est l'utilisateur
      if (unitLocataireId && unitLocataireId !== userId) {
        console.warn('[CREATE_PAYMENT] ❌ LOCATAIRE: L\'utilisateur n\'est pas locataire de cette unité');
        return res.status(403).json({
          success: false,
          message: 'Accès refusé. Vous n\'êtes pas locataire de cette unité.',
          code: 'NOT_UNIT_TENANT',
          unitTenant: unitLocataireId,
          userId: userId
        });
      }

      // Locataire peut seulement créer des paiements pour lui-même
      if (finalPayer) {
        const payerId = finalPayer.toString();
        if (payerId !== userId) {
          console.warn('[CREATE_PAYMENT] ❌ LOCATAIRE: Tentative de créer un paiement pour quelqu\'un d\'autre');
          return res.status(403).json({
            success: false,
            message: 'Vous ne pouvez créer des paiements que pour vous-même'
          });
        }
      } else {
        finalPayer = req.user._id;
      }

      console.log('[CREATE_PAYMENT] ✅ LOCATAIRE: Accès autorisé pour son unité');
    }
    // AUTRE RÔLE : Non autorisé
    else {
      console.error('[CREATE_PAYMENT] ❌ Rôle non autorisé:', req.user.role);
      return res.status(403).json({
        success: false,
        message: `Accès refusé. Rôle requis: admin, proprietaire ou locataire. Votre rôle: ${req.user.role}`,
        code: 'INVALID_ROLE',
        userRole: req.user.role
      });
    }

    console.log('[CREATE_PAYMENT] =========================================');

    // Déterminer le bénéficiaire si non fourni
    let finalRecipient = recipient;
    let finalRecipientEmail = null;
    
    // Si le payeur est un propriétaire et le type est 'achat', le bénéficiaire est l'admin
    if (!finalRecipient && req.user.role === 'proprietaire' && type === 'achat') {
      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        finalRecipient = adminUser._id;
        finalRecipientEmail = adminUser.email;
        console.log('[CREATE_PAYMENT] Bénéficiaire défini (admin) pour achat:', finalRecipient);
      }
    }
    
    // Sinon, le bénéficiaire est généralement le propriétaire de l'unité
    if (!finalRecipient) {
      finalRecipient = unitDoc.proprietaire;
      console.log('[CREATE_PAYMENT] Bénéficiaire défini (propriétaire de l\'unité):', finalRecipient);
    }
    
    // Si toujours pas de bénéficiaire, utiliser l'admin du building depuis une unité
    if (!finalRecipient && building) {
      const unitWithBuilding = await Unit.findOne({ building: building })
        .populate('building', 'admin')
        .populate('building.admin', '_id');
      if (unitWithBuilding && unitWithBuilding.building && unitWithBuilding.building.admin) {
        finalRecipient = unitWithBuilding.building.admin._id || unitWithBuilding.building.admin;
      }
    }

    // Si toujours pas de bénéficiaire, utiliser l'admin par défaut
    if (!finalRecipient) {
      const adminUser = await User.findOne({ role: 'admin' });
      if (adminUser) {
        finalRecipient = adminUser._id;
        finalRecipientEmail = adminUser.email;
      }
    }

    // Vérifier que le bénéficiaire est défini
    if (!finalRecipient) {
      return res.status(400).json({
        success: false,
        message: 'Le bénéficiaire est requis. Assurez-vous que l\'unité a un propriétaire ou que le building a un admin.'
      });
    }

    // Récupérer l'email du bénéficiaire
    if (!finalRecipientEmail) {
      const recipientUser = await User.findById(finalRecipient);
      if (recipientUser) {
        finalRecipientEmail = recipientUser.email;
      }
    }

    // Si toujours pas d'email, utiliser l'email du payeur comme fallback
    if (!finalRecipientEmail && payer) {
      const payerUser = await User.findById(payer);
      if (payerUser && payerUser.email) {
        finalRecipientEmail = payerUser.email;
        console.log('[PAYMENT] Utilisation de l\'email du payeur comme recipientEmail');
      }
    }

    const paymentData = {
      unit: finalUnit,
      building: building || unitDoc.building,
      payer: finalPayer || finalPayerFromBody, // Utiliser finalPayer si défini
      recipient: finalRecipient,
      recipientEmail: finalRecipientEmail, // Toujours définir l'email du bénéficiaire
      type: type || 'autre', // Valeur par défaut si non fourni
      amount,
      description,
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours par défaut
      status: 'en_attente'
    };
    
    // Ajouter method et requestId si fournis (pour référence future)
    if (method) {
      paymentData.paymentMethod = method;
    }
    if (requestId) {
      paymentData.requestId = requestId;
    }
    
    // Utiliser recordPayment pour éviter les doublons
    const payment = await recordPayment(paymentData);
    
    console.log('[CREATE_PAYMENT] ✅✅✅ PAIEMENT CRÉÉ AVEC SUCCÈS ✅✅✅');
    console.log('[CREATE_PAYMENT] Détails du paiement:', {
      paymentId: payment._id,
      payer: payment.payer,
      recipient: payment.recipient,
      type: payment.type,
      amount: payment.amount,
      method: payment.paymentMethod,
      status: payment.status,
      requestId: payment.requestId
    });
    console.log('[CREATE_PAYMENT] =========================================');

    const populatedPayment = await Payment.findById(payment._id)
      .populate('unit', 'unitNumber floor type size')
      .populate('building', 'name address')
      .populate('payer', 'firstName lastName email role')
      .populate('recipient', 'firstName lastName email role')
      .populate('requestId', 'title type status');

    // Envoyer une notification au client (payeur) si le paiement a été créé par un admin
    try {
      const Notification = require('../models/Notification');
      const payerUser = await User.findById(finalPayer || finalPayerFromBody);
      
      if (payerUser && req.user.role === 'admin') {
        // Si le paiement est lié à une demande, personnaliser le message
        let notificationTitle = '💳 Nouvelle demande de paiement';
        let notificationContent = `Une demande de paiement de ${amount} $CAD a été créée pour vous. Veuillez consulter votre tableau de bord pour effectuer le paiement.`;
        
        if (requestId) {
          const Request = require('../models/Request');
          const request = await Request.findById(requestId)
            .populate('unit', 'unitNumber');
          
          if (request) {
            const typeLabel = request.type === 'location' ? 'location' : request.type === 'achat' ? 'achat' : 'demande';
            notificationTitle = `💳 Demande de paiement - ${typeLabel === 'location' ? 'Location' : 'Achat'}`;
            notificationContent = `Une demande de paiement de ${amount} $CAD a été créée pour votre demande de ${typeLabel}`;
            if (request.unit) {
              notificationContent += ` - Unité ${request.unit.unitNumber}`;
            }
            notificationContent += `. Le statut est maintenant "En attente de paiement par le client". Veuillez consulter votre tableau de bord ou la page de la demande pour effectuer le paiement.`;
          }
        }
        
        await Notification.create({
          user: payerUser._id,
          type: 'payment',
          title: notificationTitle,
          content: notificationContent,
          sender: req.user._id,
          payment: payment._id,
          unit: populatedPayment.unit?._id || populatedPayment.unit,
          building: populatedPayment.building?._id || populatedPayment.building,
          request: requestId || undefined,
          isRead: false
        });
        
        console.log('[CREATE_PAYMENT] ✅ Notification envoyée au client:', payerUser.email);
      }
      
      // Notifier l'admin si le paiement a été créé par un propriétaire ou locataire
      if (req.user.role !== 'admin') {
        const adminUsers = await User.find({ role: 'admin', isActive: true });
        for (const admin of adminUsers) {
          await Notification.create({
            user: admin._id,
            type: 'payment',
            title: '💳 Nouveau paiement créé',
            content: `Un paiement de ${amount} $CAD a été créé par ${req.user.firstName} ${req.user.lastName}.`,
            sender: req.user._id,
            payment: payment._id,
            unit: populatedPayment.unit?._id || populatedPayment.unit,
            building: populatedPayment.building?._id || populatedPayment.building,
            isRead: false
          });
        }
        console.log('[CREATE_PAYMENT] ✅ Notification envoyée aux admins');
      }
    } catch (error) {
      console.error('[CREATE_PAYMENT] Erreur notification (non bloquante):', error);
      // Ne pas faire échouer la création du paiement si la notification échoue
    }

    // Synchroniser toutes les vues après la création du paiement via le service global
    // Si le paiement est lié à une demande, synchroniser aussi la demande
    try {
      const { syncPaymentGlobally, syncPaymentAndRequestGlobally } = require('../services/globalSyncService');
      if (requestId) {
        // Synchroniser à la fois le paiement et la demande
        await syncPaymentAndRequestGlobally(payment._id, requestId);
        console.log('[CREATE_PAYMENT] ✅ Synchronisation globale paiement + demande terminée');
        
        // Émettre un événement Socket.io pour la création de paiement lié à une demande
        // Récupérer io depuis app.locals ou global
        const io = req.app.get('io') || (typeof global !== 'undefined' ? global.io : null);
        if (io) {
          // Préparer les données de l'événement avec toutes les informations nécessaires
          // Normaliser le statut pour s'assurer qu'il est 'en_attente'
          let normalizedStatus = payment.status || 'en_attente'
          if (normalizedStatus === 'pending' || normalizedStatus === 'payment_pending' || normalizedStatus === 'pending_payment' || normalizedStatus === 'awaiting_payment') {
            normalizedStatus = 'en_attente'
          }
          
          const eventData = {
            paymentId: payment._id,
            requestId: requestId,
            amount: payment.amount,
            status: normalizedStatus, // Utiliser le statut normalisé
            description: payment.description,
            dueDate: payment.dueDate,
            type: payment.type,
            createdAt: payment.createdAt || new Date().toISOString(),
            timestamp: new Date().toISOString()
          };
          
          // Envoyer à tous les clients connectés
          io.emit('paymentCreated', eventData);
          
          // Envoyer aussi spécifiquement au demandeur si disponible
          // Utiliser populatedPayment qui a le payer peuplé
          const payerId = populatedPayment?.payer?._id || populatedPayment?.payer || payment.payer?._id || payment.payer
          if (payerId) {
            const payerIdString = payerId.toString()
            console.log('[CREATE_PAYMENT] 📡 Envoi spécifique au payeur:', payerIdString)
            io.to(`user_${payerIdString}`).emit('paymentCreated', {
              ...eventData,
              forUser: payerIdString
            });
          } else {
            console.warn('[CREATE_PAYMENT] ⚠️  Payeur non trouvé pour l\'envoi spécifique')
          }
          
          console.log('[CREATE_PAYMENT] 📡 Événement Socket.io paymentCreated émis pour requestId:', requestId, 'avec données:', eventData);
        } else {
          console.warn('[CREATE_PAYMENT] ⚠️  Socket.io non disponible - événement non émis');
        }
      } else {
        // Synchroniser uniquement le paiement
        await syncPaymentGlobally(payment._id);
        console.log('[CREATE_PAYMENT] ✅ Synchronisation globale paiement terminée');
      }
    } catch (syncError) {
      console.error('[CREATE_PAYMENT] ⚠️  Erreur synchronisation (non bloquante):', syncError);
    }

    console.log('[CREATE_PAYMENT] ✅✅✅ PAIEMENT CRÉÉ ET RETOURNÉ ✅✅✅');
    console.log('[CREATE_PAYMENT] Réponse 201 avec données complètes');

    res.status(201).json({
      success: true,
      message: 'Paiement créé avec succès.',
      data: populatedPayment
    });
  } catch (error) {
    console.error('[PAYMENT] Erreur createPayment:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== UPDATE PAYMENT ====================
exports.updatePayment = async (req, res) => {
  try {
    // Seuls les admins peuvent modifier des paiements
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Seuls les administrateurs peuvent modifier des paiements'
      });
    }

    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('unit', 'unitNumber floor')
      .populate('building', 'name address')
      .populate('payer', 'firstName lastName email')
      .populate('recipient', 'firstName lastName email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    // Synchroniser toutes les vues après la modification via le service global
    try {
      const { syncPaymentGlobally } = require('../services/globalSyncService');
      await syncPaymentGlobally(payment._id);
      console.log('[UPDATE PAYMENT] ✅ Synchronisation globale terminée');
    } catch (syncError) {
      console.error('[UPDATE PAYMENT] ⚠️  Erreur synchronisation (non bloquante):', syncError);
      // Fallback vers la synchronisation locale si la globale échoue
      try {
        const { syncAllPaymentViews } = require('../services/paymentSyncService');
        await syncAllPaymentViews(payment._id);
      } catch (fallbackError) {
        console.error('[UPDATE PAYMENT] ⚠️  Erreur synchronisation fallback:', fallbackError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Paiement mis à jour avec succès',
      data: payment
    });
  } catch (error) {
    console.error('[PAYMENT] Erreur updatePayment:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== DELETE PAYMENT ====================
exports.deletePayment = async (req, res) => {
  try {
    // Seuls les admins peuvent supprimer des paiements
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Seuls les administrateurs peuvent supprimer des paiements'
      });
    }

    // Récupérer le paiement avant suppression pour synchroniser
    const payment = await Payment.findById(req.params.id)
      .populate('unit', 'unitNumber')
      .populate('building', 'name');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    // Supprimer le paiement
    await Payment.findByIdAndDelete(req.params.id);

    // Synchroniser globalement après suppression
    try {
      const { recalculateAllStats } = require('../services/globalSyncService');
      // Recalculer les stats globales après suppression
      await recalculateAllStats();
      console.log('[DELETE PAYMENT] ✅ Synchronisation globale terminée');
    } catch (syncError) {
      console.error('[DELETE PAYMENT] ⚠️  Erreur synchronisation (non bloquante):', syncError);
      // Fallback vers la synchronisation locale
      try {
        if (payment.unit) {
          const { updateUnit } = require('../services/paymentSyncService');
          const minimalPayment = {
            unit: payment.unit,
            building: payment.building,
            status: 'annule'
          };
          await updateUnit(minimalPayment);
        }
        if (payment.building) {
          const { updateBuildingStats } = require('../services/paymentSyncService');
          await updateBuildingStats(payment.building._id || payment.building);
        }
      } catch (fallbackError) {
        console.error('[DELETE PAYMENT] ⚠️  Erreur synchronisation fallback:', fallbackError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Paiement supprimé avec succès'
    });
  } catch (error) {
    console.error('[PAYMENT] Erreur deletePayment:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== PROCESS PAYMENT ====================
exports.processPayment = async (req, res) => {
  try {
    const { paymentMethod, transactionId, notes } = req.body;

    console.log('[PAYMENT] Traitement paiement manuel:', {
      paymentId: req.params.id,
      paymentMethod,
      transactionId
    });

    let payment = await Payment.findById(req.params.id)
      .populate('unit', 'unitNumber proprietaire')
      .populate('payer', 'firstName lastName email')
      .populate('building', 'name')
      .populate('recipient', 'firstName lastName email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    // Vérifier les permissions
    // Note: checkPaymentAccess permet maintenant aux propriétaires d'accéder
    // aux paiements où ils sont payeurs, bénéficiaires, ou propriétaires de l'unité
    if (!checkPaymentAccess(payment, req.user)) {
      console.error('[PROCESS_PAYMENT] Accès refusé:', {
        userId: req.user?._id,
        userRole: req.user?.role,
        paymentId: payment._id,
        payerId: payment.payer?._id || payment.payer,
        recipientId: payment.recipient?._id || payment.recipient
      });
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce paiement'
      });
    }

    // Vérifier que le paiement n'est pas déjà payé
    if (payment.status === 'paye') {
      return res.status(400).json({
        success: false,
        message: 'Ce paiement est déjà payé'
      });
    }

    // S'assurer que le recipient est défini AVANT le traitement
    let recipientId = null;
    let recipientEmail = null;
    
    // Vérifier si recipient existe
    if (payment.recipient) {
      recipientId = payment.recipient._id || payment.recipient;
      recipientEmail = payment.recipient.email || null;
    }
    
    // Si pas de recipient, le récupérer
    if (!recipientId) {
      console.log('[PAYMENT] Recipient manquant, tentative de récupération...');
      
      const User = require('../models/User');
      
      // Recharger le paiement avec toutes les relations
      payment = await Payment.findById(req.params.id)
        .populate('unit', 'unitNumber proprietaire')
        .populate('building', 'name admin')
        .populate('payer', 'firstName lastName email phone');
      
      // Essayer de récupérer le propriétaire de l'unité
      if (payment.unit && payment.unit.proprietaire) {
        recipientId = payment.unit.proprietaire._id || payment.unit.proprietaire;
        const proprietaireUser = await User.findById(recipientId);
        if (proprietaireUser) {
          recipientEmail = proprietaireUser.email;
          console.log('[PAYMENT] Recipient défini depuis l\'unité:', recipientId, 'Email:', recipientEmail);
        } else {
          console.log('[PAYMENT] Propriétaire trouvé mais email non disponible');
        }
      } else if (payment.building) {
        // Essayer de récupérer l'admin du building
        if (payment.building.admin) {
          recipientId = payment.building.admin._id || payment.building.admin;
          const adminUser = await User.findById(recipientId);
          if (adminUser) {
            recipientEmail = adminUser.email;
            console.log('[PAYMENT] Recipient défini depuis le building:', recipientId, 'Email:', recipientEmail);
          }
        } else {
          // Récupérer le building depuis une unité
          const unitWithBuilding = await Unit.findOne({ building: payment.building._id || payment.building })
            .populate('building', 'admin')
            .populate('building.admin', '_id email');
          if (unitWithBuilding && unitWithBuilding.building && unitWithBuilding.building.admin) {
            recipientId = unitWithBuilding.building.admin._id || unitWithBuilding.building.admin;
            recipientEmail = unitWithBuilding.building.admin.email;
            console.log('[PAYMENT] Recipient défini depuis le building (via unité):', recipientId, 'Email:', recipientEmail);
          }
        }
      }
      
      // Si toujours pas de recipient, utiliser l'admin par défaut
      if (!recipientId) {
        const adminUser = await User.findOne({ role: 'admin' });
        if (adminUser) {
          recipientId = adminUser._id;
          recipientEmail = adminUser.email;
          console.log('[PAYMENT] Recipient défini comme admin par défaut:', recipientId, 'Email:', recipientEmail);
        } else if (payment.payer) {
          // Dernier recours : utiliser l'email du payeur
          recipientId = payment.payer._id || payment.payer;
          recipientEmail = payment.payer.email;
          console.log('[PAYMENT] Recipient défini comme payeur (fallback):', recipientId, 'Email:', recipientEmail);
        } else {
          return res.status(400).json({
            success: false,
            message: 'Le bénéficiaire est requis. Veuillez contacter l\'administration.'
          });
        }
      }
      
      // S'assurer qu'on a au minimum un email
      if (!recipientEmail && payment.payer && payment.payer.email) {
        recipientEmail = payment.payer.email;
        console.log('[PAYMENT] Utilisation de l\'email du payeur comme fallback');
      }
      
      // Sauvegarder le recipient avec updateOne pour éviter la validation Mongoose
      const updateData = {
        recipient: recipientId
      };
      if (recipientEmail) {
        updateData.recipientEmail = recipientEmail;
      }
      
      await Payment.updateOne(
        { _id: req.params.id },
        { $set: updateData }
      );
      console.log('[PAYMENT] Recipient sauvegardé avec succès:', recipientId, 'Email:', recipientEmail);
      
      // Recharger le paiement avec le recipient peuplé
      payment = await Payment.findById(req.params.id)
        .populate('unit', 'unitNumber proprietaire')
        .populate('building', 'name')
        .populate('payer', 'firstName lastName email phone')
        .populate('recipient', 'firstName lastName email phone');
    } else {
      // S'assurer que recipientEmail est défini même si recipient existe
      if (!recipientEmail && payment.recipient && payment.recipient.email) {
        recipientEmail = payment.recipient.email;
      } else if (!recipientEmail && payment.recipientEmail) {
        recipientEmail = payment.recipientEmail;
      } else if (!recipientEmail && payment.payer && payment.payer.email) {
        recipientEmail = payment.payer.email;
        // Mettre à jour le recipientEmail dans la base
        await Payment.updateOne(
          { _id: req.params.id },
          { $set: { recipientEmail: recipientEmail } }
        );
      }
    }

    console.log('[PAYMENT] Paiement prêt pour traitement:', {
      paymentId: payment._id,
      recipient: payment.recipient,
      payer: payment.payer
    });

    // Marquer comme payé
    const updatedPayment = await markPaymentAsPaid(
      payment._id,
      paymentMethod,
      transactionId,
      notes
    );

    console.log('[PAYMENT] Paiement traité avec succès:', updatedPayment._id);

    // Synchroniser globalement le paiement et la demande si liée
    try {
      const { syncPaymentAndRequestGlobally, syncPaymentGlobally } = require('../services/globalSyncService');
      if (updatedPayment.requestId) {
        await syncPaymentAndRequestGlobally(updatedPayment._id, updatedPayment.requestId);
        console.log('[PROCESS_PAYMENT] ✅ Synchronisation globale paiement + demande terminée');
        
        // Émettre un événement Socket.io spécifique pour le paiement payé
        const io = req.app.get('io') || (typeof global !== 'undefined' ? global.io : null);
        if (io) {
          io.emit('paymentPaid', {
            paymentId: updatedPayment._id,
            requestId: updatedPayment.requestId,
            status: 'paye',
            amount: updatedPayment.amount,
            paymentMethod: updatedPayment.paymentMethod,
            transactionId: updatedPayment.transactionId,
            paidDate: updatedPayment.paidDate,
            timestamp: new Date().toISOString()
          });
          
          // Émettre aussi un événement de synchronisation globale
          io.emit('globalSync', {
            paymentId: updatedPayment._id,
            requestId: updatedPayment.requestId,
            type: 'payment',
            action: 'paid',
            timestamp: new Date().toISOString()
          });
          
          console.log('[PROCESS_PAYMENT] 📡 Événements Socket.io émis pour paiement payé');
        }
      } else {
        await syncPaymentGlobally(updatedPayment._id);
        console.log('[PROCESS_PAYMENT] ✅ Synchronisation globale paiement terminée');
      }
    } catch (syncError) {
      console.error('[PROCESS_PAYMENT] ⚠️  Erreur synchronisation (non bloquante):', syncError);
    }

    res.status(200).json({
      success: true,
      message: 'Paiement traité avec succès',
      data: updatedPayment
    });
  } catch (error) {
    console.error('[PAYMENT] Erreur processPayment:', error);
    console.error('[PAYMENT] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors du traitement du paiement'
    });
  }
};

// ==================== CREATE STRIPE PAYMENT INTENT ====================
exports.createStripeIntent = async (req, res) => {
  try {
    console.log('[STRIPE] Création PaymentIntent pour paiement:', req.params.id);
    
    const payment = await Payment.findById(req.params.id)
      .populate('payer', 'firstName lastName email')
      .populate('unit', 'unitNumber')
      .populate('building', 'name');

    if (!payment) {
      console.error('[STRIPE] Paiement non trouvé:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    // Vérifier les permissions
    if (!checkPaymentAccess(payment, req.user)) {
      console.error('[STRIPE] Accès non autorisé pour utilisateur:', req.user?._id);
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce paiement'
      });
    }

    // Vérifier que le paiement n'est pas déjà payé
    if (payment.status === 'paye') {
      return res.status(400).json({
        success: false,
        message: 'Ce paiement est déjà payé'
      });
    }

    // Valider les champs requis
    if (!payment.amount || payment.amount <= 0) {
      console.error('[STRIPE] Montant invalide:', payment.amount);
      return res.status(400).json({
        success: false,
        message: 'Le montant du paiement est invalide'
      });
    }

    if (!payment.payer) {
      console.error('[STRIPE] Payeur manquant pour paiement:', payment._id);
      return res.status(400).json({
        success: false,
        message: 'Le payeur est requis pour ce paiement'
      });
    }

    // Préparer les métadonnées
    const metadata = {
      paymentId: payment._id.toString(),
      payerId: payment.payer._id?.toString() || payment.payer.toString(),
      payerEmail: payment.payer.email || '',
      payerName: `${payment.payer.firstName || ''} ${payment.payer.lastName || ''}`.trim(),
      type: payment.type || 'loyer',
      application: 'MonCondo+'
    };

    // Ajouter le numéro d'unité si disponible
    if (payment.unit && payment.unit.unitNumber) {
      metadata.unitNumber = payment.unit.unitNumber;
    }

    // Ajouter le nom du building si disponible
    if (payment.building && payment.building.name) {
      metadata.buildingName = payment.building.name;
    }

    console.log('[STRIPE] Création PaymentIntent avec:', {
      amount: payment.amount,
      currency: 'cad',
      metadata
    });

    const result = await createStripePaymentIntent(payment.amount, 'cad', metadata);

    if (!result.success) {
      console.error('[STRIPE] Erreur création PaymentIntent:', result.error);
      console.error('[STRIPE] Code d\'erreur retourné:', result.code);
      
      // Utiliser le code d'erreur retourné par le service si disponible
      // Sinon, déterminer le code de statut approprié en analysant le message
      const isConfigError = result.code === 'STRIPE_NOT_CONFIGURED' || 
                           (result.error && (
                             result.error.includes('configuré') || 
                             result.error.includes('STRIPE_SECRET_KEY') ||
                             result.error.includes('non défini') ||
                             result.error.includes('non initialisé') ||
                             result.error.includes('Stripe n\'est pas configuré') ||
                             result.error.includes('Définissez STRIPE_SECRET_KEY')
                           ));
      
      // Utiliser 503 (Service Unavailable) pour Stripe non configuré, 400 pour autres erreurs
      const statusCode = isConfigError ? 503 : 400;
      
      console.log('[STRIPE] Analyse erreur:', {
        errorMessage: result.error,
        errorCode: result.code,
        isConfigError: isConfigError,
        statusCode: statusCode
      });
      
      return res.status(statusCode).json({
        success: false,
        message: result.error || 'Impossible de créer le PaymentIntent. Stripe n\'est pas configuré. Définissez STRIPE_SECRET_KEY dans .env',
        code: isConfigError ? 'STRIPE_NOT_CONFIGURED' : (result.code || 'PAYMENT_INTENT_ERROR')
      });
    }

    console.log('[STRIPE] PaymentIntent créé avec succès:', result.paymentIntentId);

    // Sauvegarder le PaymentIntent ID
    payment.metadata = {
      ...(payment.metadata || {}),
      stripePaymentIntentId: result.paymentIntentId,
      stripeClientSecret: result.clientSecret
    };
    await payment.save();

    res.status(200).json({
      success: true,
      data: {
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
        amount: result.amount,
        currency: result.currency
      }
    });
  } catch (error) {
    console.error('[PAYMENT] Erreur createStripeIntent:', error);
    console.error('[PAYMENT] Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la création du PaymentIntent'
    });
  }
};

// ==================== CONFIRM STRIPE PAYMENT ====================
exports.confirmStripePayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    const payment = await Payment.findById(req.params.id)
      .populate('payer', 'firstName lastName email')
      .populate('unit', 'unitNumber');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    // Vérifier les permissions
    // Note: checkPaymentAccess permet maintenant aux propriétaires d'accéder
    // aux paiements où ils sont payeurs, bénéficiaires, ou propriétaires de l'unité
    if (!checkPaymentAccess(payment, req.user)) {
      console.error('[PROCESS_PAYMENT] Accès refusé:', {
        userId: req.user?._id,
        userRole: req.user?.role,
        paymentId: payment._id,
        payerId: payment.payer?._id || payment.payer,
        recipientId: payment.recipient?._id || payment.recipient
      });
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce paiement'
      });
    }

    // Confirmer le paiement Stripe
    const result = await confirmStripePayment(paymentIntentId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error || 'Le paiement n\'a pas pu être confirmé'
      });
    }

    // Marquer comme payé
    const updatedPayment = await markPaymentAsPaid(
      payment._id,
      'carte_credit',
      result.chargeId,
      `Paiement Stripe confirmé - PaymentIntent: ${paymentIntentId}`
    );

    res.status(200).json({
      success: true,
      message: 'Paiement confirmé avec succès',
      data: updatedPayment
    });
  } catch (error) {
    console.error('[PAYMENT] Erreur confirmStripePayment:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== CREATE INTERAC INSTRUCTIONS ====================
exports.createInteracInstructions = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('payer', 'firstName lastName email')
      .populate('unit', 'unitNumber');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    // Vérifier les permissions
    // Note: checkPaymentAccess permet maintenant aux propriétaires d'accéder
    // aux paiements où ils sont payeurs, bénéficiaires, ou propriétaires de l'unité
    if (!checkPaymentAccess(payment, req.user)) {
      console.error('[PROCESS_PAYMENT] Accès refusé:', {
        userId: req.user?._id,
        userRole: req.user?.role,
        paymentId: payment._id,
        payerId: payment.payer?._id || payment.payer,
        recipientId: payment.recipient?._id || payment.recipient
      });
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce paiement'
      });
    }

    // Récupérer les options depuis le body (banque, méthode de contact)
    const { bank, contactMethod } = req.body;

    const result = generateInteracInstructions(
      payment.amount,
      payment._id.toString(),
      {
        firstName: payment.payer.firstName,
        lastName: payment.payer.lastName,
        email: payment.payer.email,
        unitNumber: payment.unit.unitNumber
      },
      {
        bank: bank || 'AUTRE',
        contactMethod: contactMethod || 'email'
      }
    );

    // Sauvegarder le numéro de référence et les métadonnées
    payment.referenceNumber = result.referenceNumber;
    payment.paymentMethod = 'interac';
    if (!payment.metadata) payment.metadata = {};
    payment.metadata.interacBank = result.instructions.bankCode;
    payment.metadata.interacContactMethod = result.instructions.contactMethod;
    await payment.save();

    res.status(200).json({
      success: true,
      data: result.instructions,
      banks: result.banks
    });
  } catch (error) {
    console.error('[PAYMENT] Erreur createInteracInstructions:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== CREATE BANK TRANSFER INSTRUCTIONS ====================
exports.createBankTransferInstructions = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('recipient', 'firstName lastName')
      .populate('building', 'name');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    // Vérifier les permissions
    // Note: checkPaymentAccess permet maintenant aux propriétaires d'accéder
    // aux paiements où ils sont payeurs, bénéficiaires, ou propriétaires de l'unité
    if (!checkPaymentAccess(payment, req.user)) {
      console.error('[PROCESS_PAYMENT] Accès refusé:', {
        userId: req.user?._id,
        userRole: req.user?.role,
        paymentId: payment._id,
        payerId: payment.payer?._id || payment.payer,
        recipientId: payment.recipient?._id || payment.recipient
      });
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce paiement'
      });
    }

    const result = generateBankTransferInstructions(
      payment.amount,
      payment._id.toString(),
      {
        name: payment.building.name
      }
    );

    // Sauvegarder le numéro de référence
    payment.referenceNumber = result.referenceNumber;
    payment.paymentMethod = 'virement';
    await payment.save();

    res.status(200).json({
      success: true,
      data: result.instructions
    });
  } catch (error) {
    console.error('[PAYMENT] Erreur createBankTransferInstructions:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== GET NEXT DUE PAYMENT ====================
exports.getNextDuePayment = async (req, res) => {
  try {
    if (req.user.role !== 'locataire') {
      return res.status(403).json({
        success: false,
        message: 'Cette route est réservée aux locataires'
      });
    }

    const payment = await Payment.findOne({
      payer: req.user._id || req.user.id,
      status: { $in: ['en_attente', 'en_retard'] }
    })
      .populate('unit', 'unitNumber floor')
      .populate('building', 'name address')
      .sort({ dueDate: 1 })
      .lean();

    if (!payment) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'Aucun paiement en attente'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('[PAYMENT] Erreur getNextDuePayment:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== GET OVERDUE PAYMENTS ====================
exports.getOverduePayments = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cette route est réservée aux administrateurs'
      });
    }

    const payments = await Payment.find({
      status: { $in: ['en_attente', 'en_retard'] },
      dueDate: { $lt: new Date() }
    })
      .populate('unit', 'unitNumber')
      .populate('building', 'name')
      .populate('payer', 'firstName lastName email')
      .sort({ dueDate: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    console.error('[PAYMENT] Erreur getOverduePayments:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== GET PAYMENT STATS ====================
exports.getPaymentStats = async (req, res) => {
  try {
    const { calculatePaymentStats } = require('../services/paymentSyncService');
    
    // Construire les filtres selon le rôle
    const filters = {};
    if (req.user.role === 'locataire') {
      filters.payer = req.user._id || req.user.id;
    } else if (req.user.role === 'proprietaire') {
      const userUnits = await Unit.find({
        proprietaire: req.user._id || req.user.id
      }).distinct('_id');
      if (userUnits.length > 0) {
        filters.unit = { $in: userUnits };
      } else {
        // Si le propriétaire n'a pas d'unités, retourner des stats vides
        return res.status(200).json({
          success: true,
          data: {
            totalPaid: 0,
            totalPending: 0,
            totalOverdue: 0,
            paidCount: 0,
            pendingCount: 0,
            overdueCount: 0,
            totalAmount: 0,
            paidAmount: 0,
            pendingAmount: 0,
            overdueAmount: 0
          }
        });
      }
    }
    // Admin : pas de filtre, voir tous les paiements

    // Utiliser la fonction centralisée pour calculer les statistiques
    let stats;
    try {
      stats = await calculatePaymentStats(filters);
    } catch (statsError) {
      console.error('[PAYMENT] Erreur calculatePaymentStats:', statsError);
      // En cas d'erreur, retourner des stats vides plutôt que de faire échouer la requête
      stats = {
        paid: 0,
        pending: 0,
        overdue: 0,
        paidAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0
      };
    }

    res.status(200).json({
      success: true,
      data: {
        totalPaid: stats.paid || 0,
        totalPending: stats.pending || 0,
        totalOverdue: stats.overdue || 0,
        paidCount: stats.paid || 0,
        pendingCount: stats.pending || 0,
        overdueCount: stats.overdue || 0,
        totalAmount: stats.paidAmount || 0,
        paidAmount: stats.paidAmount || 0,
        pendingAmount: stats.pendingAmount || 0,
        overdueAmount: stats.overdueAmount || 0
      }
    });
  } catch (error) {
    console.error('[PAYMENT] ❌ Erreur getPaymentStats:', error);
    console.error('[PAYMENT] Stack:', error.stack);
    console.error('[PAYMENT] User:', req.user?._id, req.user?.role);
    
    // Vérifier si c'est une erreur de connexion MongoDB
    if (error.name === 'MongoNetworkError' || error.message?.includes('MongoServerError') || error.message?.includes('connection')) {
      return res.status(503).json({
        success: false,
        message: 'Erreur de connexion à la base de données. Le serveur est en cours d\'exécution mais n\'a pas pu traiter votre demande. Veuillez vérifier la connexion MongoDB.'
      });
    }
    
    // En cas d'erreur, retourner des stats vides plutôt que de faire échouer
    return res.status(200).json({
      success: true,
      data: {
        totalPaid: 0,
        totalPending: 0,
        totalOverdue: 0,
        paidCount: 0,
        pendingCount: 0,
        overdueCount: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0
      },
      ...(process.env.NODE_ENV === 'development' && { 
        warning: 'Stats calculées avec des valeurs par défaut en raison d\'une erreur',
        error: error.message
      })
    });
  }
};

// ==================== GENERATE RECEIPT ====================
exports.generateReceipt = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('unit', 'unitNumber')
      .populate('building', 'name address')
      .populate('payer', 'firstName lastName email')
      .populate('recipient', 'firstName lastName email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Paiement non trouvé'
      });
    }

    // Vérifier les permissions
    // Note: checkPaymentAccess permet maintenant aux propriétaires d'accéder
    // aux paiements où ils sont payeurs, bénéficiaires, ou propriétaires de l'unité
    if (!checkPaymentAccess(payment, req.user)) {
      console.error('[PROCESS_PAYMENT] Accès refusé:', {
        userId: req.user?._id,
        userRole: req.user?.role,
        paymentId: payment._id,
        payerId: payment.payer?._id || payment.payer,
        recipientId: payment.recipient?._id || payment.recipient
      });
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce paiement'
      });
    }

    if (payment.status !== 'paye') {
      return res.status(400).json({
        success: false,
        message: 'Le reçu ne peut être généré que pour un paiement payé'
      });
    }

    const receiptFilename = `receipt_${payment._id}_${Date.now()}.pdf`;
    const receiptPath = path.join(receiptsDir, receiptFilename);
    
    await generateReceiptPDF(payment, receiptPath);
    res.sendFile(receiptPath);
  } catch (error) {
    console.error('[PAYMENT] Erreur generateReceipt:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== GENERATE REPORT PDF ====================
exports.generatePaymentReport = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cette route est réservée aux administrateurs'
      });
    }

    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .populate('unit', 'unitNumber')
      .populate('building', 'name')
      .populate('payer', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    const reportFilename = `payment_report_${Date.now()}.pdf`;
    const reportPath = path.join(receiptsDir, reportFilename);
    await generatePaymentReportPDF(payments, { startDate, endDate }, reportPath);

    res.sendFile(reportPath);
  } catch (error) {
    console.error('[PAYMENT] Erreur generatePaymentReport:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== GENERATE REPORT EXCEL ====================
exports.generatePaymentReportExcel = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cette route est réservée aux administrateurs'
      });
    }

    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .populate('unit', 'unitNumber')
      .populate('building', 'name')
      .populate('payer', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    const reportFilename = `payment_report_${Date.now()}.xlsx`;
    const reportPath = path.join(receiptsDir, reportFilename);
    await generatePaymentReportExcel(payments, { startDate, endDate }, reportPath);

    res.sendFile(reportPath);
  } catch (error) {
    console.error('[PAYMENT] Erreur generatePaymentReportExcel:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

