/**
 * Script pour vérifier que les routes sont bien enregistrées
 */

const express = require('express');
const requestRoutes = require('./routes/requestRoutes');

console.log('🔍 Vérification des routes requests...\n');

console.log('Stack length:', requestRoutes.stack.length);
console.log('\nDétails des layers:');

requestRoutes.stack.forEach((layer, index) => {
  console.log(`\n[${index}] Layer:`);
  console.log('  - Name:', layer.name || 'anonymous');
  console.log('  - Methods:', layer.methods || 'N/A');
  
  if (layer.route) {
    console.log('  - Route trouvée!');
    console.log('    Path:', layer.route.path);
    console.log('    Methods:', Object.keys(layer.route.methods));
    
    // Vérifier si c'est la route accept
    if (layer.route.path === '/:id/accept' && layer.route.methods.put) {
      console.log('    ✅ Route PUT /:id/accept confirmée!');
    }
  } else {
    console.log('  - Pas de route (middleware)');
    if (layer.regexp) {
      console.log('  - Regexp:', layer.regexp.toString());
    }
  }
});

// Vérifier spécifiquement la route accept
const acceptRoute = requestRoutes.stack.find(layer => 
  layer.route && 
  layer.route.path === '/:id/accept' && 
  layer.route.methods && 
  layer.route.methods.put
);

if (acceptRoute) {
  console.log('\n✅ Route PUT /:id/accept trouvée dans la stack!');
  console.log('   Path:', acceptRoute.route.path);
  console.log('   Methods:', Object.keys(acceptRoute.route.methods));
} else {
  console.log('\n❌ Route PUT /:id/accept NON trouvée dans la stack!');
  console.log('   Vérifiez que la route est bien définie dans requestRoutes.js');
}

// Tester si le router peut matcher une route
console.log('\n🧪 Test de matching de route...');
const testPath = '/69153133bf674ac3b226525e/accept';
const testMethod = 'PUT';

console.log(`Test: ${testMethod} ${testPath}`);

// Simuler une requête
const req = {
  method: testMethod,
  path: testPath,
  url: testPath,
  originalUrl: testPath,
  baseUrl: '',
  params: {}
};

// Vérifier si une route correspond
const matchingLayer = requestRoutes.stack.find(layer => {
  if (layer.route && layer.route.methods[testMethod.toLowerCase()]) {
    const routePath = layer.route.path;
    // Conversion simple pour test
    const pattern = routePath.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp('^' + pattern + '$');
    return regex.test(testPath);
  }
  return false;
});

if (matchingLayer) {
  console.log('✅ Route correspondante trouvée!');
  console.log('   Path:', matchingLayer.route.path);
  console.log('   Methods:', Object.keys(matchingLayer.route.methods));
} else {
  console.log('❌ Aucune route correspondante trouvée');
}

console.log('\n🏁 Vérification terminée');

