# Script amélioré pour démarrer MonCondo+
# Auteur: Analyse complète du projet
# Date: $(Get-Date -Format "yyyy-MM-dd")

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        🚀 DÉMARRAGE DE MONCONDO+ 🚀                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Node.js est installé
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js installé: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js n'est pas installé!" -ForegroundColor Red
    Write-Host "   Veuillez installer Node.js depuis https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Vérifier si les dépendances sont installées
Write-Host ""
Write-Host "📦 Vérification des dépendances..." -ForegroundColor Cyan

if (-not (Test-Path "backend\node_modules")) {
    Write-Host "⚠️  Installation des dépendances backend..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
}

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "⚠️  Installation des dépendances frontend..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
}

Write-Host "✅ Dépendances vérifiées" -ForegroundColor Green

# Vérifier si les ports sont disponibles
Write-Host ""
Write-Host "🔍 Vérification des ports..." -ForegroundColor Cyan

$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($port5000) {
    Write-Host "⚠️  Le port 5000 est déjà utilisé!" -ForegroundColor Yellow
    Write-Host "   Arrêt du processus existant..." -ForegroundColor Yellow
    $process = Get-Process -Id $port5000.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

if ($port3000) {
    Write-Host "⚠️  Le port 3000 est déjà utilisé!" -ForegroundColor Yellow
    Write-Host "   Arrêt du processus existant..." -ForegroundColor Yellow
    $process = Get-Process -Id $port3000.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

# Démarrer le backend
Write-Host ""
Write-Host "🔧 Démarrage du backend (Port 5000)..." -ForegroundColor Cyan
$null = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host '🔧 Backend MonCondo+ - Port 5000' -ForegroundColor Green; Write-Host ''; npm run dev" -PassThru
Start-Sleep -Seconds 3

# Démarrer le frontend
Write-Host "🎨 Démarrage du frontend (Port 3000)..." -ForegroundColor Cyan
$null = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host '🎨 Frontend MonCondo+ - Port 3000' -ForegroundColor Green; Write-Host ''; npm run dev" -PassThru
Start-Sleep -Seconds 3

# Attendre que les serveurs démarrent
Write-Host ""
Write-Host "⏳ Attente du démarrage des serveurs..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Vérifier que les serveurs sont démarrés
Write-Host ""
Write-Host "🔍 Vérification des serveurs..." -ForegroundColor Cyan

$backendOk = $false
$frontendOk = $false

try {
    $null = Invoke-WebRequest -Uri "http://localhost:5000/api" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    $backendOk = $true
    Write-Host "✅ Backend: Démarré avec succès (http://localhost:5000)" -ForegroundColor Green
} catch {
    Write-Host "⏳ Backend: Encore en cours de démarrage..." -ForegroundColor Yellow
}

try {
    $null = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    $frontendOk = $true
    Write-Host "✅ Frontend: Démarré avec succès (http://localhost:3000)" -ForegroundColor Green
} catch {
    Write-Host "⏳ Frontend: Encore en cours de démarrage..." -ForegroundColor Yellow
}

# Afficher un résumé du statut
if ($backendOk -and $frontendOk) {
    Write-Host ""
    Write-Host "✅ Les deux serveurs sont opérationnels!" -ForegroundColor Green
} elseif ($backendOk) {
    Write-Host ""
    Write-Host "⚠️  Le backend est opérationnel, le frontend est en cours de démarrage..." -ForegroundColor Yellow
} elseif ($frontendOk) {
    Write-Host ""
    Write-Host "⚠️  Le frontend est opérationnel, le backend est en cours de démarrage..." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "⏳ Les serveurs sont en cours de démarrage, veuillez patienter..." -ForegroundColor Yellow
}

# Afficher les informations
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              ✅ SERVEURS DÉMARRÉS ✅                    ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📍 URLs d'accès:" -ForegroundColor Cyan
Write-Host "   🌐 Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "   🔌 Backend API: http://localhost:5000/api" -ForegroundColor Yellow
Write-Host "   💬 Socket.io: http://localhost:5000" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔐 Comptes de test:" -ForegroundColor Cyan
Write-Host "   👑 Admin: admin@moncondo.com / admin123" -ForegroundColor White
Write-Host "   🏢 Propriétaire: proprio@moncondo.com / proprio123" -ForegroundColor White
Write-Host "   🏠 Locataire: locataire@moncondo.com / locataire123" -ForegroundColor White
Write-Host ""
Write-Host "📝 Notes:" -ForegroundColor Cyan
Write-Host "   - Les serveurs sont demarres dans des fenetres separees" -ForegroundColor Gray
Write-Host "   - Fermez les fenetres pour arreter les serveurs" -ForegroundColor Gray
Write-Host "   - Les logs s'affichent dans les fenetres PowerShell" -ForegroundColor Gray
Write-Host ""
Write-Host "🎉 Bon developpement!" -ForegroundColor Green
Write-Host ""

# Garder le script ouvert
Read-Host "Appuyez sur Entree pour continuer"

