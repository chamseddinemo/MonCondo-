const express = require('express');
const router = express.Router();
const {
  calculateLoan,
  createSimulation,
  getUserSimulations,
  getAllSimulations,
  getSimulationById,
  updateSimulation,
  deleteSimulation,
  getStatistics,
  exportSimulationPDF,
  exportSimulationExcel
} = require('../controllers/loanCalculatorController');
const { protect } = require('../middlewares/auth');
const roleAuth = require('../middlewares/roleAuth');

// Middleware pour passer l'instance Socket.io aux contrôleurs
const attachSocketIO = (req, res, next) => {
  req.io = req.app.get('io');
  next();
};

// Toutes les routes nécessitent une authentification
router.use(protect);
router.use(attachSocketIO);

// Route de calcul (sans sauvegarde)
router.post('/calculate', calculateLoan);

// Routes pour les simulations
router.post('/simulations', createSimulation);
router.get('/simulations', getUserSimulations);
router.get('/simulations/all', roleAuth('admin'), getAllSimulations);
router.get('/simulations/:id', getSimulationById);
router.put('/simulations/:id', updateSimulation);
router.delete('/simulations/:id', deleteSimulation);
router.get('/simulations/:id/export/pdf', exportSimulationPDF);
router.get('/simulations/:id/export/excel', exportSimulationExcel);

// Statistiques (admin uniquement)
router.get('/statistics', roleAuth('admin'), getStatistics);

console.log('[LOAN ROUTES] ✅ Routes de calculatrice de prêt chargées');

module.exports = router;

