const express = require('express');
const router = express.Router();
const {
  exportRequestsExcel,
  exportRequestsPDF,
  exportUsersExcel,
  exportUsersPDF,
  getExportTemplates
} = require('../controllers/exportController');
const { protect } = require('../middlewares/auth');
const roleAuth = require('../middlewares/roleAuth');

router.use(protect);

// Routes pour les exports de demandes
router.get('/requests/excel', exportRequestsExcel);
router.get('/requests/pdf', exportRequestsPDF);

// Routes pour les exports d'utilisateurs (admin seulement)
router.get('/users/excel', roleAuth('admin'), exportUsersExcel);
router.get('/users/pdf', roleAuth('admin'), exportUsersPDF);

// Route pour obtenir les modèles disponibles
router.get('/templates', getExportTemplates);

module.exports = router;

