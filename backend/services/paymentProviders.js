const axios = require('axios');

/**
 * Service pour gérer les différents fournisseurs de paiement
 */

// ==================== STRIPE ====================
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  } catch (error) {
    console.warn('[STRIPE] Erreur initialisation Stripe:', error.message);
  }
}

async function createStripePaymentIntent(amount, currency = 'cad', metadata = {}) {
  try {
    // Vérifier que Stripe est configuré
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.trim() === '') {
      console.warn('[STRIPE] STRIPE_SECRET_KEY non défini ou vide dans .env');
      return { 
        success: false, 
        error: 'Stripe n\'est pas configuré. Définissez STRIPE_SECRET_KEY dans le fichier .env pour activer les paiements par carte.',
        code: 'STRIPE_NOT_CONFIGURED'
      };
    }

    if (!stripe) {
      console.warn('[STRIPE] Module Stripe non initialisé');
      return { 
        success: false, 
        error: 'Stripe n\'est pas configuré. Définissez STRIPE_SECRET_KEY dans le fichier .env pour activer les paiements par carte.',
        code: 'STRIPE_NOT_CONFIGURED'
      };
    }

    // Valider le montant
    if (!amount || isNaN(amount) || amount <= 0) {
      console.error('[STRIPE] Montant invalide:', amount);
      return { success: false, error: 'Le montant doit être un nombre supérieur à 0' };
    }

    // Convertir le montant en centimes (entier)
    const amountInCents = Math.round(parseFloat(amount) * 100);
    
    if (amountInCents < 50) { // Minimum Stripe est 0.50 CAD
      console.error('[STRIPE] Montant trop faible:', amountInCents);
      return { success: false, error: 'Le montant minimum est de 0.50 $CAD' };
    }

    // Préparer la description
    let description = 'Paiement MonCondo+';
    if (metadata.unitNumber) {
      description += ` - Unité ${metadata.unitNumber}`;
    } else if (metadata.type) {
      description += ` - ${metadata.type}`;
    }

    // Créer le PaymentIntent avec toutes les informations nécessaires
    const paymentIntentParams = {
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: {
        ...metadata,
        application: 'MonCondo+',
        created_at: new Date().toISOString()
      },
      automatic_payment_methods: {
        enabled: true,
      },
      description: description,
    };

    // Ajouter le statement_descriptor si disponible (max 22 caractères)
    if (process.env.STRIPE_STATEMENT_DESCRIPTOR) {
      paymentIntentParams.statement_descriptor = String(process.env.STRIPE_STATEMENT_DESCRIPTOR).substring(0, 22);
    } else {
      paymentIntentParams.statement_descriptor = 'MONCONDO+';
    }

    console.log('[STRIPE] Création PaymentIntent avec params:', {
      amount: paymentIntentParams.amount,
      currency: paymentIntentParams.currency,
      description: paymentIntentParams.description,
      statement_descriptor: paymentIntentParams.statement_descriptor
    });

    // Créer le PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
    
    console.log('[STRIPE] PaymentIntent créé avec succès:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      client_secret: paymentIntent.client_secret ? 'présent' : 'absent'
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amount,
      currency: currency
    };
  } catch (error) {
    console.error('[STRIPE] Erreur création PaymentIntent:', error);
    console.error('[STRIPE] Type d\'erreur:', error.type);
    console.error('[STRIPE] Code d\'erreur:', error.code);
    
    // Retourner un message d'erreur clair selon le type d'erreur
    if (error.type === 'StripeAuthenticationError' || error.code === 'api_key_invalid') {
      return { 
        success: false, 
        error: 'Erreur d\'authentification Stripe. Vérifiez votre clé API (STRIPE_SECRET_KEY) dans le fichier .env' 
      };
    }
    
    if (error.type === 'StripeInvalidRequestError') {
      return { 
        success: false, 
        error: `Erreur de requête Stripe: ${error.message || 'Paramètres invalides'}` 
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Erreur lors de la création du PaymentIntent Stripe' 
    };
  }
}

async function confirmStripePayment(paymentIntentId) {
  try {
    if (!stripe || !process.env.STRIPE_SECRET_KEY) {
      return { success: false, error: 'Stripe n\'est pas configuré. Définissez STRIPE_SECRET_KEY dans .env' };
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        chargeId: paymentIntent.latest_charge,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency
      };
    }

    return { success: false, error: 'Le paiement n\'a pas été confirmé' };
  } catch (error) {
    console.error('[STRIPE] Erreur confirmation paiement:', error);
    return { success: false, error: error.message };
  }
}

// ==================== INTERAC ====================
// Liste des banques canadiennes principales
const CANADIAN_BANKS = [
  { code: 'RBC', name: 'Banque Royale du Canada (RBC)', shortName: 'RBC' },
  { code: 'TD', name: 'Banque TD Canada Trust', shortName: 'TD' },
  { code: 'BMO', name: 'Banque de Montréal (BMO)', shortName: 'BMO' },
  { code: 'SCOTIA', name: 'Banque Scotia', shortName: 'Scotiabank' },
  { code: 'CIBC', name: 'Banque CIBC', shortName: 'CIBC' },
  { code: 'DESJARDINS', name: 'Mouvement Desjardins', shortName: 'Desjardins' },
  { code: 'NATIONAL', name: 'Banque Nationale du Canada', shortName: 'Banque Nationale' },
  { code: 'HSBC', name: 'HSBC Bank Canada', shortName: 'HSBC' },
  { code: 'TANGERINE', name: 'Tangerine', shortName: 'Tangerine' },
  { code: 'PC', name: 'Banque PC', shortName: 'PC Financial' },
  { code: 'AUTRE', name: 'Autre banque', shortName: 'Autre' }
];

function generateInteracInstructions(amount, paymentId, payerInfo, options = {}) {
  // Utiliser l'email du bénéficiaire depuis les options si disponible, sinon depuis l'env
  const defaultRecipientEmail = process.env.INTERAC_RECIPIENT_EMAIL || 'paiements@moncondo.com';
  const recipientEmail = options.recipientEmail || defaultRecipientEmail;
  const recipientPhone = options.recipientPhone || process.env.INTERAC_RECIPIENT_PHONE || '';
  const securityQuestion = process.env.INTERAC_SECURITY_QUESTION || 'Quel est le numéro de votre unité?';
  const securityAnswer = `UNIT${payerInfo.unitNumber}`;
  const referenceNumber = `INT-${paymentId.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  
  // Récupérer les options (banque, méthode de contact)
  const selectedBank = options.bank || 'AUTRE';
  const contactMethod = options.contactMethod || 'email'; // 'email' ou 'phone'
  const contactValue = contactMethod === 'email' ? recipientEmail : recipientPhone;
  
  // Trouver le nom de la banque
  const bankInfo = CANADIAN_BANKS.find(b => b.code === selectedBank) || CANADIAN_BANKS[CANADIAN_BANKS.length - 1];

  return {
    success: true,
    instructions: {
      recipientEmail: contactMethod === 'email' ? contactValue : recipientEmail,
      recipientPhone: contactMethod === 'phone' ? contactValue : recipientPhone,
      contactMethod,
      bank: bankInfo.name,
      bankCode: bankInfo.code,
      bankShortName: bankInfo.shortName,
      amount: amount.toFixed(2),
      securityQuestion,
      securityAnswer,
      message: `Paiement pour l'unité ${payerInfo.unitNumber} (${payerInfo.firstName} ${payerInfo.lastName})`,
      referenceNumber,
      steps: [
        'Connectez-vous à votre banque en ligne ou application mobile',
        `Sélectionnez "Interac e-Transfer" ou "Virement Interac"`,
        `Entrez le montant: ${amount.toFixed(2)} $CAD`,
        contactMethod === 'email' 
          ? `Envoyez à l'adresse email: ${contactValue}`
          : `Envoyez au numéro de téléphone: ${contactValue}`,
        `Question de sécurité: ${securityQuestion}`,
        `Réponse: ${securityAnswer}`,
        `Message (optionnel): Paiement pour l'unité ${payerInfo.unitNumber}`,
        'Confirmez le virement',
        'Une fois le virement effectué, revenez sur cette page et cliquez sur "Confirmer le paiement"'
      ]
    },
    referenceNumber,
    banks: CANADIAN_BANKS
  };
}

// ==================== VIREMENT BANCAIRE ====================
function generateBankTransferInstructions(amount, paymentId, recipientInfo) {
  const accountNumber = process.env.BANK_ACCOUNT_NUMBER || 'XXXX-XXXX-XXXX';
  const transitNumber = process.env.BANK_TRANSIT_NUMBER || 'XXXXX';
  const institutionNumber = process.env.BANK_INSTITUTION_NUMBER || 'XXX';
  const referenceNumber = `VIR-${paymentId.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  return {
    success: true,
    instructions: {
      accountNumber,
      transitNumber,
      institutionNumber,
      amount: amount.toFixed(2),
      referenceNumber,
      message: `Paiement pour ${recipientInfo.name || 'MonCondo+'}`,
      bankName: process.env.BANK_NAME || 'Banque'
    },
    referenceNumber
  };
}

module.exports = {
  // Stripe
  createStripePaymentIntent,
  confirmStripePayment,
  
  // Interac
  generateInteracInstructions,
  
  // Virement bancaire
  generateBankTransferInstructions
};

