# Script pour démarrer Backend et Frontend

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "========================================"
Write-Host "  DEMARRAGE COMPLET MONCONDO+"
Write-Host "========================================"
Write-Host ""

$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

# Arrêter les processus existants
Write-Host "[1/6] Nettoyage des processus..." -ForegroundColor Cyan
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "OK" -ForegroundColor Green

# Test MongoDB
Write-Host "[2/6] Test MongoDB..." -ForegroundColor Cyan
Set-Location $backend
$mongoTest = node -e "const m=require('mongoose');require('dotenv').config();const u=process.env.MONGODB_URI||'mongodb+srv://db_user:dbuser@cluster0.kohukjc.mongodb.net/MonCondo+?retryWrites=true&w=majority';m.connect(u,{useNewUrlParser:true,useUnifiedTopology:true,serverSelectionTimeoutMS:10000}).then(()=>{console.log('OK');process.exit(0);}).catch(()=>{console.log('FAIL');process.exit(1);});" 2>&1
if ($mongoTest -match "OK") {
    Write-Host "OK - MongoDB connecte" -ForegroundColor Green
} else {
    Write-Host "ATTENTION - MongoDB non connecte" -ForegroundColor Yellow
}
Write-Host ""

# Démarrer Backend
Write-Host "[3/6] Demarrage Backend (port 5000)..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock { 
    Set-Location $using:backend
    npm run dev 2>&1 
}
Start-Sleep -Seconds 15

# Vérifier Backend
Write-Host "[4/6] Verification Backend..." -ForegroundColor Cyan
$backendOk = $false
for ($i=1; $i -le 10; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 2 -ErrorAction Stop
        if ($r.StatusCode -eq 200) {
            Write-Host "OK - Backend demarre" -ForegroundColor Green
            $backendOk = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}
if (-not $backendOk) {
    Write-Host "ERREUR - Backend non demarre" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Démarrer Frontend
Write-Host "[5/6] Demarrage Frontend (port 3000)..." -ForegroundColor Cyan
Set-Location $frontend
if (-not (Test-Path "node_modules")) {
    Write-Host "Installation dependances..." -ForegroundColor Yellow
    npm install
}
$frontendJob = Start-Job -ScriptBlock { 
    Set-Location $using:frontend
    npm run dev 2>&1 
}
Start-Sleep -Seconds 20

# Vérifier Frontend
Write-Host "[6/6] Verification Frontend..." -ForegroundColor Cyan
$frontendOk = $false
for ($i=1; $i -le 15; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 2 -ErrorAction Stop
        if ($r.StatusCode -eq 200) {
            Write-Host "OK - Frontend demarre" -ForegroundColor Green
            $frontendOk = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 2
    }
}
if (-not $frontendOk) {
    Write-Host "ATTENTION - Frontend en cours de demarrage" -ForegroundColor Yellow
}
Write-Host ""

# Tests
Write-Host "========================================"
Write-Host "  EXECUTION DES TESTS"
Write-Host "========================================"
Write-Host ""
Set-Location $backend
node scripts/test-complete-backend.js

Write-Host ""
Write-Host "========================================"
Write-Host "  RESUME"
Write-Host "========================================"
Write-Host ""
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour arreter: Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor Yellow
Write-Host ""
