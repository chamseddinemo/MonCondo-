# Script pour démarrer le serveur backend

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════"
Write-Host "  DÉMARRAGE DU SERVEUR BACKEND"
Write-Host "═══════════════════════════════════════════════════════════"
Write-Host ""

# Vérifier que nous sommes dans le bon dossier
if (-not (Test-Path "server.js")) {
    Write-Host "❌ Erreur: server.js non trouvé" -ForegroundColor Red
    Write-Host "💡 Assurez-vous d'être dans le dossier backend" -ForegroundColor Yellow
    Write-Host "💡 Exécutez: cd backend" -ForegroundColor Yellow
    exit 1
}

# Vérifier que node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules non trouvé" -ForegroundColor Yellow
    Write-Host "📦 Installation des dépendances..." -ForegroundColor Cyan
    npm install
}

# Vérifier le port 5000
Write-Host "🔍 Vérification du port 5000..." -ForegroundColor Cyan
$connection = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($connection) {
    $pid = $connection.OwningProcess
    Write-Host "⚠️  Le port 5000 est déjà utilisé par le processus $pid" -ForegroundColor Yellow
    Write-Host "🛑 Arrêt du processus..." -ForegroundColor Yellow
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "✅ Processus arrêté" -ForegroundColor Green
}

Write-Host ""
Write-Host "🚀 Démarrage du serveur backend..." -ForegroundColor Cyan
Write-Host "⏳ Veuillez patienter..." -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 Le serveur va démarrer. Gardez ce terminal ouvert." -ForegroundColor Yellow
Write-Host "💡 Pour arrêter le serveur, appuyez sur Ctrl+C" -ForegroundColor Yellow
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════"
Write-Host ""

# Démarrer le serveur
npm run dev

