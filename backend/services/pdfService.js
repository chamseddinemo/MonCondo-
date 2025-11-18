const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Génère un reçu PDF pour un paiement
 * @param {Object} payment - Paiement avec toutes les informations nécessaires
 * @param {String} outputPath - Chemin de sortie pour le PDF
 * @returns {Promise<String>} - Chemin du fichier PDF généré
 */
async function generateReceiptPDF(payment, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // En-tête
      doc.fontSize(20).text('REÇU DE PAIEMENT', { align: 'center' });
      doc.moveDown();
      
      // Numéro de reçu
      const receiptNumber = `REC-${payment._id.toString().substring(0, 8).toUpperCase()}`;
      doc.fontSize(12).text(`Numéro de reçu: ${receiptNumber}`, { align: 'right' });
      doc.moveDown(2);

      // Informations du payeur
      doc.fontSize(14).text('INFORMATIONS DU PAYEUR', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(`${payment.payer.firstName} ${payment.payer.lastName}`);
      doc.text(`Email: ${payment.payer.email}`);
      if (payment.payer.phone) {
        doc.text(`Téléphone: ${payment.payer.phone}`);
      }
      doc.moveDown();

      // Informations de la propriété
      doc.fontSize(14).text('INFORMATIONS DE LA PROPRIÉTÉ', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(`Immeuble: ${payment.building.name}`);
      if (payment.building.address) {
        doc.text(`Adresse: ${payment.building.address}`);
      }
      doc.text(`Unité: ${payment.unit.unitNumber}`);
      doc.moveDown();

      // Détails du paiement
      doc.fontSize(14).text('DÉTAILS DU PAIEMENT', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      
      const paymentTypeMap = {
        'loyer': 'Loyer',
        'charges': 'Charges',
        'achat': 'Achat',
        'service': 'Service',
        'autre': 'Autre'
      };
      
      doc.text(`Type: ${paymentTypeMap[payment.type] || payment.type}`);
      doc.text(`Montant: ${payment.amount.toFixed(2)} $CAD`);
      doc.text(`Date de paiement: ${new Date(payment.paidDate).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`);
      doc.text(`Date d'échéance: ${new Date(payment.dueDate).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`);
      
      const paymentMethodMap = {
        'stripe': 'Carte de crédit (Stripe)',
        'paypal': 'PayPal',
        'moneris': 'Moneris',
        'carte_credit': 'Carte de crédit',
        'virement': 'Virement bancaire',
        'cheque': 'Chèque',
        'en_ligne': 'Paiement en ligne',
        'autre': 'Autre'
      };
      
      doc.text(`Méthode de paiement: ${paymentMethodMap[payment.paymentMethod] || payment.paymentMethod}`);
      if (payment.transactionId || payment.providerTransactionId) {
        doc.text(`ID de transaction: ${payment.providerTransactionId || payment.transactionId}`);
      }
      doc.moveDown();

      // Période de facturation (si disponible)
      if (payment.billingPeriod && payment.billingPeriod.start && payment.billingPeriod.end) {
        doc.fontSize(14).text('PÉRIODE DE FACTURATION', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11);
        doc.text(`Du: ${new Date(payment.billingPeriod.start).toLocaleDateString('fr-FR')}`);
        doc.text(`Au: ${new Date(payment.billingPeriod.end).toLocaleDateString('fr-FR')}`);
        doc.moveDown();
      }

      // Description (si disponible)
      if (payment.description) {
        doc.fontSize(14).text('DESCRIPTION', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).text(payment.description);
        doc.moveDown();
      }

      // Notes (si disponibles)
      if (payment.notes) {
        doc.fontSize(14).text('NOTES', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).text(payment.notes);
        doc.moveDown();
      }

      // Ligne de séparation
      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Pied de page
      doc.fontSize(10).text('Ce document constitue un reçu officiel de paiement.', {
        align: 'center',
        color: '#666666'
      });
      doc.moveDown(0.5);
      doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, {
        align: 'center',
        color: '#666666'
      });

      doc.end();
      
      stream.on('finish', () => {
        resolve(outputPath);
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Génère un rapport PDF pour les paiements
 * @param {Array} payments - Liste des paiements
 * @param {Object} filters - Filtres appliqués
 * @param {String} outputPath - Chemin de sortie pour le PDF
 * @returns {Promise<String>} - Chemin du fichier PDF généré
 */
async function generatePaymentReportPDF(payments, filters, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // En-tête
      doc.fontSize(20).text('RAPPORT DE PAIEMENTS', { align: 'center' });
      doc.moveDown();
      
      // Période
      if (filters.startDate || filters.endDate) {
        doc.fontSize(12);
        if (filters.startDate && filters.endDate) {
          doc.text(`Période: ${new Date(filters.startDate).toLocaleDateString('fr-FR')} - ${new Date(filters.endDate).toLocaleDateString('fr-FR')}`, { align: 'right' });
        } else if (filters.startDate) {
          doc.text(`À partir de: ${new Date(filters.startDate).toLocaleDateString('fr-FR')}`, { align: 'right' });
        } else if (filters.endDate) {
          doc.text(`Jusqu'à: ${new Date(filters.endDate).toLocaleDateString('fr-FR')}`, { align: 'right' });
        }
      }
      doc.moveDown(2);

      // Statistiques
      const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const paidCount = payments.filter(p => p.status === 'paye').length;
      const pendingCount = payments.filter(p => p.status === 'en_attente').length;
      const overdueCount = payments.filter(p => p.status === 'en_retard').length;

      doc.fontSize(14).text('STATISTIQUES', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      doc.text(`Total des paiements: ${payments.length}`);
      doc.text(`Montant total: ${totalAmount.toFixed(2)} $CAD`);
      doc.text(`Payés: ${paidCount}`);
      doc.text(`En attente: ${pendingCount}`);
      doc.text(`En retard: ${overdueCount}`);
      doc.moveDown();

      // Tableau des paiements
      doc.fontSize(14).text('DÉTAILS DES PAIEMENTS', { underline: true });
      doc.moveDown(0.5);

      // En-têtes de colonnes
      const tableTop = doc.y;
      const itemHeight = 20;
      let y = tableTop;

      doc.fontSize(9);
      doc.text('Date', 50, y);
      doc.text('Payeur', 100, y);
      doc.text('Unité', 200, y);
      doc.text('Type', 250, y);
      doc.text('Montant', 300, y);
      doc.text('Statut', 370, y);
      
      // Ligne de séparation
      y += 10;
      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 5;

      // Lignes de données
      payments.forEach((payment, index) => {
        if (y > 750) { // Nouvelle page si nécessaire
          doc.addPage();
          y = 50;
        }

        const payerName = payment.payer ? `${payment.payer.firstName} ${payment.payer.lastName}` : 'N/A';
        const unitNumber = payment.unit ? payment.unit.unitNumber : 'N/A';
        const paymentType = payment.type || 'N/A';
        const amount = payment.amount ? payment.amount.toFixed(2) : '0.00';
        const statusMap = {
          'paye': 'Payé',
          'en_attente': 'En attente',
          'en_retard': 'En retard',
          'annule': 'Annulé'
        };
        const status = statusMap[payment.status] || payment.status;

        doc.fontSize(8);
        doc.text(new Date(payment.createdAt).toLocaleDateString('fr-FR'), 50, y, { width: 50 });
        doc.text(payerName, 100, y, { width: 100 });
        doc.text(unitNumber, 200, y, { width: 50 });
        doc.text(paymentType, 250, y, { width: 50 });
        doc.text(`${amount} $`, 300, y, { width: 70 });
        doc.text(status, 370, y, { width: 80 });

        y += itemHeight;
      });

      // Ligne de séparation finale
      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 10;

      // Total
      doc.fontSize(11);
      doc.text(`TOTAL: ${totalAmount.toFixed(2)} $CAD`, 300, y, { align: 'right' });

      // Pied de page
      doc.fontSize(10);
      doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, {
        align: 'center',
        color: '#666666'
      });

      doc.end();
      
      stream.on('finish', () => {
        resolve(outputPath);
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Génère un contrat de location PDF
 * @param {Object} contractData - Données du contrat
 * @param {String} outputPath - Chemin de sortie pour le PDF
 * @returns {Promise<String>} - Chemin du fichier PDF généré
 */
async function generateContractPDF(contractData, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // En-tête
      doc.fontSize(20).text('CONTRAT DE LOCATION', { align: 'center' });
      doc.moveDown();
      
      // Date du contrat
      doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, { align: 'right' });
      doc.moveDown(2);

      // Parties au contrat
      doc.fontSize(14).text('PARTIES AU CONTRAT', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      doc.text('PROPRIÉTAIRE:', { underline: true });
      doc.text(contractData.proprietaire.name);
      doc.text(`Email: ${contractData.proprietaire.email}`);
      if (contractData.proprietaire.phone) {
        doc.text(`Téléphone: ${contractData.proprietaire.phone}`);
      }
      doc.moveDown();
      doc.text('LOCATAIRE:', { underline: true });
      doc.text(contractData.locataire.name);
      doc.text(`Email: ${contractData.locataire.email}`);
      if (contractData.locataire.phone) {
        doc.text(`Téléphone: ${contractData.locataire.phone}`);
      }
      doc.moveDown();

      // Informations de la propriété
      doc.fontSize(14).text('INFORMATIONS DE LA PROPRIÉTÉ', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      doc.text(`Immeuble: ${contractData.buildingName}`);
      if (contractData.buildingAddress) {
        const address = typeof contractData.buildingAddress === 'string' 
          ? contractData.buildingAddress 
          : `${contractData.buildingAddress.street || ''}, ${contractData.buildingAddress.city || ''}`;
        doc.text(`Adresse: ${address}`);
      }
      doc.text(`Unité: ${contractData.unitNumber}`);
      doc.text(`Type: ${contractData.unitType}`);
      doc.text(`Superficie: ${contractData.size} m²`);
      doc.text(`Nombre de chambres: ${contractData.bedrooms}`);
      doc.moveDown();

      // Conditions de location
      doc.fontSize(14).text('CONDITIONS DE LOCATION', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      doc.text(`Loyer mensuel: ${contractData.rentAmount.toFixed(2)} $CAD`);
      if (contractData.monthlyCharges && contractData.monthlyCharges > 0) {
        doc.text(`Charges mensuelles: ${contractData.monthlyCharges.toFixed(2)} $CAD`);
        doc.text(`Total mensuel: ${(contractData.rentAmount + contractData.monthlyCharges).toFixed(2)} $CAD`);
      }
      doc.moveDown();
      doc.text('DURÉE DU CONTRAT:', { underline: true });
      doc.text(`Date de début: ${new Date(contractData.contractStartDate).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`);
      doc.text(`Date de fin: ${new Date(contractData.contractEndDate).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`);
      doc.moveDown();

      // Conditions générales
      doc.fontSize(14).text('CONDITIONS GÉNÉRALES', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text('1. Le locataire s\'engage à payer le loyer et les charges mensuellement.');
      doc.text('2. Le locataire doit maintenir la propriété en bon état.');
      doc.text('3. Toute modification doit être approuvée par le propriétaire.');
      doc.text('4. Le contrat peut être renouvelé par accord mutuel.');
      doc.moveDown();

      // Signature
      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();
      doc.fontSize(11);
      doc.text('Signature du propriétaire', 50, doc.y);
      doc.text('Signature du locataire', 300, doc.y);
      doc.moveDown(3);
      doc.moveTo(50, doc.y).lineTo(250, doc.y).stroke();
      doc.moveTo(300, doc.y).lineTo(500, doc.y).stroke();

      // Pied de page
      doc.fontSize(10);
      doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, {
        align: 'center',
        color: '#666666'
      });

      doc.end();
      
      stream.on('finish', () => {
        resolve(outputPath);
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateReceiptPDF,
  generatePaymentReportPDF,
  generateContractPDF
};


