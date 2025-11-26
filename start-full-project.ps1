# Script complet pour démarrer le projet MonCondo+ (Backend + Frontend)

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════"
Write-Host "  DÉMARRAGE COMPLET DU PROJET MONCONDO+"
Write-Host "═══════════════════════════════════════════════════════════"
Write-Host ""

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"

# Fonction pour vérifier si un port est utilisé
function Test-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

# Fonction pour arrêter un processus sur un port
function Stop-PortProcess {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connection) {
        $pid = $connection.OwningProcess
        Write-Host "🛑 Arrêt du processus sur le port $Port (PID: $pid)..." -ForegroundColor Yellow
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

# Arrêter les processus existants
Write-Host "🛑 Nettoyage des processus existants..." -ForegroundColor Cyan
Stop-PortProcess -Port 5000
Stop-PortProcess -Port 3000
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*MonCondo*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "✅ Nettoyage terminé" -ForegroundColor Green
Write-Host ""

# Vérifier MongoDB
Write-Host "🔍 Vérification de MongoDB..." -ForegroundColor Cyan
$mongoTestFile = Join-Path $backendPath "scripts\test-mongo-quick.js"
if (Test-Path $mongoTestFile) {
    $mongoResult = node $mongoTestFile 2>&1
    if ($mongoResult -match "OK") {
        Write-Host "✅ MongoDB connecté" -ForegroundColor Green
    } else {
        Write-Host "❌ MongoDB non connecté - Vérifiez la configuration" -ForegroundColor Red
        Write-Host "💡 Configurez MongoDB Atlas Network Access si nécessaire" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Script de test MongoDB non trouvé" -ForegroundColor Yellow
}
Write-Host ""

# Démarrer le backend
Write-Host "🚀 Démarrage du BACKEND (port 5000)..." -ForegroundColor Cyan
Set-Location $backendPath

$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:backendPath
    npm run dev 2>&1
}

Write-Host "⏳ Attente du démarrage du backend (15 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Vérifier le backend
$backendReady = $false
for ($i = 1; $i -le 10; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method GET -TimeoutSec 3 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $health = $response.Content | ConvertFrom-Json
            Write-Host "✅ BACKEND démarré avec succès!" -ForegroundColor Green
            Write-Host "   Port: $($health.port)" -ForegroundColor Green
            Write-Host "   Message: $($health.message)" -ForegroundColor Green
            $backendReady = $true
            break
        }
    } catch {
        if ($i -lt 10) {
            Write-Host "   Tentative $i/10..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }
}

if (-not $backendReady) {
    Write-Host "❌ Le backend n'a pas démarré correctement" -ForegroundColor Red
    Write-Host "💡 Vérifiez les logs dans le job backend" -ForegroundColor Yellow
    $backendJob | Receive-Job
    exit 1
}

Write-Host ""

# Démarrer le frontend
Write-Host "🚀 Démarrage du FRONTEND (port 3000)..." -ForegroundColor Cyan
Set-Location $frontendPath

if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installation des dépendances frontend..." -ForegroundColor Yellow
    npm install
}

$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:frontendPath
    npm run dev 2>&1
}

Write-Host "⏳ Attente du démarrage du frontend (20 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Vérifier le frontend
$frontendReady = $false
for ($i = 1; $i -le 15; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 3 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ FRONTEND démarré avec succès!" -ForegroundColor Green
            Write-Host "   Port: 3000" -ForegroundColor Green
            $frontendReady = $true
            break
        }
    } catch {
        if ($i -lt 15) {
            Write-Host "   Tentative $i/15..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }
}

if (-not $frontendReady) {
    Write-Host "⚠️  Le frontend pourrait encore être en cours de démarrage" -ForegroundColor Yellow
    Write-Host "💡 Attendez encore quelques secondes et testez: http://localhost:3000" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════"
Write-Host "  ✅ PROJET DÉMARRÉ!"
Write-Host "═══════════════════════════════════════════════════════════"
Write-Host ""
Write-Host "🌐 URLs disponibles:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend API: http://localhost:5000/api" -ForegroundColor White
Write-Host "   Health Check: http://localhost:5000/api/health" -ForegroundColor White
Write-Host ""
Write-Host "💡 Les serveurs tournent en arrière-plan" -ForegroundColor Yellow
Write-Host "💡 Pour arrêter: Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor Yellow
Write-Host ""
Write-Host "🧪 Exécution des tests backend..." -ForegroundColor Cyan
Write-Host ""

# Exécuter les tests
Set-Location $backendPath
node scripts/test-complete-backend.js

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════"
Write-Host ""

