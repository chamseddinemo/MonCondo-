/**
 * Service d'export générique pour Excel et PDF
 * Supporte les modèles personnalisables, filtres et logos
 */

const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Configuration par défaut pour les exports
 */
const DEFAULT_CONFIG = {
  logo: null,
  companyName: 'MonCondo+',
  companyAddress: '',
  colors: {
    primary: 'FF2563EB',
    secondary: 'FF64748B',
    header: 'FFFFFFFF',
    alternate: 'FFF9FAFB'
  },
  fonts: {
    title: { size: 16, bold: true },
    header: { size: 11, bold: true },
    body: { size: 10 }
  }
};

/**
 * Génère un export Excel avec modèle personnalisable
 * @param {Array} data - Données à exporter
 * @param {Object} config - Configuration de l'export
 * @param {String} outputPath - Chemin de sortie
 * @returns {Promise<String>} - Chemin du fichier généré
 */
async function generateExcelExport(data, config, outputPath) {
  return new Promise(async (resolve, reject) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(config.sheetName || 'Export');

      const exportConfig = { ...DEFAULT_CONFIG, ...config };

      // Styles
      const headerStyle = {
        font: { 
          bold: true, 
          color: { argb: exportConfig.colors.header },
          size: exportConfig.fonts.header.size
        },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: exportConfig.colors.primary }
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
        font: { 
          bold: true, 
          size: exportConfig.fonts.title.size 
        },
        alignment: { horizontal: 'center' }
      };

      let currentRow = 1;

      // Logo (si fourni)
      if (exportConfig.logo && fs.existsSync(exportConfig.logo)) {
        const logoId = workbook.addImage({
          filename: exportConfig.logo,
          extension: path.extname(exportConfig.logo).substring(1)
        });
        worksheet.addImage(logoId, {
          tl: { col: 0, row: 0 },
          ext: { width: 100, height: 50 }
        });
        currentRow = 3;
      }

      // Titre
      const titleCols = config.columns?.length || 1;
      worksheet.mergeCells(currentRow, 1, currentRow, titleCols);
      worksheet.getCell(currentRow, 1).value = exportConfig.title || 'EXPORT DE DONNÉES';
      worksheet.getCell(currentRow, 1).style = titleStyle;
      currentRow++;

      // Informations de l'entreprise
      if (exportConfig.companyName) {
        worksheet.mergeCells(currentRow, 1, currentRow, titleCols);
        worksheet.getCell(currentRow, 1).value = exportConfig.companyName;
        worksheet.getCell(currentRow, 1).style = { alignment: { horizontal: 'center' } };
        currentRow++;
      }

      // Filtres appliqués
      if (config.filters && Object.keys(config.filters).length > 0) {
        worksheet.mergeCells(currentRow, 1, currentRow, titleCols);
        const filterText = Object.entries(config.filters)
          .map(([key, value]) => `${key}: ${value}`)
          .join(' | ');
        worksheet.getCell(currentRow, 1).value = `Filtres: ${filterText}`;
        worksheet.getCell(currentRow, 1).style = { 
          alignment: { horizontal: 'center' },
          font: { italic: true }
        };
        currentRow++;
      }

      // Date de génération
      worksheet.mergeCells(currentRow, 1, currentRow, titleCols);
      worksheet.getCell(currentRow, 1).value = `Généré le: ${new Date().toLocaleString('fr-FR')}`;
      worksheet.getCell(currentRow, 1).style = { 
        alignment: { horizontal: 'center' },
        font: { italic: true }
      };
      currentRow += 2;

      // Statistiques (si configuré)
      if (config.showStats !== false && data.length > 0) {
        worksheet.mergeCells(currentRow, 1, currentRow, titleCols);
        worksheet.getCell(currentRow, 1).value = 'STATISTIQUES';
        worksheet.getCell(currentRow, 1).style = { font: { bold: true, size: 14 } };
        currentRow++;

        if (config.statsGenerator) {
          const stats = config.statsGenerator(data);
          Object.entries(stats).forEach(([key, value]) => {
            worksheet.getCell(currentRow, 1).value = `${key}:`;
            worksheet.getCell(currentRow, 2).value = value;
            currentRow++;
          });
        } else {
          worksheet.getCell(currentRow, 1).value = `Total d'enregistrements: ${data.length}`;
          currentRow++;
        }
        currentRow++;
      }

      // En-têtes du tableau
      const columns = config.columns || [];
      if (columns.length === 0 && data.length > 0) {
        // Générer automatiquement les colonnes depuis les données
        Object.keys(data[0]).forEach(key => {
          columns.push({
            header: key.charAt(0).toUpperCase() + key.slice(1),
            key: key,
            width: 15
          });
        });
      }

      const headerRow = worksheet.getRow(currentRow);
      columns.forEach((col, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = col.header || col.key;
        cell.style = headerStyle;
      });
      headerRow.height = 25;
      currentRow++;

      // Données
      data.forEach((item, index) => {
        const row = worksheet.getRow(currentRow);
        
        columns.forEach((col, colIndex) => {
          const cell = row.getCell(colIndex + 1);
          const value = col.formatter 
            ? col.formatter(item[col.key], item)
            : item[col.key] || '';
          
          cell.value = value;
          
          // Appliquer le format si spécifié
          if (col.numFmt) {
            cell.numFmt = col.numFmt;
          }
          
          // Style alterné
          if (index % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: exportConfig.colors.alternate }
            };
          }
        });
        
        currentRow++;
      });

      // Ajuster la largeur des colonnes
      columns.forEach((col, index) => {
        const column = worksheet.getColumn(index + 1);
        column.width = col.width || 15;
      });

      // Ligne de total (si configuré)
      if (config.totalColumn) {
        const totalRow = worksheet.getRow(currentRow);
        const totalColIndex = columns.findIndex(col => col.key === config.totalColumn);
        if (totalColIndex >= 0) {
          const total = data.reduce((sum, item) => {
            const value = item[config.totalColumn];
            return sum + (typeof value === 'number' ? value : 0);
          }, 0);
          
          totalRow.getCell(totalColIndex).value = total;
          totalRow.getCell(totalColIndex).numFmt = '#,##0.00';
          totalRow.getCell(totalColIndex).style = { font: { bold: true } };
          
          const labelColIndex = totalColIndex - 1;
          if (labelColIndex >= 0) {
            totalRow.getCell(labelColIndex).value = 'TOTAL:';
            totalRow.getCell(labelColIndex).style = { font: { bold: true } };
          }
        }
      }

      // Sauvegarder
      await workbook.xlsx.writeFile(outputPath);
      resolve(outputPath);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Génère un export PDF avec modèle personnalisable
 * @param {Array} data - Données à exporter
 * @param {Object} config - Configuration de l'export
 * @param {String} outputPath - Chemin de sortie
 * @returns {Promise<String>} - Chemin du fichier généré
 */
async function generatePDFExport(data, config, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const exportConfig = { ...DEFAULT_CONFIG, ...config };
      const doc = new PDFDocument({ 
        size: config.pageSize || 'A4', 
        margin: config.margin || 50 
      });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Logo (si fourni)
      if (exportConfig.logo && fs.existsSync(exportConfig.logo)) {
        doc.image(exportConfig.logo, 50, 50, { width: 100 });
        doc.y = 160;
      } else {
        doc.y = 50;
      }

      // Titre
      doc.fontSize(exportConfig.fonts.title.size)
         .font('Helvetica-Bold')
         .text(exportConfig.title || 'EXPORT DE DONNÉES', { align: 'center' });
      doc.moveDown();

      // Informations de l'entreprise
      if (exportConfig.companyName) {
        doc.fontSize(exportConfig.fonts.body.size)
           .font('Helvetica')
           .text(exportConfig.companyName, { align: 'center' });
        doc.moveDown(0.5);
      }

      // Filtres appliqués
      if (config.filters && Object.keys(config.filters).length > 0) {
        const filterText = Object.entries(config.filters)
          .map(([key, value]) => `${key}: ${value}`)
          .join(' | ');
        doc.fontSize(10)
           .font('Helvetica-Oblique')
           .text(`Filtres: ${filterText}`, { align: 'center' });
        doc.moveDown();
      }

      // Date de génération
      doc.fontSize(10)
         .font('Helvetica-Oblique')
         .text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, { align: 'center' });
      doc.moveDown(2);

      // Statistiques
      if (config.showStats !== false && data.length > 0) {
        doc.fontSize(exportConfig.fonts.header.size)
           .font('Helvetica-Bold')
           .text('STATISTIQUES', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(exportConfig.fonts.body.size)
           .font('Helvetica');

        if (config.statsGenerator) {
          const stats = config.statsGenerator(data);
          Object.entries(stats).forEach(([key, value]) => {
            doc.text(`${key}: ${value}`);
          });
        } else {
          doc.text(`Total d'enregistrements: ${data.length}`);
        }
        doc.moveDown();
      }

      // Tableau
      const columns = config.columns || [];
      if (columns.length === 0 && data.length > 0) {
        Object.keys(data[0]).forEach(key => {
          columns.push({
            header: key.charAt(0).toUpperCase() + key.slice(1),
            key: key,
            width: 100
          });
        });
      }

      // En-têtes
      doc.fontSize(exportConfig.fonts.header.size)
         .font('Helvetica-Bold');
      
      const tableTop = doc.y;
      let x = doc.x;
      columns.forEach((col, index) => {
        doc.text(col.header || col.key, x, tableTop, { width: col.width || 100 });
        x += (col.width || 100) + 10;
      });

      // Ligne de séparation
      doc.y = tableTop + 15;
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.y += 5;

      // Données
      doc.fontSize(exportConfig.fonts.body.size)
         .font('Helvetica');

      data.forEach((item, index) => {
        if (doc.y > 750) {
          doc.addPage();
          doc.y = 50;
        }

        x = 50;
        columns.forEach((col) => {
          const value = col.formatter 
            ? col.formatter(item[col.key], item)
            : item[col.key] || '';
          
          doc.text(String(value), x, doc.y, { 
            width: col.width || 100,
            align: col.align || 'left'
          });
          x += (col.width || 100) + 10;
        });

        doc.y += 15;
      });

      // Ligne de séparation finale
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.y += 10;

      // Total (si configuré)
      if (config.totalColumn) {
        const total = data.reduce((sum, item) => {
          const value = item[config.totalColumn];
          return sum + (typeof value === 'number' ? value : 0);
        }, 0);
        
        doc.fontSize(exportConfig.fonts.header.size)
           .font('Helvetica-Bold')
           .text(`TOTAL: ${total.toFixed(2)}`, 400, doc.y, { align: 'right' });
      }

      // Pied de page
      doc.fontSize(10)
         .font('Helvetica')
         .text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, {
           align: 'center',
           color: '#666666'
         });

      doc.end();
      
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', (error) => reject(error));
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateExcelExport,
  generatePDFExport,
  DEFAULT_CONFIG
};

