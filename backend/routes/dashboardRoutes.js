const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const roleAuth = require('../middlewares/roleAuth');

/**
 * Routes protégées par rôle
 * Chaque route nécessite une authentification et vérifie le rôle de l'utilisateur
 */

// ============================================
// ROUTE ADMIN - Accès réservé aux administrateurs
// ============================================
router.get('/admin/dashboard', protect, roleAuth('admin'), async (req, res) => {
  console.log('[DEBUG] Route /admin/dashboard appelée');
  console.log('[DEBUG] User ID:', req.user._id);
  console.log('[DEBUG] User Email:', req.user.email);
  console.log('[DEBUG] User Role:', req.user.role);
  
  try {
    const User = require('../models/User');
    const Unit = require('../models/Unit');
    const Request = require('../models/Request');
    const Payment = require('../models/Payment');
    const Message = require('../models/Message');

    // Récupérer les statistiques réelles
    // Compter les immeubles uniques depuis les unités
    const uniqueBuildings = await Unit.distinct('building');
    const totalBuildings = uniqueBuildings.length;

    const [
      totalUsers,
      activeUsers,
      totalUnits,
      availableUnits,
      totalRequests,
      pendingRequests,
      completedRequests,
      totalPayments,
      recentUsers,
      recentRequests,
      // Nouvelles statistiques
      usersByRole,
      paymentsByStatus,
      recentPayments,
      recentMessages,
      overduePayments,
      monthlyRevenue
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Unit.countDocuments(),
      Unit.countDocuments({ 
        status: { $in: ['disponible', 'negociation'] },
        $or: [
          { isAvailable: { $ne: false } },
          { isAvailable: { $exists: false } }
        ]
      }),
      // Utiliser le service centralisé pour les statistiques de demandes
      (async () => {
        const { calculateRequestStats } = require('../services/requestSyncService');
        const stats = await calculateRequestStats({});
        return stats.total || 0;
      })(),
      // Utiliser le service centralisé pour les demandes en attente
      (async () => {
        const { calculateRequestStats } = require('../services/requestSyncService');
        const stats = await calculateRequestStats({});
        return stats.pending || 0;
      })(),
      // Utiliser le service centralisé pour les demandes terminées
      (async () => {
        const { calculateRequestStats } = require('../services/requestSyncService');
        const stats = await calculateRequestStats({});
        return stats.completed || 0;
      })(),
      Payment.countDocuments(),
      User.find().select('-password').sort({ createdAt: -1 }).limit(5),
      // Utiliser le service centralisé pour les demandes récentes
      (async () => {
        const { getRequestsUnified } = require('../services/requestSyncService');
        const requests = await getRequestsUnified({ role: 'admin' }, {});
        return requests.slice(0, 5);
      })(),
      // Nouvelles requêtes
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      // Utiliser le service centralisé pour les statistiques de paiements
      (async () => {
        const { calculatePaymentStats } = require('../services/paymentSyncService');
        const stats = await calculatePaymentStats({});
        return [
          { _id: 'paye', count: stats.paid, totalAmount: stats.paidAmount },
          { _id: 'en_attente', count: stats.pending, totalAmount: stats.pendingAmount },
          { _id: 'en_retard', count: stats.overdue, totalAmount: stats.overdueAmount }
        ];
      })(),
      // Utiliser le service centralisé pour les paiements récents
      (async () => {
        const { getReceivedPayments } = require('../services/paymentSyncService');
        return await getReceivedPayments({}).then(p => p.slice(0, 5));
      })(),
      // Utiliser le service centralisé pour les messages récents
      (async () => {
        const { getMessagesUnified } = require('../services/messageSyncService');
        const messages = await getMessagesUnified({ role: 'admin' }, {});
        return messages.slice(0, 5);
      })(),
      // Utiliser le service centralisé pour compter les paiements en retard
      (async () => {
        const { calculatePaymentStats } = require('../services/paymentSyncService');
        const stats = await calculatePaymentStats({});
        return stats.overdue || 0;
      })(),
      // Utiliser le service centralisé pour le revenu mensuel
      (async () => {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const { calculatePaymentStats } = require('../services/paymentSyncService');
        const stats = await calculatePaymentStats({ 
          status: 'paye', 
          paidDate: { $gte: startOfMonth } 
        });
        return [{ total: stats.paidAmount || 0 }];
      })()
    ]);

    // Organiser les utilisateurs par rôle
    const usersByRoleObj = {};
    (usersByRole || []).forEach(item => {
      usersByRoleObj[item._id] = item.count;
    });

    // Organiser les paiements par statut
    const paymentsByStatusObj = {
      paye: { count: 0, total: 0 },
      en_attente: { count: 0, total: 0 },
      en_retard: { count: 0, total: 0 }
    };
    (paymentsByStatus || []).forEach(item => {
      if (paymentsByStatusObj[item._id]) {
        paymentsByStatusObj[item._id].count = item.count;
        paymentsByStatusObj[item._id].total = item.totalAmount || 0;
      }
    });

    // Calculer le revenu mensuel
    const currentMonthRevenue = (monthlyRevenue && monthlyRevenue.length > 0) ? monthlyRevenue[0].total : 0;

    // S'assurer que toutes les données sont initialisées même si vides
    const responseData = {
      success: true,
      message: 'Bienvenue sur le tableau de bord administrateur',
      data: {
        user: {
          id: req.user._id,
          name: `${req.user.firstName} ${req.user.lastName}`,
          email: req.user.email,
          role: req.user.role
        },
        stats: {
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          inactiveUsers: (totalUsers || 0) - (activeUsers || 0),
          totalBuildings: totalBuildings || 0,
          totalUnits: totalUnits || 0,
          availableUnits: availableUnits || 0,
          occupiedUnits: (totalUnits || 0) - (availableUnits || 0),
          totalRequests: totalRequests || 0,
          pendingRequests: pendingRequests || 0,
          completedRequests: completedRequests || 0,
          totalPayments: totalPayments || 0,
          overduePayments: overduePayments || 0,
          currentMonthRevenue: currentMonthRevenue || 0,
          usersByRole: usersByRoleObj || {},
          paymentsByStatus: paymentsByStatusObj || {
            paye: { count: 0, total: 0 },
            en_attente: { count: 0, total: 0 },
            en_retard: { count: 0, total: 0 }
          }
        },
        recentUsers: (recentUsers || []).map(u => ({
          id: u._id,
          name: `${u.firstName} ${u.lastName}`,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt
        })),
        recentRequests: (recentRequests || []).map(r => ({
          id: r._id,
          type: r.type,
          title: r.title,
          description: r.description,
          status: r.status,
          priority: r.priority,
          user: r.createdBy ? {
            firstName: r.createdBy.firstName,
            lastName: r.createdBy.lastName,
            email: r.createdBy.email
          } : null,
          unit: r.unit ? {
            unitNumber: r.unit.unitNumber
          } : null,
          building: r.building ? {
            name: r.building.name
          } : null,
          createdAt: r.createdAt
        })),
        recentPayments: (recentPayments || []).map(p => ({
          id: p._id,
          amount: p.amount,
          status: p.status,
          payer: p.payer,
          unit: p.unit,
          createdAt: p.createdAt
        })),
        recentMessages: (recentMessages || []).map(m => ({
          id: m._id,
          subject: m.subject,
          sender: m.sender,
          receiver: m.receiver,
          createdAt: m.createdAt
        }))
      }
    };

    console.log('[DEBUG] Réponse envoyée avec succès');
    console.log('[DEBUG] Stats:', JSON.stringify(responseData.data.stats, null, 2));
    
    res.json(responseData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// Exemple d'autres routes admin
router.get('/admin/users', protect, roleAuth('admin'), async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find().select('-password');
    
    res.json({
      success: true,
      message: 'Liste des utilisateurs',
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs',
      error: error.message
    });
  }
});

router.get('/admin/stats', protect, roleAuth('admin'), async (req, res) => {
  try {
    const User = require('../models/User');
    const Unit = require('../models/Unit');
    const Request = require('../models/Request');
    const Payment = require('../models/Payment');

    // Récupérer les statistiques réelles
    // Compter les immeubles uniques depuis les unités
    const uniqueBuildings = await Unit.distinct('building');
    const totalBuildings = uniqueBuildings.length;

    const [
      totalUsers,
      activeUsers,
      totalUnits,
      availableUnits,
      totalRequests,
      pendingRequests,
      completedRequests,
      totalPayments,
      overduePayments,
      monthlyRevenue
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Unit.countDocuments(),
      Unit.countDocuments({ 
        status: { $in: ['disponible', 'negociation'] },
        $or: [
          { isAvailable: { $ne: false } },
          { isAvailable: { $exists: false } }
        ]
      }),
      // Utiliser le service centralisé pour les statistiques de demandes
      (async () => {
        const { calculateRequestStats } = require('../services/requestSyncService');
        const stats = await calculateRequestStats({});
        return stats.total || 0;
      })(),
      // Utiliser le service centralisé pour les demandes en attente
      (async () => {
        const { calculateRequestStats } = require('../services/requestSyncService');
        const stats = await calculateRequestStats({});
        return stats.pending || 0;
      })(),
      // Utiliser le service centralisé pour les demandes terminées
      (async () => {
        const { calculateRequestStats } = require('../services/requestSyncService');
        const stats = await calculateRequestStats({});
        return stats.completed || 0;
      })(),
      Payment.countDocuments(),
      // Utiliser le service centralisé pour compter les paiements en retard
      (async () => {
        const { calculatePaymentStats } = require('../services/paymentSyncService');
        const stats = await calculatePaymentStats({});
        return stats.overdue || 0;
      })(),
      // Utiliser le service centralisé pour le revenu mensuel
      (async () => {
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const { calculatePaymentStats } = require('../services/paymentSyncService');
        const stats = await calculatePaymentStats({ 
          status: 'paye', 
          paidDate: { $gte: startOfMonth } 
        });
        return stats.paidAmount || 0;
      })()
    ]);

    // Calculer le taux d'occupation
    const occupiedUnits = totalUnits - availableUnits;
    const occupancyRate = totalUnits > 0 
      ? Math.round((occupiedUnits / totalUnits) * 100) 
      : 0;

    res.json({
      success: true,
      message: 'Statistiques système',
      data: {
        stats: {
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          totalBuildings: totalBuildings || 0,
          totalUnits: totalUnits || 0,
          availableUnits: availableUnits || 0,
          occupiedUnits: occupiedUnits || 0,
          totalRequests: totalRequests || 0,
          pendingRequests: pendingRequests || 0,
          completedRequests: completedRequests || 0,
          totalPayments: totalPayments || 0,
          overduePayments: overduePayments || 0,
          currentMonthRevenue: monthlyRevenue || 0,
          occupancyRate: occupancyRate || 0
        }
      }
    });
  } catch (error) {
    console.error('[ADMIN/STATS] Erreur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

// ============================================
// ROUTE PROPRIÉTAIRE - Accès réservé aux propriétaires
// ============================================
router.get('/proprietaire/dashboard', protect, roleAuth('proprietaire'), async (req, res) => {
  try {
    const Unit = require('../models/Unit');
    const Request = require('../models/Request');
    const Payment = require('../models/Payment');
    const Message = require('../models/Message');

    // Récupérer d'abord toutes les unités
    const myUnits = await Unit.find({ proprietaire: req.user._id }).populate('building').populate('locataire', 'firstName lastName email');
    const unitIds = myUnits.map(u => u._id);

    // Date du mois en cours
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Récupérer les statistiques réelles
    const [
      availableUnits,
      rentedUnits,
      totalRequests,
      pendingRequests,
      myPaymentsReceived,
      overduePayments,
      currentMonthPayments,
      maintenanceRequests,
      recentUnits,
      recentRequests,
      acceptedRequestsWithDocs,
      pendingInitialPayments
    ] = await Promise.all([
      Unit.countDocuments({ proprietaire: req.user._id, status: 'disponible' }),
      Unit.countDocuments({ proprietaire: req.user._id, status: 'loue' }),
      // Utiliser le service centralisé pour les statistiques de demandes du propriétaire
      // Inclure : 1) Les demandes créées par le propriétaire, 2) Les demandes pour ses unités
      (async () => {
        const Request = require('../models/Request');
        const { getRequestsUnified } = require('../services/requestSyncService');
        
        // Récupérer toutes les demandes (créées par lui ou pour ses unités)
        let allRequests = [];
        
        // Demandes créées par le propriétaire
        const requestsAsRequester = await getRequestsUnified(req.user, {
          createdBy: req.user._id,
          type: { $in: ['location', 'achat'] }
        });
        
        // Demandes pour les unités du propriétaire
        if (unitIds.length > 0) {
          const requestsAsOwner = await getRequestsUnified(req.user, {
            unit: { $in: unitIds },
            type: { $in: ['location', 'achat'] }
          });
          allRequests = [...requestsAsRequester, ...requestsAsOwner];
        } else {
          allRequests = requestsAsRequester;
        }
        
        // Dédupliquer par _id
        const uniqueRequests = allRequests.filter((req, index, self) => 
          index === self.findIndex(r => r._id && r._id.toString() === req._id.toString())
        );
        
        return uniqueRequests.length;
      })(),
      (async () => {
        const { getRequestsUnified } = require('../services/requestSyncService');
        
        // Récupérer toutes les demandes en attente (créées par lui ou pour ses unités)
        let allRequests = [];
        
        // Demandes créées par le propriétaire
        const requestsAsRequester = await getRequestsUnified(req.user, {
          createdBy: req.user._id,
          type: { $in: ['location', 'achat'] },
          status: 'en_attente'
        });
        
        // Demandes pour les unités du propriétaire
        if (unitIds.length > 0) {
          const requestsAsOwner = await getRequestsUnified(req.user, {
            unit: { $in: unitIds },
            type: { $in: ['location', 'achat'] },
            status: 'en_attente'
          });
          allRequests = [...requestsAsRequester, ...requestsAsOwner];
        } else {
          allRequests = requestsAsRequester;
        }
        
        // Dédupliquer par _id
        const uniqueRequests = allRequests.filter((req, index, self) => 
          index === self.findIndex(r => r._id && r._id.toString() === req._id.toString())
        );
        
        return uniqueRequests.length;
      })(),
      // Paiements reçus (payés) - Utiliser le service centralisé
      unitIds.length > 0 ? (async () => {
        const { getReceivedPayments } = require('../services/paymentSyncService');
        const received = await getReceivedPayments({ unit: { $in: unitIds } });
        return received.sort((a, b) => new Date(b.paidDate || b.createdAt) - new Date(a.paidDate || a.createdAt)).slice(0, 10);
      })() : Promise.resolve([]),
      // Paiements en retard - Utiliser le service centralisé
      unitIds.length > 0 ? (async () => {
        const { getOverduePayments } = require('../services/paymentSyncService');
        return await getOverduePayments({ unit: { $in: unitIds } });
      })() : Promise.resolve([]),
      // Paiements du mois en cours (tous statuts)
      unitIds.length > 0 ? Payment.find({ 
        unit: { $in: unitIds },
        dueDate: { $gte: startOfMonth, $lte: endOfMonth }
      }).populate('unit', 'unitNumber').populate('payer', 'firstName lastName email').lean() : [],
      // Utiliser le service centralisé pour les demandes de maintenance
      (async () => {
        const { getRequestsUnified } = require('../services/requestSyncService');
        const requests = await getRequestsUnified(req.user, {
          type: { $in: ['maintenance', 'service', 'reclamation'] },
          status: { $in: ['en_attente', 'en_cours'] }
        });
        return requests.slice(0, 5);
      })(),
      Unit.find({ proprietaire: req.user._id }).populate('building').populate('locataire', 'firstName lastName email').sort({ updatedAt: -1 }),
      // Utiliser le service centralisé pour les demandes récentes du propriétaire
      (async () => {
        const { getRequestsUnified } = require('../services/requestSyncService');
        const requests = await getRequestsUnified(req.user, { createdBy: req.user._id });
        return requests.slice(0, 5);
      })(),
      // Récupérer les candidatures (demandes de location/achat) pour les unités du propriétaire OU créées par lui - Utiliser le service centralisé
      (async () => {
        const { getRequestsUnified } = require('../services/requestSyncService');
        
        // Récupérer les demandes pour les unités du propriétaire
        let requestsAsOwner = [];
        if (unitIds.length > 0) {
          requestsAsOwner = await getRequestsUnified(req.user, {
            unit: { $in: unitIds },
            type: { $in: ['location', 'achat'] },
            status: { $in: ['en_attente', 'accepte', 'refuse'] }
          });
        }
        
        // Récupérer les demandes créées par le propriétaire lui-même (même s'il était visiteur avant)
        const requestsAsRequester = await getRequestsUnified(req.user, {
          createdBy: req.user._id,
          type: { $in: ['location', 'achat'] },
          status: { $in: ['en_attente', 'accepte', 'refuse'] }
        });
        
        // Combiner et dédupliquer par _id
        const allRequests = [...requestsAsOwner, ...requestsAsRequester];
        const uniqueRequests = allRequests.filter((req, index, self) => 
          index === self.findIndex(r => r._id && r._id.toString() === req._id.toString())
        );
        
        return uniqueRequests.slice(0, 20);
      })(),
      // Récupérer les demandes acceptées avec documents à signer pour le propriétaire
      // Inclure : 1) Les demandes où il est propriétaire de l'unité, 2) Les demandes qu'il a créées
      (async () => {
        const { getRequestsUnified } = require('../services/requestSyncService');
        const Request = require('../models/Request');
        
        // Récupérer les demandes où le propriétaire est propriétaire de l'unité
        let requestsAsOwner = [];
        if (unitIds.length > 0) {
          requestsAsOwner = await getRequestsUnified(req.user, {
            unit: { $in: unitIds },
            type: { $in: ['location', 'achat'] },
            status: 'accepte'
          });
        }
        
        // Récupérer les demandes créées par le propriétaire lui-même
        const requestsAsRequester = await getRequestsUnified(req.user, {
          createdBy: req.user._id,
          type: { $in: ['location', 'achat'] },
          status: 'accepte'
        });
        
        // Combiner et dédupliquer par _id
        const allRequests = [...requestsAsOwner, ...requestsAsRequester];
        const uniqueRequests = allRequests.filter((req, index, self) => 
          index === self.findIndex(r => r._id && r._id.toString() === req._id.toString())
        );
        
        // Retourner toutes les demandes acceptées avec documents générés (pas seulement celles avec documents non signés)
        // Le frontend affichera toutes les demandes et calculera le nombre de documents non signés
        return uniqueRequests.filter(r => {
          return r.generatedDocuments && r.generatedDocuments.length > 0;
        });
      })(),
      // Récupérer les paiements initiaux en attente pour les demandes acceptées
      // Inclure : 1) Les demandes où il est propriétaire de l'unité, 2) Les demandes qu'il a créées
      (async () => {
        const { getRequestsUnified } = require('../services/requestSyncService');
        
        // Récupérer les demandes où le propriétaire est propriétaire de l'unité
        let requestsAsOwner = [];
        if (unitIds.length > 0) {
          requestsAsOwner = await getRequestsUnified(req.user, {
            unit: { $in: unitIds },
            type: { $in: ['location', 'achat'] },
            status: 'accepte'
          });
        }
        
        // Récupérer les demandes créées par le propriétaire lui-même
        const requestsAsRequester = await getRequestsUnified(req.user, {
          createdBy: req.user._id,
          type: { $in: ['location', 'achat'] },
          status: 'accepte'
        });
        
        // Combiner et dédupliquer par _id
        const allRequests = [...requestsAsOwner, ...requestsAsRequester];
        const uniqueRequests = allRequests.filter((req, index, self) => 
          index === self.findIndex(r => r._id && r._id.toString() === req._id.toString())
        );
        
        // Filtrer celles qui ont un paiement initial en attente
        return uniqueRequests.filter(r => r.initialPayment && r.initialPayment.status === 'en_attente');
      })()
    ]);

    // Calculer les revenus mensuels estimés
    const monthlyRevenue = myUnits
      .filter(u => u.status === 'loue' && u.rentPrice)
      .reduce((sum, u) => sum + (u.rentPrice || 0), 0);

    // Calculer le pourcentage d'occupation
    const occupancyRate = myUnits.length > 0 ? Math.round((rentedUnits / myUnits.length) * 100) : 0;

    // Calculer les revenus reçus ce mois
    const receivedThisMonth = (currentMonthPayments || [])
      .filter(p => p.status === 'paye')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // Créer un mapping des paiements par unité
    const paymentsByUnit = {};
    (currentMonthPayments || []).forEach(p => {
      if (p && p.unit && p.unit._id) {
        const unitId = p.unit._id.toString();
        if (!paymentsByUnit[unitId]) {
          paymentsByUnit[unitId] = [];
        }
        paymentsByUnit[unitId].push(p);
      }
    });

    // Ajouter les informations de paiement et alertes à chaque unité, ainsi que les images
    // Plus besoin d'importer imageHelper - on utilise uniquement les images uploadées
    const unitsWithDetails = (myUnits || []).map(unit => {
      const unitPayments = paymentsByUnit[unit._id.toString()] || [];
      const paidThisMonth = unitPayments.filter(p => p.status === 'paye').reduce((sum, p) => sum + (p.amount || 0), 0);
      const pendingPayment = unitPayments.find(p => p.status === 'en_attente' || p.status === 'en_retard');
      const overdue = (overduePayments || []).find(p => p.unit && p.unit._id && p.unit._id.toString() === unit._id.toString());
      const hasMaintenance = (maintenanceRequests || []).some(r => r.unit && r.unit._id && r.unit._id.toString() === unit._id.toString());
      
      const unitObj = unit.toObject();

      return {
        ...unitObj,
        images: unitObj.images || [], // Inclure le tableau images
        imageUrl: (unitObj.images && unitObj.images.length > 0) ? unitObj.images[0] : null,
        building: unitObj.building ? {
          ...unitObj.building,
          imageUrl: unitObj.building.image || null
        } : unitObj.building,
        paidThisMonth,
        pendingPayment,
        hasOverdue: !!overdue,
        hasMaintenance,
        currentMonthPayments: unitPayments
      };
    });

    res.json({
      success: true,
      message: 'Bienvenue sur votre tableau de bord propriétaire',
      data: {
        user: {
          id: req.user._id,
          name: `${req.user.firstName} ${req.user.lastName}`,
          email: req.user.email,
          role: req.user.role
        },
        stats: {
          totalUnits: myUnits.length,
          availableUnits,
          rentedUnits,
          occupancyRate,
          totalRequests,
          pendingRequests,
          acceptedRequests: (acceptedRequestsWithDocs || []).length,
          documentsToSign: (acceptedRequestsWithDocs || []).reduce((count, req) => {
            if (req.generatedDocuments) {
              const unsignedDocs = req.generatedDocuments.filter(doc => !doc.signed || doc.signed === false);
              return count + unsignedDocs.length;
            }
            return count;
          }, 0),
          pendingInitialPayments: (pendingInitialPayments || []).length,
          monthlyRevenue,
          receivedThisMonth,
          overdueCount: (overduePayments || []).length,
          alertsCount: (overduePayments || []).length + (maintenanceRequests || []).length + (acceptedRequestsWithDocs || []).length + (pendingInitialPayments || []).length
        },
        unitsWithDetails,
        overduePayments: (overduePayments || []).map(p => ({
          id: p._id,
          amount: p.amount,
          dueDate: p.dueDate,
          unit: p.unit,
          payer: p.payer
        })),
        maintenanceRequests: (maintenanceRequests || []).map(r => ({
          id: r._id,
          type: r.type,
          title: r.title,
          status: r.status,
          unit: r.unit,
          createdAt: r.createdAt
        })),
        recentRequests: recentRequests.map(r => ({
          id: r._id,
          type: r.type,
          title: r.title,
          status: r.status,
          unit: r.unit,
          createdAt: r.createdAt
        })),
        applications: (recentRequests || []).filter(r => r.type === 'location' || r.type === 'achat').map(app => ({
          _id: app._id,
          title: app.title,
          description: app.description,
          type: app.type,
          status: app.status,
          createdAt: app.createdAt,
          createdBy: app.createdBy,
          unit: app.unit,
          building: app.building
        })),
        acceptedRequestsWithDocs: (acceptedRequestsWithDocs || []).map(r => {
          // S'assurer que createdBy est bien peuplé et accessible
          const createdByData = r.createdBy ? {
            _id: r.createdBy._id || r.createdBy,
            firstName: r.createdBy.firstName || '',
            lastName: r.createdBy.lastName || '',
            email: r.createdBy.email || '',
            phone: r.createdBy.phone || '',
            role: r.createdBy.role || ''
          } : null;
          
          return {
            _id: r._id,
            type: r.type,
            title: r.title || r.description, // Utiliser description si title n'existe pas
            status: r.status,
            createdAt: r.createdAt,
            approvedAt: r.approvedAt,
            unit: r.unit,
            building: r.building,
            createdBy: createdByData,
            approvedBy: r.approvedBy,
            generatedDocuments: r.generatedDocuments || [],
            initialPayment: r.initialPayment || null
          };
        }),
        pendingInitialPayments: (pendingInitialPayments || []).map(r => ({
          _id: r._id,
          type: r.type,
          title: r.title,
          status: r.status,
          createdAt: r.createdAt,
          approvedAt: r.approvedAt,
          unit: r.unit,
          building: r.building,
          createdBy: r.createdBy,
          initialPayment: r.initialPayment || null
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// Route pour obtenir les unités d'un propriétaire
router.get('/proprietaire/my-units', protect, roleAuth('proprietaire'), async (req, res) => {
  try {
    const Unit = require('../models/Unit');
    const units = await Unit.find({ proprietaire: req.user._id }).populate('building').populate('locataire', 'firstName lastName email');
    
    res.json({
      success: true,
      message: 'Vos unités',
      data: units
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de vos unités',
      error: error.message
    });
  }
});

// ============================================
// ROUTE LOCATAIRE - Accès réservé aux locataires
// ============================================
router.get('/locataire/dashboard', protect, roleAuth('locataire'), async (req, res) => {
  try {
    const Unit = require('../models/Unit');
    const Request = require('../models/Request');
    const Payment = require('../models/Payment');
    const Message = require('../models/Message');

    // Récupérer l'unité assignée au locataire (essayer avec 'locataire' aussi)
    let myUnit = await Unit.findOne({ locataire: req.user._id })
      .populate('building', 'name address')
      .populate('proprietaire', 'firstName lastName email phone')
      .lean();
    
    // Si pas trouvé avec 'locataire', essayer avec 'tenant'
    if (!myUnit) {
      myUnit = await Unit.findOne({ tenant: req.user._id })
        .populate('building', 'name address')
        .populate('proprietaire', 'firstName lastName email phone')
        .lean();
    }

    // Récupérer les demandes du locataire (tous types y compris location/achat)
    // Utiliser le service centralisé pour les demandes du locataire
    const { getRequestsUnified } = require('../services/requestSyncService');
    const myRequests = await getRequestsUnified(req.user, { createdBy: req.user._id })
      .then(requests => requests.slice(0, 10));

    // Récupérer les paiements du locataire - Utiliser le service centralisé
    const { getPaymentsUnified } = require('../services/paymentSyncService');
    const myPayments = await getPaymentsUnified(req.user, { payer: req.user._id })
      .then(payments => payments.slice(0, 10));

    // Récupérer les messages récents - Utiliser le service centralisé
    const { getMessagesUnified } = require('../services/messageSyncService');
    const messages = await getMessagesUnified(req.user, {})
      .then(messages => messages.slice(0, 10));

    // Récupérer les notifications
    const Notification = require('../models/Notification');
    const notifications = await Notification.find({ user: req.user._id })
      .populate('sender', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Récupérer les documents du locataire
    const Document = require('../models/Document');
    const userUnits = myUnit ? [myUnit._id] : [];
    const documents = await Document.find({
      $or: [
        { unit: { $in: userUnits } },
        { accessRoles: 'locataire' },
        { isPublic: true }
      ]
    })
      .populate('building', 'name')
      .populate('unit', 'unitNumber')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Statistiques - Utiliser les services centralisés pour garantir la cohérence
    const { calculateRequestStats } = require('../services/requestSyncService');
    const { calculatePaymentStats } = require('../services/paymentSyncService');
    const { getUnreadCount } = require('../services/messageSyncService');
    
    const [requestStats, paymentStats, unreadMessageCount] = await Promise.all([
      calculateRequestStats({ createdBy: req.user._id }),
      calculatePaymentStats({ payer: req.user._id }),
      getUnreadCount(req.user._id, {})
    ]);
    
    const stats = {
      totalRequests: requestStats.total || 0,
      pendingRequests: requestStats.pending || 0,
      inProgressRequests: requestStats.inProgress || 0,
      completedRequests: requestStats.completed || 0,
      totalPayments: paymentStats.total || 0,
      pendingPayments: paymentStats.pending || 0,
      overduePayments: paymentStats.overdue || 0,
      paidPayments: paymentStats.paid || 0,
      unreadMessages: unreadMessageCount || 0
    };
    
    console.log('[DASHBOARD LOCATAIRE] ✅ Statistiques calculées:', stats);

    // S'assurer que myUnit a une image si disponible
    // Plus besoin d'importer imageHelper - on utilise uniquement les images uploadées
    const myUnitWithImage = myUnit ? {
      ...myUnit,
      images: myUnit.images || [], // Inclure le tableau images
      imageUrl: (myUnit.images && myUnit.images.length > 0) ? myUnit.images[0] : null,
      building: myUnit.building ? {
        ...myUnit.building,
        imageUrl: myUnit.building.image || null
      } : myUnit.building
    } : null;

    res.json({
      success: true,
      message: 'Bienvenue sur votre tableau de bord locataire',
      data: {
        user: {
          id: req.user._id,
          name: `${req.user.firstName} ${req.user.lastName}`,
          email: req.user.email,
          role: req.user.role
        },
        myUnit: myUnitWithImage,
        myRequests: myRequests || [],
        myPayments: myPayments || [],
        messages: messages || [],
        notifications: notifications || [],
        documents: documents || [],
        stats: stats
      }
    });
  } catch (error) {
    console.error('[LOCATAIRE DASHBOARD] Erreur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// Route pour obtenir l'unité d'un locataire
router.get('/locataire/my-unit', protect, roleAuth('locataire'), async (req, res) => {
  try {
    const Unit = require('../models/Unit');
    const unit = await Unit.findOne({ tenant: req.user._id }).populate('building');
    
    if (!unit) {
      return res.json({
        success: true,
        message: 'Aucune unité assignée',
        data: null
      });
    }
    
    res.json({
      success: true,
      message: 'Votre unité',
      data: unit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de votre unité',
      error: error.message
    });
  }
});

// ============================================
// ROUTE VISITEUR - Accès réservé aux visiteurs
// ============================================
router.get('/visiteur/dashboard', protect, roleAuth('visiteur'), async (req, res) => {
  try {
    const Request = require('../models/Request');
    const Payment = require('../models/Payment');
    const Notification = require('../models/Notification');

    // Récupérer les demandes acceptées avec documents générés non signés
    const acceptedRequestsWithDocs = await Request.find({
      createdBy: req.user._id,
      status: 'accepte',
      generatedDocuments: { $exists: true, $ne: [] }
    })
      .populate('unit', 'unitNumber type size bedrooms rentPrice salePrice')
      .populate('building', 'name address')
      .populate('approvedBy', 'firstName lastName')
      .sort({ approvedAt: -1 })
      .lean();

    // Filtrer pour ne garder que celles avec des documents non signés
    const requestsWithUnsignedDocs = acceptedRequestsWithDocs.filter(req => {
      return req.generatedDocuments && req.generatedDocuments.some(doc => !doc.signed || doc.signed === false);
    });

    // Récupérer les paiements en attente liés aux demandes
    const pendingPayments = await Payment.find({
      payer: req.user._id,
      status: { $in: ['en_attente', 'en_retard'] },
      requestId: { $exists: true }
    })
      .populate('unit', 'unitNumber')
      .populate('building', 'name')
      .populate('requestId', 'title type')
      .sort({ dueDate: 1 })
      .lean();

    // Récupérer les notifications
    const notifications = await Notification.find({ user: req.user._id })
      .populate('sender', 'firstName lastName')
      .populate('request', 'title type')
      .populate('unit', 'unitNumber')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Récupérer toutes les demandes du visiteur pour les stats
    const { getRequestsUnified } = require('../services/requestSyncService');
    const { getPaymentsUnified } = require('../services/paymentSyncService');
    
    const allRequests = await getRequestsUnified(req.user, { createdBy: req.user._id });
    const allPayments = await getPaymentsUnified(req.user, { payer: req.user._id });

    const stats = {
      totalRequests: allRequests.length,
      pendingRequests: allRequests.filter(r => r.status === 'en_attente').length,
      acceptedRequests: allRequests.filter(r => r.status === 'accepte').length,
      documentsToSign: requestsWithUnsignedDocs.reduce((count, req) => {
        const unsignedDocs = req.generatedDocuments.filter(doc => !doc.signed || doc.signed === false);
        return count + unsignedDocs.length;
      }, 0),
      pendingPayments: pendingPayments.length,
      totalPayments: allPayments.length
    };

    res.json({
      success: true,
      message: 'Bienvenue sur votre tableau de bord visiteur',
      data: {
        user: {
          id: req.user._id,
          name: `${req.user.firstName} ${req.user.lastName}`,
          email: req.user.email,
          role: req.user.role
        },
        stats: stats,
        acceptedRequestsWithDocs: requestsWithUnsignedDocs,
        pendingPayments: pendingPayments,
        notifications: notifications || []
      }
    });
  } catch (error) {
    console.error('[VISITEUR DASHBOARD] Erreur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// ============================================
// ROUTE MULTI-RÔLES - Accès pour plusieurs rôles
// ============================================
router.get('/dashboard', protect, roleAuth('admin', 'proprietaire', 'locataire'), async (req, res) => {
  try {
    // Route accessible aux admins, propriétaires et locataires
    // Le contenu peut varier selon le rôle
    let dashboardData = {
      user: {
        id: req.user._id,
        name: `${req.user.firstName} ${req.user.lastName}`,
        email: req.user.email,
        role: req.user.role
      }
    };

    // Contenu spécifique selon le rôle
    if (req.user.role === 'admin') {
      dashboardData.adminStats = { /* stats admin */ };
    } else if (req.user.role === 'proprietaire') {
      dashboardData.myUnits = [ /* unités du propriétaire */ ];
    } else if (req.user.role === 'locataire') {
      dashboardData.myUnit = null; /* unité du locataire */;
    }

    res.json({
      success: true,
      message: `Bienvenue ${req.user.firstName}`,
      data: dashboardData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

// ============================================
// ROUTE POUR VÉRIFIER LE STATUT D'AUTHENTIFICATION
// ============================================
router.get('/me', protect, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Utilisateur authentifié',
      data: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
});

module.exports = router;

// Log pour confirmation que le module est chargé
console.log('[DASHBOARD ROUTES] Routes dashboard chargées:', {
  '/admin/dashboard': 'GET',
  '/proprietaire/dashboard': 'GET',
  '/locataire/dashboard': 'GET',
  '/visiteur/dashboard': 'GET',
  '/dashboard': 'GET',
  '/me': 'GET'
});

