const LoanSimulation = require('../models/LoanSimulation');
const { calculateLoanSimulation, validateLoanInputs } = require('../utils/loanCalculator');

/**
 * @desc    Calculer une simulation de prêt (sans sauvegarde)
 * @route   POST /api/loans/calculate
 * @access  Private (admin, proprietaire, visiteur)
 */
exports.calculateLoan = async (req, res) => {
  try {
    const calculationResult = calculateLoanSimulation(req.body);
    
    res.status(200).json({
      success: true,
      data: calculationResult
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors du calcul de la simulation'
    });
  }
};

/**
 * @desc    Créer et sauvegarder une simulation de prêt
 * @route   POST /api/loans/simulations
 * @access  Private (admin, proprietaire, visiteur)
 */
exports.createSimulation = async (req, res) => {
  try {
    // Vérifier que l'utilisateur n'est pas locataire
    if (req.user.role === 'locataire') {
      return res.status(403).json({
        success: false,
        message: 'Les locataires ne peuvent pas créer de simulations de prêt'
      });
    }
    
    const calculationResult = calculateLoanSimulation(req.body);
    
    const simulationData = {
      createdBy: req.user._id,
      userRole: req.user.role,
      propertyAmount: req.body.propertyAmount,
      downPayment: req.body.downPayment,
      loanAmount: calculationResult.loanAmount,
      interestRate: req.body.interestRate,
      interestType: req.body.interestType || 'fixe',
      loanDurationMonths: req.body.loanDurationMonths || (req.body.loanDurationYears * 12),
      loanDurationYears: calculationResult.loanDurationYears,
      additionalFees: req.body.additionalFees || {},
      monthlyPayment: calculationResult.monthlyPayment,
      totalInterest: calculationResult.totalInterest,
      totalCost: calculationResult.totalCost,
      amortizationSchedule: calculationResult.amortizationSchedule,
      title: req.body.title || 'Simulation de prêt',
      notes: req.body.notes || '',
      isSaved: req.body.isSaved || false,
      isFavorite: req.body.isFavorite || false
    };
    
    const simulation = await LoanSimulation.create(simulationData);
    
    // Populate les informations utilisateur
    const populatedSimulation = await LoanSimulation.findById(simulation._id)
      .populate('createdBy', 'firstName lastName email role')
      .lean();
    
    // Émettre un événement Socket.io pour synchronisation temps réel
    if (req.io) {
      req.io.emit('loanSimulation:created', {
        simulationId: simulation._id,
        userId: req.user._id,
        userRole: req.user.role,
        simulation: populatedSimulation
      });
      
      // Notifier spécifiquement l'admin
      req.io.to('admin').emit('loanSimulation:new', {
        simulationId: simulation._id,
        userId: req.user._id,
        userRole: req.user.role,
        simulation: populatedSimulation
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Simulation créée avec succès',
      data: populatedSimulation
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la création de la simulation'
    });
  }
};

/**
 * @desc    Obtenir toutes les simulations de l'utilisateur
 * @route   GET /api/loans/simulations
 * @access  Private (admin, proprietaire, visiteur)
 */
exports.getUserSimulations = async (req, res) => {
  try {
    // Vérifier que l'utilisateur n'est pas locataire
    if (req.user.role === 'locataire') {
      return res.status(403).json({
        success: false,
        message: 'Les locataires ne peuvent pas accéder aux simulations de prêt'
      });
    }
    
    const query = { createdBy: req.user._id };
    
    // Filtrer par statut sauvegardé si demandé
    if (req.query.saved !== undefined) {
      query.isSaved = req.query.saved === 'true';
    }
    
    // Filtrer par favoris si demandé
    if (req.query.favorite !== undefined) {
      query.isFavorite = req.query.favorite === 'true';
    }
    
    const simulations = await LoanSimulation.find(query)
      .populate('createdBy', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .lean();
    
    res.status(200).json({
      success: true,
      count: simulations.length,
      data: simulations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des simulations'
    });
  }
};

/**
 * @desc    Obtenir toutes les simulations (admin uniquement)
 * @route   GET /api/loans/simulations/all
 * @access  Private/Admin
 */
exports.getAllSimulations = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux administrateurs'
      });
    }
    
    const query = {};
    
    // Filtres optionnels
    if (req.query.userRole) {
      query.userRole = req.query.userRole;
    }
    
    if (req.query.userId) {
      query.createdBy = req.query.userId;
    }
    
    if (req.query.saved !== undefined) {
      query.isSaved = req.query.saved === 'true';
    }
    
    const simulations = await LoanSimulation.find(query)
      .populate('createdBy', 'firstName lastName email role phone')
      .sort({ createdAt: -1 })
      .lean();
    
    res.status(200).json({
      success: true,
      count: simulations.length,
      data: simulations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des simulations'
    });
  }
};

/**
 * @desc    Obtenir une simulation par ID
 * @route   GET /api/loans/simulations/:id
 * @access  Private
 */
exports.getSimulationById = async (req, res) => {
  try {
    const simulation = await LoanSimulation.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email role')
      .lean();
    
    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulation non trouvée'
      });
    }
    
    // Vérifier les permissions
    if (req.user.role !== 'admin' && simulation.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas accès à cette simulation'
      });
    }
    
    res.status(200).json({
      success: true,
      data: simulation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération de la simulation'
    });
  }
};

/**
 * @desc    Mettre à jour une simulation
 * @route   PUT /api/loans/simulations/:id
 * @access  Private
 */
exports.updateSimulation = async (req, res) => {
  try {
    const simulation = await LoanSimulation.findById(req.params.id);
    
    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulation non trouvée'
      });
    }
    
    // Vérifier les permissions
    if (req.user.role !== 'admin' && simulation.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission de modifier cette simulation'
      });
    }
    
    // Si les données du prêt changent, recalculer
    if (req.body.propertyAmount || req.body.downPayment || req.body.interestRate || req.body.loanDurationMonths) {
      const updatedData = {
        ...simulation.toObject(),
        ...req.body
      };
      const calculationResult = calculateLoanSimulation(updatedData);
      
      req.body.monthlyPayment = calculationResult.monthlyPayment;
      req.body.totalInterest = calculationResult.totalInterest;
      req.body.totalCost = calculationResult.totalCost;
      req.body.amortizationSchedule = calculationResult.amortizationSchedule;
      req.body.loanAmount = calculationResult.loanAmount;
      req.body.loanDurationYears = calculationResult.loanDurationYears;
    }
    
    const updatedSimulation = await LoanSimulation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName email role').lean();
    
    // Émettre un événement Socket.io
    if (req.io) {
      req.io.emit('loanSimulation:updated', {
        simulationId: updatedSimulation._id,
        userId: req.user._id,
        simulation: updatedSimulation
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Simulation mise à jour avec succès',
      data: updatedSimulation
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Erreur lors de la mise à jour de la simulation'
    });
  }
};

/**
 * @desc    Supprimer une simulation
 * @route   DELETE /api/loans/simulations/:id
 * @access  Private
 */
exports.deleteSimulation = async (req, res) => {
  try {
    const simulation = await LoanSimulation.findById(req.params.id);
    
    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulation non trouvée'
      });
    }
    
    // Vérifier les permissions
    if (req.user.role !== 'admin' && simulation.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission de supprimer cette simulation'
      });
    }
    
    await LoanSimulation.findByIdAndDelete(req.params.id);
    
    // Émettre un événement Socket.io
    if (req.io) {
      req.io.emit('loanSimulation:deleted', {
        simulationId: req.params.id,
        userId: req.user._id
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Simulation supprimée avec succès'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression de la simulation'
    });
  }
};

/**
 * @desc    Obtenir les statistiques des simulations (admin uniquement)
 * @route   GET /api/loans/statistics
 * @access  Private/Admin
 */
exports.getStatistics = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé aux administrateurs'
      });
    }
    
    const totalSimulations = await LoanSimulation.countDocuments();
    const simulationsByRole = await LoanSimulation.aggregate([
      {
        $group: {
          _id: '$userRole',
          count: { $sum: 1 },
          avgLoanAmount: { $avg: '$loanAmount' },
          avgMonthlyPayment: { $avg: '$monthlyPayment' }
        }
      }
    ]);
    
    const recentSimulations = await LoanSimulation.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('createdBy', 'firstName lastName email')
      .lean();
    
    res.status(200).json({
      success: true,
      data: {
        totalSimulations,
        simulationsByRole,
        recentSimulations
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des statistiques'
    });
  }
};

/**
 * @desc    Exporter une simulation en PDF
 * @route   GET /api/loans/simulations/:id/export/pdf
 * @access  Private
 */
exports.exportSimulationPDF = async (req, res) => {
  try {
    const simulation = await LoanSimulation.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .lean();
    
    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulation non trouvée'
      });
    }
    
    // Vérifier les permissions
    if (req.user.role !== 'admin' && simulation.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas accès à cette simulation'
      });
    }
    
    const { generatePDFExport } = require('../services/exportService');
    const path = require('path');
    const fs = require('fs');
    
    const exportsDir = path.join(__dirname, '../../uploads/exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    const outputPath = path.join(exportsDir, `simulation-${simulation._id}-${Date.now()}.pdf`);
    
    // Préparer les données pour l'export
    const exportData = [
      {
        'Mois': 'Résumé',
        'Mensualité': `$${simulation.monthlyPayment.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}`,
        'Capital': `$${simulation.loanAmount.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}`,
        'Intérêts': `$${simulation.totalInterest.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}`,
        'Solde restant': `$${simulation.loanAmount.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}`
      },
      ...simulation.amortizationSchedule.slice(0, 100).map(item => ({
        'Mois': item.month,
        'Mensualité': `$${item.payment.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}`,
        'Capital': `$${item.principal.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}`,
        'Intérêts': `$${item.interest.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}`,
        'Solde restant': `$${item.remainingBalance.toLocaleString('fr-CA', { minimumFractionDigits: 2 })}`
      }))
    ];
    
    await generatePDFExport(exportData, {
      title: `SIMULATION DE PRÊT - ${simulation.title || 'Sans titre'}`,
      companyName: 'MonCondo+',
      filters: {
        'Utilisateur': `${simulation.createdBy.firstName} ${simulation.createdBy.lastName}`,
        'Montant du bien': `$${simulation.propertyAmount.toLocaleString('fr-CA')}`,
        'Apport': `$${simulation.downPayment.toLocaleString('fr-CA')}`,
        'Taux': `${simulation.interestRate}%`,
        'Durée': `${simulation.loanDurationYears} ans`
      }
    }, outputPath);
    
    res.download(outputPath, `simulation-pret-${simulation._id}.pdf`, (err) => {
      if (err) {
        console.error('Erreur téléchargement PDF:', err);
      }
      // Nettoyer le fichier après téléchargement
      setTimeout(() => {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      }, 5000);
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'export PDF'
    });
  }
};

/**
 * @desc    Exporter une simulation en Excel
 * @route   GET /api/loans/simulations/:id/export/excel
 * @access  Private
 */
exports.exportSimulationExcel = async (req, res) => {
  try {
    const simulation = await LoanSimulation.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .lean();
    
    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: 'Simulation non trouvée'
      });
    }
    
    // Vérifier les permissions
    if (req.user.role !== 'admin' && simulation.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas accès à cette simulation'
      });
    }
    
    const { generateExcelExport } = require('../services/exportService');
    const path = require('path');
    const fs = require('fs');
    
    const exportsDir = path.join(__dirname, '../../uploads/exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    const outputPath = path.join(exportsDir, `simulation-${simulation._id}-${Date.now()}.xlsx`);
    
    // Préparer les données pour l'export
    const exportData = [
      {
        'Mois': 'Résumé',
        'Mensualité': simulation.monthlyPayment,
        'Capital': simulation.loanAmount,
        'Intérêts': simulation.totalInterest,
        'Solde restant': simulation.loanAmount
      },
      ...simulation.amortizationSchedule.map(item => ({
        'Mois': item.month,
        'Mensualité': item.payment,
        'Capital': item.principal,
        'Intérêts': item.interest,
        'Solde restant': item.remainingBalance
      }))
    ];
    
    await generateExcelExport(exportData, {
      title: `SIMULATION DE PRÊT - ${simulation.title || 'Sans titre'}`,
      companyName: 'MonCondo+',
      filters: {
        'Utilisateur': `${simulation.createdBy.firstName} ${simulation.createdBy.lastName}`,
        'Montant du bien': `$${simulation.propertyAmount.toLocaleString('fr-CA')}`,
        'Apport': `$${simulation.downPayment.toLocaleString('fr-CA')}`,
        'Taux': `${simulation.interestRate}%`,
        'Durée': `${simulation.loanDurationYears} ans`
      }
    }, outputPath);
    
    res.download(outputPath, `simulation-pret-${simulation._id}.xlsx`, (err) => {
      if (err) {
        console.error('Erreur téléchargement Excel:', err);
      }
      // Nettoyer le fichier après téléchargement
      setTimeout(() => {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      }, 5000);
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'export Excel'
    });
  }
};

