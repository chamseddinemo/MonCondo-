# Script de vérification et démarrage automatique des serveurs MonCondo+

param(
    [switch]$AutoStart = $false,
    [switch]$Silent = $false
)

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

function Write-Status {
    param([string]$Message, [string]$Color = "White")
    if (-not $Silent) {
        Write-Host $Message -ForegroundColor $Color
    }
}

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
    $backendRunning = Test-Port -Port 5000
    
    if ($backendRunning) {
        Write-Status "✅ Backend déjà actif sur le port 5000" "Green"
        return $true
    }
    
    Write-Status "[Backend] Démarrage du serveur..." "Yellow"
    
    try {
        $backendProcess = Start-Process powershell -ArgumentList @(
            "-NoExit",
            "-Command",
            "cd '$scriptPath\backend'; Write-Host '=== BACKEND SERVER (Port 5000) ===' -ForegroundColor Cyan; Write-Host 'Démarrage...' -ForegroundColor Yellow; node server.js"
        ) -WindowStyle Minimized -PassThru
        
        Start-Sleep -Seconds 5
        
        $backendRunning = Test-Port -Port 5000
        if ($backendRunning) {
            Write-Status "✅ Backend démarré avec succès (PID: $($backendProcess.Id))" "Green"
            return $true
        } else {
            Write-Status "⚠️  Backend en cours de démarrage, veuillez patienter..." "Yellow"
            return $false
        }
    } catch {
        Write-Status "❌ Erreur lors du démarrage du backend: $_" "Red"
        return $false
    }
}

function Start-Frontend {
    $frontendRunning = Test-Port -Port 3000
    
    if ($frontendRunning) {
        Write-Status "✅ Frontend déjà actif sur le port 3000" "Green"
        return $true
    }
    
    Write-Status "[Frontend] Démarrage du serveur..." "Yellow"
    
    try {
        $frontendProcess = Start-Process powershell -ArgumentList @(
            "-NoExit",
            "-Command",
            "cd '$scriptPath\frontend'; Write-Host '=== FRONTEND SERVER (Port 3000) ===' -ForegroundColor Cyan; Write-Host 'Démarrage...' -ForegroundColor Yellow; npm run dev"
        ) -WindowStyle Minimized -PassThru
        
        Start-Sleep -Seconds 8
        
        $frontendRunning = Test-Port -Port 3000
        if ($frontendRunning) {
            Write-Status "✅ Frontend démarré avec succès (PID: $($frontendProcess.Id))" "Green"
            return $true
        } else {
            Write-Status "⚠️  Frontend en cours de démarrage, veuillez patienter..." "Yellow"
            return $false
        }
    } catch {
        Write-Status "❌ Erreur lors du démarrage du frontend: $_" "Red"
        return $false
    }
}

# Vérification et démarrage
Write-Status ""
Write-Status "========================================" "Cyan"
Write-Status "  Vérification des Serveurs MonCondo+" "Cyan"
Write-Status "========================================" "Cyan"
Write-Status ""

$backendOk = Start-Backend
$frontendOk = Start-Frontend

Write-Status ""
Write-Status "========================================" "Cyan"
Write-Status "  Résultat" "Cyan"
Write-Status "========================================" "Cyan"
Write-Status ""

if ($backendOk) {
    Write-Status "Backend:  http://localhost:5000/api ✅" "Green"
} else {
    Write-Status "Backend:  ❌ Non disponible" "Red"
}

if ($frontendOk) {
    Write-Status "Frontend: http://localhost:3000 ✅" "Green"
} else {
    Write-Status "Frontend: ❌ Non disponible" "Red"
}

if ($backendOk -and $frontendOk) {
    Write-Status ""
    Write-Status "✨ Tous les serveurs sont actifs !" "Green"
    Write-Status ""
    Write-Status "💡 Ouvrez http://localhost:3000 dans votre navigateur" "Cyan"
    exit 0
} else {
    Write-Status ""
    Write-Status "⚠️  Certains serveurs ne sont pas disponibles" "Yellow"
    Write-Status "   Attendez quelques secondes et réessayez" "Yellow"
    exit 1
}


