const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Génère un bail de location
 * @param {Object} request - Demande avec toutes les informations
 * @param {Object} unit - Unité avec toutes les informations
 * @param {Object} building - Immeuble avec toutes les informations
 * @param {Object} tenant - Locataire avec toutes les informations
 * @param {Object} owner - Propriétaire avec toutes les informations
 * @returns {Promise<Object>} - Document généré avec chemin et nom de fichier
 */
async function generateLeaseAgreement(request, unit, building, tenant, owner) {
  try {
    // Créer le dossier documents s'il n'existe pas
    const documentsDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
    }

    // Nom du fichier
    const filename = `bail_${unit.unitNumber}_${tenant.lastName}_${Date.now()}.pdf`;
    const filePath = path.join(documentsDir, filename);

    // Données du contrat
    const contractStartDate = new Date();
    contractStartDate.setMonth(contractStartDate.getMonth() + 1); // Début du mois prochain
    const contractEndDate = new Date(contractStartDate);
    contractEndDate.setFullYear(contractEndDate.getFullYear() + 1); // Durée de 1 an

    const contractData = {
      proprietaire: {
        name: `${owner.firstName} ${owner.lastName}`,
        email: owner.email,
        phone: owner.phone
      },
      locataire: {
        name: `${tenant.firstName} ${tenant.lastName}`,
        email: tenant.email,
        phone: tenant.phone
      },
      buildingName: building.name,
      buildingAddress: building.address,
      unitNumber: unit.unitNumber,
      unitType: unit.type,
      size: unit.size,
      bedrooms: unit.bedrooms,
      rentAmount: unit.rentPrice || 0,
      monthlyCharges: unit.monthlyCharges || 0,
      contractStartDate: contractStartDate,
      contractEndDate: contractEndDate
    };

    // Générer le PDF
    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // En-tête
      doc.fontSize(20).text('BAIL DE LOCATION', { align: 'center' });
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
      
      stream.on('finish', () => resolve());
      stream.on('error', (error) => reject(error));
    });

    return {
      success: true,
      filename: filename,
      path: filePath,
      type: 'bail',
      generatedAt: new Date()
    };
  } catch (error) {
    console.error('[DOCUMENT SERVICE] Erreur génération bail:', error);
    throw error;
  }
}

/**
 * Génère un contrat de vente
 * @param {Object} request - Demande avec toutes les informations
 * @param {Object} unit - Unité avec toutes les informations
 * @param {Object} building - Immeuble avec toutes les informations
 * @param {Object} buyer - Acheteur avec toutes les informations
 * @param {Object} seller - Vendeur avec toutes les informations
 * @returns {Promise<Object>} - Document généré avec chemin et nom de fichier
 */
async function generateSaleAgreement(request, unit, building, buyer, seller) {
  try {
    // Créer le dossier documents s'il n'existe pas
    const documentsDir = path.join(__dirname, '../uploads/documents');
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true });
    }

    // Nom du fichier
    const filename = `contrat_vente_${unit.unitNumber}_${buyer.lastName}_${Date.now()}.pdf`;
    const filePath = path.join(documentsDir, filename);

    // Créer le document PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // En-tête
    doc.fontSize(20).text('CONTRAT DE VENTE', { align: 'center' });
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
    doc.text('VENDEUR:', { underline: true });
    doc.text(`${seller.firstName} ${seller.lastName}`);
    doc.text(`Email: ${seller.email}`);
    if (seller.phone) {
      doc.text(`Téléphone: ${seller.phone}`);
    }
    doc.moveDown();
    doc.text('ACHETEUR:', { underline: true });
    doc.text(`${buyer.firstName} ${buyer.lastName}`);
    doc.text(`Email: ${buyer.email}`);
    if (buyer.phone) {
      doc.text(`Téléphone: ${buyer.phone}`);
    }
    doc.moveDown();

    // Informations de la propriété
    doc.fontSize(14).text('INFORMATIONS DE LA PROPRIÉTÉ', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Immeuble: ${building.name}`);
    if (building.address) {
      const address = typeof building.address === 'string' 
        ? building.address 
        : `${building.address.street || ''}, ${building.address.city || ''}, ${building.address.province || ''} ${building.address.postalCode || ''}`;
      doc.text(`Adresse: ${address}`);
    }
    doc.text(`Unité: ${unit.unitNumber}`);
    doc.text(`Type: ${unit.type}`);
    doc.text(`Superficie: ${unit.size} m²`);
    doc.text(`Nombre de chambres: ${unit.bedrooms}`);
    doc.moveDown();

    // Conditions de vente
    doc.fontSize(14).text('CONDITIONS DE VENTE', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Prix de vente: ${unit.salePrice.toFixed(2)} $CAD`);
    doc.text(`Acompte (10%): ${(unit.salePrice * 0.1).toFixed(2)} $CAD`);
    doc.text(`Solde restant: ${(unit.salePrice * 0.9).toFixed(2)} $CAD`);
    doc.moveDown();

    // Conditions générales
    doc.fontSize(14).text('CONDITIONS GÉNÉRALES', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text('1. L\'acheteur s\'engage à payer l\'acompte lors de la signature du contrat.');
    doc.text('2. Le solde doit être payé dans les 30 jours suivant la signature.');
    doc.text('3. Le transfert de propriété se fera après paiement complet.');
    doc.text('4. Toute modification doit être approuvée par les deux parties.');
    doc.moveDown();

    // Signature
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    doc.fontSize(11);
    doc.text('Signature du vendeur', 50, doc.y);
    doc.text('Signature de l\'acheteur', 300, doc.y);
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
    
    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        resolve({
          success: true,
          filename: filename,
          path: filePath,
          type: 'contrat_vente',
          generatedAt: new Date()
        });
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    });
  } catch (error) {
    console.error('[DOCUMENT SERVICE] Erreur génération contrat de vente:', error);
    throw error;
  }
}

module.exports = {
  generateLeaseAgreement,
  generateSaleAgreement
};

