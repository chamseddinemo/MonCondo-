# Script de monitoring continu des serveurs MonCondo+
# Vérifie toutes les 30 secondes que les serveurs sont actifs

param(
    [int]$CheckInterval = 30,
    [switch]$AutoRestart = $false
)

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

function Test-Port {
    param([int]$Port)
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        return $null -ne $connection
    } catch {
        return $false
    }
}

function Start-Backend {
    $backendProcess = Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "cd '$scriptPath\backend'; Write-Host '=== BACKEND SERVER (Port 5000) ===' -ForegroundColor Cyan; node server.js"
    ) -WindowStyle Minimized -PassThru
    return $backendProcess
}

function Start-Frontend {
    $frontendProcess = Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "cd '$scriptPath\frontend'; Write-Host '=== FRONTEND SERVER (Port 3000) ===' -ForegroundColor Cyan; npm run dev"
    ) -WindowStyle Minimized -PassThru
    return $frontendProcess
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Monitoring des Serveurs MonCondo+" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Vérification toutes les $CheckInterval secondes" -ForegroundColor Yellow
Write-Host "Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Yellow
Write-Host ""

$backendProcess = $null
$frontendProcess = $null

# Démarrer les serveurs initialement
Write-Host "[Initialisation] Vérification des serveurs..." -ForegroundColor Cyan

if (-not (Test-Port -Port 5000)) {
    Write-Host "[Backend] Démarrage..." -ForegroundColor Yellow
    $backendProcess = Start-Backend
    Start-Sleep -Seconds 5
}

if (-not (Test-Port -Port 3000)) {
    Write-Host "[Frontend] Démarrage..." -ForegroundColor Yellow
    $frontendProcess = Start-Frontend
    Start-Sleep -Seconds 8
}

# Boucle de monitoring
while ($true) {
    $backendRunning = Test-Port -Port 5000
    $frontendRunning = Test-Port -Port 3000
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    
    if ($backendRunning -and $frontendRunning) {
        Write-Host "[$timestamp] ✅ Tous les serveurs sont actifs" -ForegroundColor Green
    } else {
        Write-Host "[$timestamp] ⚠️  Problème détecté:" -ForegroundColor Yellow
        
        if (-not $backendRunning) {
            Write-Host "  ❌ Backend (port 5000) non disponible" -ForegroundColor Red
            if ($AutoRestart) {
                Write-Host "  [Auto-restart] Redémarrage du backend..." -ForegroundColor Yellow
                $backendProcess = Start-Backend
                Start-Sleep -Seconds 5
            }
        }
        
        if (-not $frontendRunning) {
            Write-Host "  ❌ Frontend (port 3000) non disponible" -ForegroundColor Red
            if ($AutoRestart) {
                Write-Host "  [Auto-restart] Redémarrage du frontend..." -ForegroundColor Yellow
                $frontendProcess = Start-Frontend
                Start-Sleep -Seconds 8
            }
        }
    }
    
    Start-Sleep -Seconds $CheckInterval
}


