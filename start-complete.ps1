# Script complet et robuste pour démarrer MonCondo+ (Backend + Frontend)
# Vérifie tout et démarre les serveurs avec des vérifications de santé

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        🚀 DÉMARRAGE COMPLET DE MONCONDO+ 🚀           ║" -ForegroundColor Cyan
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

# Vérifier les dépendances
Write-Host ""
Write-Host "📦 Vérification des dépendances..." -ForegroundColor Cyan

if (-not (Test-Path "backend\node_modules")) {
    Write-Host "⚠️  Installation des dépendances backend..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation des dépendances backend!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..
    Write-Host "✅ Dépendances backend installées" -ForegroundColor Green
} else {
    Write-Host "✅ Dépendances backend: OK" -ForegroundColor Green
}

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "⚠️  Installation des dépendances frontend..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation des dépendances frontend!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..
    Write-Host "✅ Dépendances frontend installées" -ForegroundColor Green
} else {
    Write-Host "✅ Dépendances frontend: OK" -ForegroundColor Green
}

# Vérifier les ports
Write-Host ""
Write-Host "🔍 Vérification des ports..." -ForegroundColor Cyan

$port5000 = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
$port3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue

if ($port5000) {
    Write-Host "⚠️  Le port 5000 est déjà utilisé!" -ForegroundColor Yellow
    $process = Get-Process -Id $port5000.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "   Arrêt du processus existant..." -ForegroundColor Yellow
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

if ($port3000) {
    Write-Host "⚠️  Le port 3000 est déjà utilisé!" -ForegroundColor Yellow
    $process = Get-Process -Id $port3000.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "   Arrêt du processus existant..." -ForegroundColor Yellow
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

Write-Host "✅ Ports vérifiés" -ForegroundColor Green

# Démarrer le backend
Write-Host ""
Write-Host "🔧 Démarrage du backend (Port 5000)..." -ForegroundColor Cyan
$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host '🔧 Backend MonCondo+ - Port 5000' -ForegroundColor Green; Write-Host ''; npm start" -PassThru
Start-Sleep -Seconds 3

# Démarrer le frontend
Write-Host "🎨 Démarrage du frontend (Port 3000)..." -ForegroundColor Cyan
$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host '🎨 Frontend MonCondo+ - Port 3000' -ForegroundColor Green; Write-Host ''; npm run dev" -PassThru
Start-Sleep -Seconds 3

# Attendre le démarrage
Write-Host ""
Write-Host "⏳ Attente du démarrage des serveurs (20 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Vérifier la santé des serveurs
Write-Host ""
Write-Host "🔍 Vérification de la santé des serveurs..." -ForegroundColor Cyan

$backendHealthy = $false
$frontendHealthy = $false

# Vérifier le backend
$maxRetries = 5
$retryCount = 0
while ($retryCount -lt $maxRetries -and -not $backendHealthy) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $healthData = $response.Content | ConvertFrom-Json
            if ($healthData.success) {
                $backendHealthy = $true
                Write-Host "✅ Backend: Opérationnel!" -ForegroundColor Green
            }
        }
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Start-Sleep -Seconds 3
        }
    }
}

# Vérifier le frontend
$retryCount = 0
while ($retryCount -lt $maxRetries -and -not $frontendHealthy) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $frontendHealthy = $true
            Write-Host "✅ Frontend: Opérationnel!" -ForegroundColor Green
        }
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Start-Sleep -Seconds 3
        }
    }
}

# Résumé
Write-Host ""
if ($backendHealthy -and $frontendHealthy) {
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║      ✅ TOUS LES SERVEURS SONT OPÉRATIONNELS ✅       ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
} elseif ($backendHealthy) {
    Write-Host "⚠️  Backend opérationnel, frontend en cours de démarrage..." -ForegroundColor Yellow
} elseif ($frontendHealthy) {
    Write-Host "⚠️  Frontend opérationnel, backend en cours de démarrage..." -ForegroundColor Yellow
} else {
    Write-Host "⏳ Les serveurs sont en cours de démarrage..." -ForegroundColor Yellow
    Write-Host "   Vérifiez les fenêtres PowerShell pour voir les logs" -ForegroundColor Gray
}

Write-Host ""
Write-Host "📍 URLs d'accès:" -ForegroundColor Cyan
Write-Host "   🌐 Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "   🔌 Backend API: http://localhost:5000/api" -ForegroundColor Yellow
Write-Host "   ❤️  Health Check: http://localhost:5000/api/health" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔐 Comptes de test:" -ForegroundColor Cyan
Write-Host "   👑 Admin: admin@moncondo.com / admin123" -ForegroundColor White
Write-Host "   🏢 Propriétaire: proprio@moncondo.com / proprio123" -ForegroundColor White
Write-Host "   🏠 Locataire: locataire@moncondo.com / locataire123" -ForegroundColor White
Write-Host ""
Write-Host "📝 Notes:" -ForegroundColor Cyan
Write-Host "   - Les serveurs sont démarrés dans des fenêtres PowerShell séparées" -ForegroundColor Gray
Write-Host "   - Fermez les fenêtres pour arrêter les serveurs" -ForegroundColor Gray
Write-Host "   - Les logs s'affichent dans les fenêtres PowerShell" -ForegroundColor Gray
Write-Host ""
Write-Host "🎉 Bon développement!" -ForegroundColor Green
Write-Host ""

