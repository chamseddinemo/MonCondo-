const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

/**
 * Génère un fichier Excel pour les rapports de paiements
 * @param {Array} payments - Liste des paiements
 * @param {Object} filters - Filtres appliqués
 * @param {String} outputPath - Chemin de sortie pour le fichier Excel
 * @returns {Promise<String>} - Chemin du fichier Excel généré
 */
async function generatePaymentReportExcel(payments, filters, outputPath) {
  return new Promise(async (resolve, reject) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Rapport de paiements');

      // Styles
      const headerStyle = {
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2563EB' }
        },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      };

      const titleStyle = {
        font: { bold: true, size: 16 },
        alignment: { horizontal: 'center' }
      };

      // Titre
      worksheet.mergeCells('A1:H1');
      worksheet.getCell('A1').value = 'RAPPORT DE PAIEMENTS';
      worksheet.getCell('A1').style = titleStyle;

      // Période
      if (filters.startDate || filters.endDate) {
        worksheet.mergeCells('A2:H2');
        let periodText = 'Période: ';
        if (filters.startDate && filters.endDate) {
          periodText += `${new Date(filters.startDate).toLocaleDateString('fr-FR')} - ${new Date(filters.endDate).toLocaleDateString('fr-FR')}`;
        } else if (filters.startDate) {
          periodText += `À partir de ${new Date(filters.startDate).toLocaleDateString('fr-FR')}`;
        } else if (filters.endDate) {
          periodText += `Jusqu'à ${new Date(filters.endDate).toLocaleDateString('fr-FR')}`;
        }
        worksheet.getCell('A2').value = periodText;
        worksheet.getCell('A2').style = { alignment: { horizontal: 'center' } };
      }

      // Date de génération
      worksheet.mergeCells('A3:H3');
      worksheet.getCell('A3').value = `Généré le: ${new Date().toLocaleString('fr-FR')}`;
      worksheet.getCell('A3').style = { alignment: { horizontal: 'center' }, font: { italic: true } };

      // Ligne vide
      worksheet.getRow(4).height = 5;

      // Statistiques
      const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const paidCount = payments.filter(p => p.status === 'paye').length;
      const pendingCount = payments.filter(p => p.status === 'en_attente').length;
      const overdueCount = payments.filter(p => p.status === 'en_retard').length;
      const paidAmount = payments.filter(p => p.status === 'paye').reduce((sum, p) => sum + (p.amount || 0), 0);

      worksheet.mergeCells('A5:H5');
      worksheet.getCell('A5').value = 'STATISTIQUES';
      worksheet.getCell('A5').style = { font: { bold: true, size: 14 } };

      worksheet.getCell('A6').value = 'Total des paiements:';
      worksheet.getCell('B6').value = payments.length;
      worksheet.getCell('A7').value = 'Montant total:';
      worksheet.getCell('B7').value = totalAmount.toFixed(2);
      worksheet.getCell('B7').numFmt = '#,##0.00';
      worksheet.getCell('A8').value = 'Payés:';
      worksheet.getCell('B8').value = paidCount;
      worksheet.getCell('C8').value = `(${paidAmount.toFixed(2)} $CAD)`;
      worksheet.getCell('A9').value = 'En attente:';
      worksheet.getCell('B9').value = pendingCount;
      worksheet.getCell('A10').value = 'En retard:';
      worksheet.getCell('B10').value = overdueCount;

      // Ligne vide
      worksheet.getRow(11).height = 5;

      // En-têtes du tableau
      const headers = [
        'Date',
        'Payeur',
        'Email',
        'Unité',
        'Type',
        'Montant ($CAD)',
        'Méthode',
        'Statut'
      ];

      const headerRow = worksheet.getRow(12);
      headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.style = headerStyle;
      });
      headerRow.height = 25;

      // Données
      payments.forEach((payment, index) => {
        const row = worksheet.getRow(13 + index);
        
        const payerName = payment.payer 
          ? `${payment.payer.firstName || ''} ${payment.payer.lastName || ''}`.trim()
          : 'N/A';
        const payerEmail = payment.payer?.email || 'N/A';
        const unitNumber = payment.unit?.unitNumber || 'N/A';
        const paymentType = payment.type || 'N/A';
        const amount = payment.amount || 0;
        
        const paymentMethodMap = {
          'stripe': 'Carte (Stripe)',
          'paypal': 'PayPal',
          'interac': 'Interac',
          'apple_pay': 'Apple Pay',
          'google_pay': 'Google Pay',
          'carte_credit': 'Carte de crédit',
          'virement': 'Virement',
          'cheque': 'Chèque',
          'en_ligne': 'En ligne',
          'moneris': 'Moneris',
          'autre': 'Autre'
        };
        const method = paymentMethodMap[payment.paymentMethod || payment.paymentProvider] || 'Autre';
        
        const statusMap = {
          'paye': 'Payé',
          'en_attente': 'En attente',
          'en_retard': 'En retard',
          'annule': 'Annulé'
        };
        const status = statusMap[payment.status] || payment.status;

        row.getCell(1).value = new Date(payment.createdAt).toLocaleDateString('fr-FR');
        row.getCell(2).value = payerName;
        row.getCell(3).value = payerEmail;
        row.getCell(4).value = unitNumber;
        row.getCell(5).value = paymentType;
        row.getCell(6).value = amount;
        row.getCell(6).numFmt = '#,##0.00';
        row.getCell(7).value = method;
        row.getCell(8).value = status;

        // Style alterné
        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' }
          };
        }
      });

      // Ajuster la largeur des colonnes
      worksheet.columns.forEach((column, index) => {
        let maxLength = 10;
        column.eachCell({ includeEmpty: false }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 30);
      });

      // Ligne de total
      const totalRow = worksheet.getRow(13 + payments.length);
      totalRow.getCell(5).value = 'TOTAL:';
      totalRow.getCell(5).style = { font: { bold: true } };
      totalRow.getCell(6).value = totalAmount;
      totalRow.getCell(6).numFmt = '#,##0.00';
      totalRow.getCell(6).style = { font: { bold: true } };

      // Sauvegarder le fichier
      await workbook.xlsx.writeFile(outputPath);
      resolve(outputPath);
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generatePaymentReportExcel
};

