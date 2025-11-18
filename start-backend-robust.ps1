# Script robuste pour demarrer le backend MonCondo+
# Verifie la sante du serveur et affiche des messages clairs

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "     DEMARRAGE ROBUSTE DU BACKEND MONCONDO+" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Verifier si Node.js est installe
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js installe: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERREUR] Node.js n'est pas installe!" -ForegroundColor Red
    Write-Host "   Veuillez installer Node.js depuis https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Verifier si les dependances sont installees
Write-Host ""
Write-Host "Verification des dependances..." -ForegroundColor Cyan

if (-not (Test-Path "backend\node_modules")) {
    Write-Host "[ATTENTION] Installation des dependances backend..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERREUR] Erreur lors de l'installation des dependances!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..
    Write-Host "[OK] Dependances installees" -ForegroundColor Green
} else {
    Write-Host "[OK] Dependances backend: OK" -ForegroundColor Green
}

# Verifier si le port 5000 est disponible
Write-Host ""
Write-Host "Verification du port 5000..." -ForegroundColor Cyan

$port5000 = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if ($port5000) {
    Write-Host "[ATTENTION] Le port 5000 est deja utilise!" -ForegroundColor Yellow
    $process = Get-Process -Id $port5000.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "   Processus existant: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Yellow
        $response = Read-Host "   Voulez-vous arreter ce processus? (O/N)"
        if ($response -eq 'O' -or $response -eq 'o') {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            Write-Host "[OK] Processus arrete" -ForegroundColor Green
        } else {
            Write-Host "[ERREUR] Impossible de demarrer: le port 5000 est occupe" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "[OK] Port 5000 disponible" -ForegroundColor Green
}

# Demarrer le backend
Write-Host ""
Write-Host "Demarrage du backend (Port 5000)..." -ForegroundColor Cyan
Write-Host ""

$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host 'Backend MonCondo+ - Port 5000' -ForegroundColor Green; Write-Host ''; npm start" -PassThru

if ($backendProcess) {
    Write-Host "[OK] Processus backend demarre (PID: $($backendProcess.Id))" -ForegroundColor Green
}

# Attendre que le serveur demarre
Write-Host "Attente du demarrage du serveur (15 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Verifier la sante du backend
Write-Host ""
Write-Host "Verification de la sante du backend..." -ForegroundColor Cyan

$maxRetries = 5
$retryCount = 0
$backendHealthy = $false

while ($retryCount -lt $maxRetries -and -not $backendHealthy) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $healthData = $response.Content | ConvertFrom-Json
            if ($healthData.success) {
                $backendHealthy = $true
                Write-Host "[OK] Backend: Operationnel!" -ForegroundColor Green
                Write-Host "   Message: $($healthData.message)" -ForegroundColor Gray
                Write-Host "   Port: $($healthData.port)" -ForegroundColor Gray
                Write-Host "   Uptime: $([math]::Round($healthData.uptime, 2)) secondes" -ForegroundColor Gray
            }
        }
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Host "[ATTENTION] Tentative $retryCount/$maxRetries..." -ForegroundColor Yellow
            Start-Sleep -Seconds 3
        }
    }
}

if (-not $backendHealthy) {
    Write-Host ""
    Write-Host "[ATTENTION] Le backend n'a pas repondu aux verifications de sante" -ForegroundColor Yellow
    Write-Host "   Verifiez les logs dans la fenetre PowerShell du backend" -ForegroundColor Yellow
    Write-Host "   Le serveur peut etre en cours de demarrage, attendez quelques secondes" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "           BACKEND DEMARRE AVEC SUCCES" -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
}

Write-Host ""
Write-Host "URLs d'acces:" -ForegroundColor Cyan
Write-Host "   Backend API: http://localhost:5000/api" -ForegroundColor Yellow
Write-Host "   Health Check: http://localhost:5000/api/health" -ForegroundColor Yellow
Write-Host ""
Write-Host "Notes:" -ForegroundColor Cyan
Write-Host "   - Le backend est demarre dans une fenetre PowerShell separee" -ForegroundColor Gray
Write-Host "   - Fermez la fenetre pour arreter le serveur" -ForegroundColor Gray
Write-Host "   - Les logs s'affichent dans la fenetre PowerShell" -ForegroundColor Gray
Write-Host ""
Write-Host "Le backend est pret a recevoir des requetes!" -ForegroundColor Green
Write-Host ""
