/**
 * Contrôleur pour les exports de données
 * Gère les exports Excel et PDF pour demandes et utilisateurs
 */

const Request = require('../models/Request');
const User = require('../models/User');
const Unit = require('../models/Unit');
const Building = require('../models/Building');
const { generateExcelExport, generatePDFExport } = require('../services/exportService');
const path = require('path');
const fs = require('fs');

const exportsDir = path.join(__dirname, '../uploads/exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

/**
 * Export Excel des demandes
 */
exports.exportRequestsExcel = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status,
      type,
      building,
      unit,
      priority,
      createdBy
    } = req.query;

    // Construire les filtres
    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (status) query.status = status;
    if (type) query.type = type;
    if (building) query.building = building;
    if (unit) query.unit = unit;
    if (priority) query.priority = priority;
    if (createdBy) query.createdBy = createdBy;

    // Récupérer les demandes
    const requests = await Request.find(query)
      .populate('building', 'name address')
      .populate('unit', 'unitNumber')
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    // Configuration de l'export
    const config = {
      title: 'RAPPORT DES DEMANDES',
      sheetName: 'Demandes',
      columns: [
        { header: 'ID', key: '_id', width: 25, formatter: (val) => val.toString().substring(0, 8) },
        { header: 'Date', key: 'createdAt', width: 15, formatter: (val) => new Date(val).toLocaleDateString('fr-FR') },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Statut', key: 'status', width: 15 },
        { header: 'Priorité', key: 'priority', width: 12 },
        { header: 'Immeuble', key: 'building', width: 20, formatter: (val) => val?.name || 'N/A' },
        { header: 'Unité', key: 'unit', width: 15, formatter: (val) => val?.unitNumber || 'N/A' },
        { header: 'Créé par', key: 'createdBy', width: 25, formatter: (val) => val ? `${val.firstName} ${val.lastName}` : 'N/A' },
        { header: 'Email', key: 'createdBy', width: 30, formatter: (val) => val?.email || 'N/A' },
        { header: 'Assigné à', key: 'assignedTo', width: 25, formatter: (val) => val ? `${val.firstName} ${val.lastName}` : 'N/A' },
        { header: 'Description', key: 'description', width: 40 }
      ],
      filters: {
        ...(startDate && { 'Date début': new Date(startDate).toLocaleDateString('fr-FR') }),
        ...(endDate && { 'Date fin': new Date(endDate).toLocaleDateString('fr-FR') }),
        ...(status && { 'Statut': status }),
        ...(type && { 'Type': type }),
        ...(priority && { 'Priorité': priority })
      },
      statsGenerator: (data) => {
        const statusCounts = {};
        const typeCounts = {};
        data.forEach(req => {
          statusCounts[req.status] = (statusCounts[req.status] || 0) + 1;
          typeCounts[req.type] = (typeCounts[req.type] || 0) + 1;
        });
        return {
          'Total demandes': data.length,
          'En attente': statusCounts['en_attente'] || 0,
          'En cours': statusCounts['en_cours'] || 0,
          'Terminées': statusCounts['termine'] || 0,
          'Urgentes': data.filter(r => r.priority === 'urgente').length
        };
      }
    };

    const filename = `demandes_export_${Date.now()}.xlsx`;
    const filePath = path.join(exportsDir, filename);
    
    await generateExcelExport(requests, config, filePath);
    
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('[EXPORT] Erreur téléchargement:', err);
      }
      // Nettoyer après téléchargement
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  } catch (error) {
    console.error('[EXPORT] Erreur export demandes Excel:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Export PDF des demandes
 */
exports.exportRequestsPDF = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      status,
      type,
      building,
      unit,
      priority,
      createdBy
    } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    if (status) query.status = status;
    if (type) query.type = type;
    if (building) query.building = building;
    if (unit) query.unit = unit;
    if (priority) query.priority = priority;
    if (createdBy) query.createdBy = createdBy;

    const requests = await Request.find(query)
      .populate('building', 'name address')
      .populate('unit', 'unitNumber')
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    const config = {
      title: 'RAPPORT DES DEMANDES',
      columns: [
        { header: 'Date', key: 'createdAt', width: 80, formatter: (val) => new Date(val).toLocaleDateString('fr-FR') },
        { header: 'Type', key: 'type', width: 80 },
        { header: 'Statut', key: 'status', width: 80 },
        { header: 'Unité', key: 'unit', width: 80, formatter: (val) => val?.unitNumber || 'N/A' },
        { header: 'Créé par', key: 'createdBy', width: 100, formatter: (val) => val ? `${val.firstName} ${val.lastName}` : 'N/A' },
        { header: 'Description', key: 'description', width: 150 }
      ],
      filters: {
        ...(startDate && { 'Date début': new Date(startDate).toLocaleDateString('fr-FR') }),
        ...(endDate && { 'Date fin': new Date(endDate).toLocaleDateString('fr-FR') }),
        ...(status && { 'Statut': status }),
        ...(type && { 'Type': type })
      },
      statsGenerator: (data) => {
        return {
          'Total demandes': data.length,
          'En attente': data.filter(r => r.status === 'en_attente').length,
          'En cours': data.filter(r => r.status === 'en_cours').length,
          'Terminées': data.filter(r => r.status === 'termine').length
        };
      }
    };

    const filename = `demandes_export_${Date.now()}.pdf`;
    const filePath = path.join(exportsDir, filename);
    
    await generatePDFExport(requests, config, filePath);
    
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('[EXPORT] Erreur téléchargement:', err);
      }
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  } catch (error) {
    console.error('[EXPORT] Erreur export demandes PDF:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Export Excel des utilisateurs
 */
exports.exportUsersExcel = async (req, res) => {
  try {
    const {
      role,
      isActive,
      startDate,
      endDate,
      building,
      unit
    } = req.query;

    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    let users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    // Filtrer par building/unit si spécifié
    if (building || unit) {
      const Unit = require('../models/Unit');
      const unitQuery = {};
      if (building) unitQuery.building = building;
      if (unit) unitQuery._id = unit;

      const units = await Unit.find(unitQuery).select('proprietaire locataire').lean();
      const userIds = new Set();
      units.forEach(u => {
        if (u.proprietaire) userIds.add(u.proprietaire.toString());
        if (u.locataire) userIds.add(u.locataire.toString());
      });

      users = users.filter(u => userIds.has(u._id.toString()));
    }

    const config = {
      title: 'RAPPORT DES UTILISATEURS',
      sheetName: 'Utilisateurs',
      columns: [
        { header: 'ID', key: '_id', width: 25, formatter: (val) => val.toString().substring(0, 8) },
        { header: 'Prénom', key: 'firstName', width: 15 },
        { header: 'Nom', key: 'lastName', width: 15 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Téléphone', key: 'phone', width: 15 },
        { header: 'Rôle', key: 'role', width: 15 },
        { header: 'Actif', key: 'isActive', width: 10, formatter: (val) => val ? 'Oui' : 'Non' },
        { header: 'Date création', key: 'createdAt', width: 15, formatter: (val) => new Date(val).toLocaleDateString('fr-FR') },
        { header: 'Dernière connexion', key: 'lastLogin', width: 15, formatter: (val) => val ? new Date(val).toLocaleDateString('fr-FR') : 'Jamais' }
      ],
      filters: {
        ...(role && { 'Rôle': role }),
        ...(isActive !== undefined && { 'Actif': isActive === 'true' ? 'Oui' : 'Non' }),
        ...(startDate && { 'Date début': new Date(startDate).toLocaleDateString('fr-FR') }),
        ...(endDate && { 'Date fin': new Date(endDate).toLocaleDateString('fr-FR') })
      },
      statsGenerator: (data) => {
        const roleCounts = {};
        data.forEach(user => {
          roleCounts[user.role] = (roleCounts[user.role] || 0) + 1;
        });
        return {
          'Total utilisateurs': data.length,
          'Actifs': data.filter(u => u.isActive).length,
          'Inactifs': data.filter(u => !u.isActive).length,
          ...Object.entries(roleCounts).reduce((acc, [role, count]) => {
            acc[`${role}s`] = count;
            return acc;
          }, {})
        };
      }
    };

    const filename = `utilisateurs_export_${Date.now()}.xlsx`;
    const filePath = path.join(exportsDir, filename);
    
    await generateExcelExport(users, config, filePath);
    
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('[EXPORT] Erreur téléchargement:', err);
      }
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  } catch (error) {
    console.error('[EXPORT] Erreur export utilisateurs Excel:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Export PDF des utilisateurs
 */
exports.exportUsersPDF = async (req, res) => {
  try {
    const {
      role,
      isActive,
      startDate,
      endDate,
      building,
      unit
    } = req.query;

    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    let users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    if (building || unit) {
      const Unit = require('../models/Unit');
      const unitQuery = {};
      if (building) unitQuery.building = building;
      if (unit) unitQuery._id = unit;

      const units = await Unit.find(unitQuery).select('proprietaire locataire').lean();
      const userIds = new Set();
      units.forEach(u => {
        if (u.proprietaire) userIds.add(u.proprietaire.toString());
        if (u.locataire) userIds.add(u.locataire.toString());
      });

      users = users.filter(u => userIds.has(u._id.toString()));
    }

    const config = {
      title: 'RAPPORT DES UTILISATEURS',
      columns: [
        { header: 'Nom', key: 'lastName', width: 80 },
        { header: 'Prénom', key: 'firstName', width: 80 },
        { header: 'Email', key: 'email', width: 120 },
        { header: 'Rôle', key: 'role', width: 80 },
        { header: 'Actif', key: 'isActive', width: 60, formatter: (val) => val ? 'Oui' : 'Non' },
        { header: 'Date création', key: 'createdAt', width: 100, formatter: (val) => new Date(val).toLocaleDateString('fr-FR') }
      ],
      filters: {
        ...(role && { 'Rôle': role }),
        ...(isActive !== undefined && { 'Actif': isActive === 'true' ? 'Oui' : 'Non' })
      },
      statsGenerator: (data) => {
        return {
          'Total utilisateurs': data.length,
          'Actifs': data.filter(u => u.isActive).length,
          'Inactifs': data.filter(u => !u.isActive).length
        };
      }
    };

    const filename = `utilisateurs_export_${Date.now()}.pdf`;
    const filePath = path.join(exportsDir, filename);
    
    await generatePDFExport(users, config, filePath);
    
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('[EXPORT] Erreur téléchargement:', err);
      }
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  } catch (error) {
    console.error('[EXPORT] Erreur export utilisateurs PDF:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Obtenir les modèles d'export disponibles
 */
exports.getExportTemplates = async (req, res) => {
  try {
    const templates = {
      requests: {
        name: 'Demandes',
        formats: ['excel', 'pdf'],
        filters: ['startDate', 'endDate', 'status', 'type', 'building', 'unit', 'priority'],
        columns: [
          { key: '_id', label: 'ID', default: true },
          { key: 'createdAt', label: 'Date', default: true },
          { key: 'type', label: 'Type', default: true },
          { key: 'status', label: 'Statut', default: true },
          { key: 'priority', label: 'Priorité', default: false },
          { key: 'building', label: 'Immeuble', default: true },
          { key: 'unit', label: 'Unité', default: true },
          { key: 'createdBy', label: 'Créé par', default: true },
          { key: 'description', label: 'Description', default: false }
        ]
      },
      users: {
        name: 'Utilisateurs',
        formats: ['excel', 'pdf'],
        filters: ['role', 'isActive', 'startDate', 'endDate', 'building', 'unit'],
        columns: [
          { key: '_id', label: 'ID', default: true },
          { key: 'firstName', label: 'Prénom', default: true },
          { key: 'lastName', label: 'Nom', default: true },
          { key: 'email', label: 'Email', default: true },
          { key: 'phone', label: 'Téléphone', default: false },
          { key: 'role', label: 'Rôle', default: true },
          { key: 'isActive', label: 'Actif', default: true },
          { key: 'createdAt', label: 'Date création', default: false },
          { key: 'lastLogin', label: 'Dernière connexion', default: false }
        ]
      },
      payments: {
        name: 'Paiements',
        formats: ['excel', 'pdf'],
        filters: ['startDate', 'endDate', 'status', 'type'],
        columns: [
          { key: 'createdAt', label: 'Date', default: true },
          { key: 'payer', label: 'Payeur', default: true },
          { key: 'amount', label: 'Montant', default: true },
          { key: 'status', label: 'Statut', default: true },
          { key: 'type', label: 'Type', default: true }
        ]
      },
      units: {
        name: 'Unités',
        formats: ['excel', 'pdf'],
        filters: ['building', 'status', 'type'],
        columns: [
          { key: 'unitNumber', label: 'Numéro', default: true },
          { key: 'building', label: 'Immeuble', default: true },
          { key: 'type', label: 'Type', default: true },
          { key: 'status', label: 'Statut', default: true },
          { key: 'rentPrice', label: 'Loyer', default: true }
        ]
      }
    };

    res.status(200).json({
      success: true,
      data: templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

