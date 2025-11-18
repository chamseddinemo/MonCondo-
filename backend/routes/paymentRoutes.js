const express = require('express');
const router = express.Router();
const {
  getPayments,
  getPayment,
  createPayment,
  updatePayment,
  deletePayment,
  processPayment,
  createStripeIntent,
  confirmStripePayment,
  createInteracInstructions,
  createBankTransferInstructions,
  getNextDuePayment,
  getOverduePayments,
  getPaymentStats,
  generateReceipt,
  generatePaymentReport,
  generatePaymentReportExcel
} = require('../controllers/paymentController');
const { protect } = require('../middlewares/auth');
const roleAuth = require('../middlewares/roleAuth');
const authorizePayment = require('../middlewares/authorizePayment');

// Toutes les routes nécessitent une authentification
router.use(protect);

// Routes spécifiques AVANT les routes génériques /:id
// IMPORTANT: L'ordre est critique - Express match les routes dans l'ordre

// Routes avec segments multiples - EN PREMIER
router.post('/:id/process', processPayment);
router.post('/:id/stripe/create-intent', createStripeIntent);
router.post('/:id/stripe/confirm', confirmStripePayment);
router.post('/:id/interac/instructions', createInteracInstructions);
router.post('/:id/bank-transfer/instructions', createBankTransferInstructions);
router.get('/:id/receipt', generateReceipt);

// Routes avec segments simples
router.get('/stats', getPaymentStats);
router.get('/next-due', getNextDuePayment); // Pour locataires
router.get('/overdue/all', roleAuth('admin'), getOverduePayments);
router.get('/report/pdf', roleAuth('admin'), generatePaymentReport);
router.get('/report/excel', roleAuth('admin'), generatePaymentReportExcel);

// Routes racine - DOIVENT être définies AVANT /:id
router.get('/', getPayments);
// Route POST / pour créer un paiement
// Autorise les rôles: admin, proprietaire, locataire
// La sécurité est assurée dans le contrôleur (vérification que le payeur = utilisateur et relation unité)
router.post('/', authorizePayment, createPayment);

// Routes génériques - EN DERNIER
router.get('/:id', getPayment);
router.put('/:id', roleAuth('admin'), updatePayment);
router.delete('/:id', roleAuth('admin'), deletePayment);

module.exports = router;

