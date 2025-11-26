# Script interactif pour guider la configuration MongoDB Atlas

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════"
Write-Host "  CONFIGURATION MONGODB ATLAS NETWORK ACCESS"
Write-Host "═══════════════════════════════════════════════════════════"
Write-Host ""

# Récupérer l'IP publique
Write-Host "🔍 Récupération de votre IP publique..." -ForegroundColor Cyan
try {
    $ip = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing -TimeoutSec 5).Content.Trim()
    Write-Host "✅ Votre IP publique: $ip" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Impossible de récupérer l'IP automatiquement" -ForegroundColor Yellow
    $ip = "VOTRE_IP_PUBLIQUE"
}

Write-Host ""
Write-Host "📋 INSTRUCTIONS ÉTAPE PAR ÉTAPE:" -ForegroundColor Cyan
Write-Host ""
Write-Host "ÉTAPE 1: Ouvrir MongoDB Atlas" -ForegroundColor Yellow
Write-Host "   → Allez sur: https://cloud.mongodb.com"
Write-Host "   → Connectez-vous à votre compte"
Write-Host ""
Write-Host "ÉTAPE 2: Accéder à Network Access" -ForegroundColor Yellow
Write-Host "   → Dans le menu de gauche, cliquez sur 'Network Access'"
Write-Host "   → (ou 'Security' → 'Network Access')"
Write-Host ""
Write-Host "ÉTAPE 3: Ajouter une IP" -ForegroundColor Yellow
Write-Host "   → Cliquez sur le bouton vert 'Add IP Address'"
Write-Host ""
Write-Host "ÉTAPE 4: Choisir l'option" -ForegroundColor Yellow
Write-Host "   Option A (RECOMMANDÉ pour développement):"
Write-Host "   → Cliquez sur 'Allow Access from Anywhere'"
Write-Host "   → Cela ajoutera: 0.0.0.0/0"
Write-Host "   → Cliquez sur 'Confirm'"
Write-Host ""
Write-Host "   Option B (Plus sécurisé):"
Write-Host "   → Entrez votre IP: $ip"
Write-Host "   → Cliquez sur 'Confirm'"
Write-Host ""
Write-Host "ÉTAPE 5: Attendre" -ForegroundColor Yellow
Write-Host "   → Attendez 1-2 minutes que les changements prennent effet"
Write-Host "   → Vous verrez l'IP apparaître dans la liste avec un statut 'Active'"
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════"
Write-Host ""

# Demander à l'utilisateur s'il a terminé
Write-Host "❓ Avez-vous terminé la configuration MongoDB Atlas? (O/N)" -ForegroundColor Cyan
$response = Read-Host

if ($response -eq "O" -or $response -eq "o" -or $response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "⏳ Attente de 30 secondes pour que les changements prennent effet..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    Write-Host ""
    Write-Host "🧪 Test de connexion MongoDB..." -ForegroundColor Cyan
    
    # Tester la connexion MongoDB
    $testScript = @"
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://db_user:dbuser@cluster0.kohukjc.mongodb.net/MonCondo+?retryWrites=true&w=majority';

console.log('🔄 Test de connexion MongoDB...');
console.log('URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 15000
})
.then(() => {
  console.log('✅ MongoDB connecté avec succès!');
  console.log('Host:', mongoose.connection.host);
  console.log('Database:', mongoose.connection.name);
  process.exit(0);
})
.catch((error) => {
  console.error('❌ Erreur de connexion:', error.message);
  if (error.message.includes('whitelist') || error.message.includes('IP')) {
    console.error('⚠️  Votre IP n\'est toujours pas autorisée.');
    console.error('💡 Vérifiez que vous avez bien ajouté l\'IP dans MongoDB Atlas.');
    console.error('💡 Attendez encore 1-2 minutes et réessayez.');
  }
  process.exit(1);
});
"@
    
    $testScript | Out-File -FilePath "test-mongodb-connection.js" -Encoding utf8
    
    try {
        node test-mongodb-connection.js
        $testResult = $LASTEXITCODE
        
        if ($testResult -eq 0) {
            Write-Host ""
            Write-Host "✅ SUCCÈS! MongoDB est maintenant connecté!" -ForegroundColor Green
            Write-Host ""
            Write-Host "🚀 Prochaines étapes:" -ForegroundColor Cyan
            Write-Host "   1. Démarrez le serveur: npm run dev"
            Write-Host "   2. Exécutez les tests: node scripts/test-complete-backend.js"
            Write-Host ""
        } else {
            Write-Host ""
            Write-Host "⚠️  La connexion a échoué." -ForegroundColor Yellow
            Write-Host "💡 Vérifiez que:" -ForegroundColor Yellow
            Write-Host "   - Vous avez bien ajouté l'IP dans MongoDB Atlas"
            Write-Host "   - Vous avez attendu 1-2 minutes"
            Write-Host "   - L'IP apparaît avec le statut 'Active' dans MongoDB Atlas"
            Write-Host ""
            Write-Host "💡 Relancez ce script après avoir vérifié: .\scripts\configure-mongodb-atlas.ps1"
            Write-Host ""
        }
    } catch {
        Write-Host "❌ Erreur lors du test: $($_.Exception.Message)" -ForegroundColor Red
    } finally {
        Remove-Item "test-mongodb-connection.js" -ErrorAction SilentlyContinue
    }
} else {
    Write-Host ""
    Write-Host "📋 Suivez les instructions ci-dessus pour configurer MongoDB Atlas." -ForegroundColor Yellow
    Write-Host "💡 Une fois terminé, relancez ce script: .\scripts\configure-mongodb-atlas.ps1" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "═══════════════════════════════════════════════════════════"
Write-Host ""

