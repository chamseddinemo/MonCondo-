# Script de démarrage pour MonCondo+
# Démarre le backend et le frontend

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   MONCONDO+ - DÉMARRAGE DES SERVEURS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Arrêter tous les processus Node.js existants
Write-Host "🛑 Arrêt des processus Node.js existants..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "✅ Processus arrêtés`n" -ForegroundColor Green

# Obtenir le chemin du projet
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"

# Vérifier que les dossiers existent
if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Erreur: Dossier backend introuvable!" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $frontendPath)) {
    Write-Host "❌ Erreur: Dossier frontend introuvable!" -ForegroundColor Red
    exit 1
}

# Démarrer le backend
Write-Host "🚀 Démarrage du BACKEND (Port 5000)..." -ForegroundColor Green
$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '🔵 BACKEND - Port 5000' -ForegroundColor Cyan; node server.js" -PassThru -WindowStyle Normal
Start-Sleep -Seconds 3

# Démarrer le frontend
Write-Host "🚀 Démarrage du FRONTEND (Port 3000)..." -ForegroundColor Green
$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host '🟢 FRONTEND - Port 3000' -ForegroundColor Green; npm run dev" -PassThru -WindowStyle Normal
Start-Sleep -Seconds 3

Write-Host "`n⏳ Attente du démarrage des serveurs (15 secondes)...`n" -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Vérifier les ports
Write-Host "📊 Vérification des serveurs:`n" -ForegroundColor Cyan

$backendPort = netstat -ano | findstr "LISTENING" | findstr ":5000"
$frontendPort = netstat -ano | findstr "LISTENING" | findstr ":3000"

if ($backendPort) {
    Write-Host "✅ BACKEND: Port 5000 - ACTIF" -ForegroundColor Green
    Write-Host "   URL: http://localhost:5000/api`n" -ForegroundColor Gray
} else {
    Write-Host "❌ BACKEND: Port 5000 - INACTIF" -ForegroundColor Red
    Write-Host "   Vérifiez la fenêtre PowerShell du backend pour les erreurs`n" -ForegroundColor Yellow
}

if ($frontendPort) {
    Write-Host "✅ FRONTEND: Port 3000 - ACTIF" -ForegroundColor Green
    Write-Host "   URL: http://localhost:3000" -ForegroundColor Gray
    Write-Host "   API Proxy: http://localhost:3000/api`n" -ForegroundColor Gray
} else {
    Write-Host "⏳ FRONTEND: Port 3000 - En cours de compilation..." -ForegroundColor Yellow
    Write-Host "   Le frontend peut prendre 10-20 secondes pour compiler`n" -ForegroundColor Gray
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Serveurs démarrés!" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "📝 Deux fenêtres PowerShell ont été ouvertes:" -ForegroundColor White
Write-Host "   - Une pour le BACKEND (port 5000)" -ForegroundColor White
Write-Host "   - Une pour le FRONTEND (port 3000)`n" -ForegroundColor White
Write-Host "🌐 Accédez à l'application sur: http://localhost:3000`n" -ForegroundColor Cyan

