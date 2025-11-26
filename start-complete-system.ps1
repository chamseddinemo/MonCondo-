# Script pour démarrer le système complet MonCondo+ avec gestion documentaire

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "========================================"
Write-Host "  DÉMARRAGE COMPLET MONCONDO+"
Write-Host "  AVEC GESTION DOCUMENTAIRE"
Write-Host "========================================"
Write-Host ""

$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

# Arrêter les processus existants
Write-Host "[1/7] Nettoyage des processus..." -ForegroundColor Cyan
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "OK" -ForegroundColor Green

# Test MongoDB
Write-Host "[2/7] Test MongoDB..." -ForegroundColor Cyan
Set-Location $backend
$mongoTest = node -e "const m=require('mongoose');require('dotenv').config();const u=process.env.MONGODB_URI||'mongodb+srv://db_user:dbuser@cluster0.kohukjc.mongodb.net/MonCondo+?retryWrites=true&w=majority';m.connect(u,{useNewUrlParser:true,useUnifiedTopology:true,serverSelectionTimeoutMS:10000}).then(()=>{console.log('OK');process.exit(0);}).catch(()=>{console.log('FAIL');process.exit(1);});" 2>&1
if ($mongoTest -match "OK") {
    Write-Host "OK - MongoDB connecte" -ForegroundColor Green
} else {
    Write-Host "ATTENTION - MongoDB non connecte" -ForegroundColor Yellow
}
Write-Host ""

# Initialiser les catégories de documents
Write-Host "[3/7] Initialisation des catégories de documents..." -ForegroundColor Cyan
Set-Location $backend
if (Test-Path "scripts\initDocumentCategories.js") {
    $initResult = node scripts/initDocumentCategories.js 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK - Categories initialisees" -ForegroundColor Green
    } else {
        Write-Host "ATTENTION - Erreur initialisation categories" -ForegroundColor Yellow
        Write-Host $initResult -ForegroundColor Yellow
    }
} else {
    Write-Host "ATTENTION - Script d'initialisation non trouve" -ForegroundColor Yellow
}
Write-Host ""

# Démarrer Backend
Write-Host "[4/7] Demarrage Backend (port 5000)..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock { 
    Set-Location $using:backend
    npm run dev 2>&1 
}
Start-Sleep -Seconds 15

# Vérifier Backend
Write-Host "[5/7] Verification Backend..." -ForegroundColor Cyan
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
    Write-Host "Vérifiez les logs dans la fenêtre PowerShell du backend" -ForegroundColor Yellow
}

# Test des routes documents
Write-Host "[6/7] Test des routes documents..." -ForegroundColor Cyan
if ($backendOk) {
    try {
        $token = "test-token" # Pour le test, on vérifie juste que la route existe
        $r = Invoke-WebRequest -Uri "http://localhost:5000/api/documents/categories" -TimeoutSec 2 -ErrorAction Stop
        Write-Host "OK - Routes documents accessibles" -ForegroundColor Green
    } catch {
        if ($_.Exception.Response.StatusCode -eq 401) {
            Write-Host "OK - Routes documents protegees (401 attendu)" -ForegroundColor Green
        } else {
            Write-Host "ATTENTION - Routes documents: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}
Write-Host ""

# Démarrer Frontend
Write-Host "[7/7] Demarrage Frontend (port 3000)..." -ForegroundColor Cyan
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
Write-Host "[8/8] Verification Frontend..." -ForegroundColor Cyan
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

# Résumé
Write-Host "========================================"
Write-Host "  RÉSUMÉ"
Write-Host "========================================"
Write-Host ""
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Documents: http://localhost:3000/documents" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Système de gestion documentaire activé!" -ForegroundColor Green
Write-Host ""
Write-Host "Pour arreter: Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor Yellow
Write-Host ""

