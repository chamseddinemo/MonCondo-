# Script PowerShell pour démarrer les serveurs MonCondo+

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Démarrage des serveurs MonCondo+" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Obtenir le répertoire du script
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Vérifier si les ports sont déjà utilisés
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue

if ($port3000) {
    Write-Host "⚠️  Le port 3000 est déjà utilisé!" -ForegroundColor Yellow
    Write-Host "   Arrêt du processus existant..." -ForegroundColor Yellow
    $process = Get-Process -Id ($port3000.OwningProcess) -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

if ($port5000) {
    Write-Host "⚠️  Le port 5000 est déjà utilisé!" -ForegroundColor Yellow
    Write-Host "   Arrêt du processus existant..." -ForegroundColor Yellow
    $process = Get-Process -Id ($port5000.OwningProcess) -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

Write-Host ""
Write-Host "[1/2] Démarrage du serveur Backend (port 5000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath\backend'; Write-Host 'Backend Server - Port 5000' -ForegroundColor Cyan; node server.js" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "[2/2] Démarrage du serveur Frontend (port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptPath\frontend'; Write-Host 'Frontend Server - Port 3000' -ForegroundColor Cyan; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ Serveurs démarrés!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "Backend:  http://localhost:5000/api" -ForegroundColor Yellow
Write-Host ""
Write-Host "Les fenêtres de serveur sont ouvertes." -ForegroundColor Cyan
Write-Host "Attendez quelques secondes que les serveurs démarrent complètement." -ForegroundColor Yellow
Write-Host ""

