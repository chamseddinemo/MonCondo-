# Script pour demarrer le frontend MonCondo+

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "     DEMARRAGE DU FRONTEND MONCONDO+" -ForegroundColor Cyan
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

if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "[ATTENTION] Installation des dependances frontend..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERREUR] Erreur lors de l'installation des dependances!" -ForegroundColor Red
        Set-Location ..
        exit 1
    }
    Set-Location ..
    Write-Host "[OK] Dependances installees" -ForegroundColor Green
} else {
    Write-Host "[OK] Dependances frontend: OK" -ForegroundColor Green
}

# Verifier si le port 3000 est disponible
Write-Host ""
Write-Host "Verification du port 3000..." -ForegroundColor Cyan

$port3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "[ATTENTION] Le port 3000 est deja utilise!" -ForegroundColor Yellow
    $process = Get-Process -Id $port3000.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "   Processus existant: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Yellow
        $response = Read-Host "   Voulez-vous arreter ce processus? (O/N)"
        if ($response -eq 'O' -or $response -eq 'o') {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
            Write-Host "[OK] Processus arrete" -ForegroundColor Green
        } else {
            Write-Host "[ERREUR] Impossible de demarrer: le port 3000 est occupe" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "[OK] Port 3000 disponible" -ForegroundColor Green
}

# Demarrer le frontend
Write-Host ""
Write-Host "Demarrage du frontend (Port 3000)..." -ForegroundColor Cyan
Write-Host ""

$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; Write-Host 'Frontend MonCondo+ - Port 3000' -ForegroundColor Green; Write-Host ''; npm run dev" -PassThru

if ($frontendProcess) {
    Write-Host "[OK] Processus frontend demarre (PID: $($frontendProcess.Id))" -ForegroundColor Green
}

Write-Host ""
Write-Host "Attente du demarrage du serveur (15 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Verifier que le frontend est accessible
Write-Host ""
Write-Host "Verification de l'acces au frontend..." -ForegroundColor Cyan

$maxRetries = 5
$retryCount = 0
$frontendHealthy = $false

while ($retryCount -lt $maxRetries -and -not $frontendHealthy) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $frontendHealthy = $true
            Write-Host "[OK] Frontend: Operationnel!" -ForegroundColor Green
        }
    } catch {
        $retryCount++
        if ($retryCount -lt $maxRetries) {
            Write-Host "[ATTENTION] Tentative $retryCount/$maxRetries..." -ForegroundColor Yellow
            Start-Sleep -Seconds 3
        }
    }
}

if (-not $frontendHealthy) {
    Write-Host ""
    Write-Host "[ATTENTION] Le frontend n'a pas repondu aux verifications" -ForegroundColor Yellow
    Write-Host "   Verifiez les logs dans la fenetre PowerShell du frontend" -ForegroundColor Yellow
    Write-Host "   Le serveur peut etre en cours de demarrage, attendez quelques secondes" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "           FRONTEND DEMARRE AVEC SUCCES" -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
}

Write-Host ""
Write-Host "URLs d'acces:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "   Backend API: http://localhost:5000/api" -ForegroundColor Yellow
Write-Host ""
Write-Host "Notes:" -ForegroundColor Cyan
Write-Host "   - Le frontend est demarre dans une fenetre PowerShell separee" -ForegroundColor Gray
Write-Host "   - Fermez la fenetre pour arreter le serveur" -ForegroundColor Gray
Write-Host "   - Les logs s'affichent dans la fenetre PowerShell" -ForegroundColor Gray
Write-Host ""
Write-Host "Le frontend est pret!" -ForegroundColor Green
Write-Host ""

