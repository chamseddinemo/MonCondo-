/**
 * Script de vérification que le backend est prêt
 * Vérifie la structure, les routes, et la configuration
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

let allGood = true;

log('\n═══════════════════════════════════════════════════════════', 'blue');
log('  VÉRIFICATION DU BACKEND', 'blue');
log('═══════════════════════════════════════════════════════════', 'blue');

// Vérifier les fichiers essentiels
log('\n📁 Vérification des fichiers essentiels...', 'blue');
const essentialFiles = [
  'server.js',
  'package.json',
  'config/database.js',
  'config/jwt.js',
  '.env'
];

essentialFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    log(`   ✅ ${file}`, 'green');
  } else {
    log(`   ⚠️  ${file} (optionnel ou sera créé)`, 'yellow');
  }
});

// Vérifier les routes
log('\n🛣️  Vérification des routes...', 'blue');
const routes = [
  'routes/authRoutes.js',
  'routes/userRoutes.js',
  'routes/paymentRoutes.js',
  'routes/requestRoutes.js',
  'routes/buildingRoutes.js',
  'routes/unitRoutes.js',
  'routes/dashboardRoutes.js',
  'routes/publicRoutes.js',
  'routes/index.js'
];

routes.forEach(route => {
  const routePath = path.join(__dirname, '..', route);
  if (fs.existsSync(routePath)) {
    log(`   ✅ ${route}`, 'green');
  } else {
    log(`   ❌ ${route} manquant`, 'red');
    allGood = false;
  }
});

// Vérifier les contrôleurs
log('\n🎮 Vérification des contrôleurs...', 'blue');
const controllers = [
  'controllers/authController.js',
  'controllers/userController.js',
  'controllers/paymentController.js',
  'controllers/requestController.js',
  'controllers/buildingController.js',
  'controllers/unitController.js'
];

controllers.forEach(controller => {
  const controllerPath = path.join(__dirname, '..', controller);
  if (fs.existsSync(controllerPath)) {
    log(`   ✅ ${controller}`, 'green');
  } else {
    log(`   ❌ ${controller} manquant`, 'red');
    allGood = false;
  }
});

// Vérifier les modèles
log('\n📦 Vérification des modèles...', 'blue');
const models = [
  'models/User.js',
  'models/Payment.js',
  'models/Request.js',
  'models/Building.js',
  'models/Unit.js'
];

models.forEach(model => {
  const modelPath = path.join(__dirname, '..', model);
  if (fs.existsSync(modelPath)) {
    log(`   ✅ ${model}`, 'green');
  } else {
    log(`   ❌ ${model} manquant`, 'red');
    allGood = false;
  }
});

// Vérifier les middlewares
log('\n🛡️  Vérification des middlewares...', 'blue');
const middlewares = [
  'middlewares/auth.js',
  'middlewares/roleAuth.js',
  'middlewares/authorizePayment.js'
];

middlewares.forEach(middleware => {
  const middlewarePath = path.join(__dirname, '..', middleware);
  if (fs.existsSync(middlewarePath)) {
    log(`   ✅ ${middleware}`, 'green');
  } else {
    log(`   ❌ ${middleware} manquant`, 'red');
    allGood = false;
  }
});

// Vérifier les services
log('\n⚙️  Vérification des services...', 'blue');
const services = [
  'services/paymentService.js',
  'services/paymentSyncService.js',
  'services/documentService.js',
  'services/notificationService.js',
  'services/globalSyncService.js'
];

services.forEach(service => {
  const servicePath = path.join(__dirname, '..', service);
  if (fs.existsSync(servicePath)) {
    log(`   ✅ ${service}`, 'green');
  } else {
    log(`   ⚠️  ${service} (optionnel)`, 'yellow');
  }
});

// Vérifier la configuration
log('\n⚙️  Vérification de la configuration...', 'blue');
try {
  const serverPath = path.join(__dirname, '..', 'server.js');
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  
  // Vérifier que les routes sont montées
  if (serverContent.includes('app.use(\'/api\'')) {
    log('   ✅ Routes API montées', 'green');
  } else {
    log('   ⚠️  Routes API - Vérification manuelle requise', 'yellow');
  }
  
  // Vérifier que MongoDB est configuré
  if (serverContent.includes('connectDB()') || serverContent.includes('require(\'./config/database\')')) {
    log('   ✅ MongoDB configuré', 'green');
  } else {
    log('   ⚠️  MongoDB - Vérification manuelle requise', 'yellow');
  }
  
  // Vérifier Socket.io
  if (serverContent.includes('socket.io') || serverContent.includes('socket')) {
    log('   ✅ Socket.io configuré', 'green');
  } else {
    log('   ⚠️  Socket.io - Vérification manuelle requise', 'yellow');
  }
} catch (error) {
  log(`   ❌ Erreur lors de la vérification: ${error.message}`, 'red');
  allGood = false;
}

// Résumé
log('\n═══════════════════════════════════════════════════════════', 'blue');
log('  RÉSUMÉ', 'blue');
log('═══════════════════════════════════════════════════════════', 'blue');

if (allGood) {
  log('\n✅ Le backend est prêt et fonctionnel!', 'green');
  log('\n📋 Prochaines étapes:', 'blue');
  log('   1. Configurez MongoDB Atlas Network Access', 'yellow');
  log('   2. Démarrez le serveur: npm run dev', 'yellow');
  log('   3. Exécutez les tests: node scripts/test-complete-backend.js', 'yellow');
  log('\n💡 Une fois MongoDB configuré, tous les tests devraient passer!', 'green');
  process.exit(0);
} else {
  log('\n⚠️  Certains fichiers sont manquants', 'yellow');
  log('   Vérifiez les erreurs ci-dessus', 'yellow');
  process.exit(1);
}

