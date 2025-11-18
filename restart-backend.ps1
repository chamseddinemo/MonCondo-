# Script pour redémarrer le backend avec les nouvelles modifications
Write-Host "🔄 Redémarrage du backend..." -ForegroundColor Cyan

# Arrêter tous les processus Node.js liés au backend
Write-Host "`n1️⃣ Arrêt des processus Node.js existants..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    foreach ($proc in $nodeProcesses) {
        try {
            $procPath = (Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)").CommandLine
            if ($procPath -like "*backend*" -or $procPath -like "*server.js*") {
                Write-Host "   Arrêt du processus $($proc.Id)..." -ForegroundColor Gray
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            }
        } catch {
            # Ignorer les erreurs
        }
    }
    Start-Sleep -Seconds 2
}

# Attendre que les ports soient libres
Write-Host "`n2️⃣ Vérification du port 5000..." -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "   ⚠️  Le port 5000 est encore utilisé, attente..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}

# Démarrer le backend
Write-Host "`n3️⃣ Démarrage du backend..." -ForegroundColor Yellow
Set-Location backend
$backendProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -PassThru -NoNewWindow

Write-Host "   ✅ Backend démarré (PID: $($backendProcess.Id))" -ForegroundColor Green

# Attendre que le serveur démarre
Write-Host "`n4️⃣ Attente du démarrage du serveur..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Vérifier que le serveur répond
Write-Host "`n5️⃣ Vérification de la santé du backend..." -ForegroundColor Yellow
$maxRetries = 10
$retryCount = 0
$healthCheckPassed = $false

while ($retryCount -lt $maxRetries -and -not $healthCheckPassed) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method GET -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $healthCheckPassed = $true
            Write-Host "   ✅ Backend opérationnel!" -ForegroundColor Green
        }
    } catch {
        $retryCount++
        Write-Host "   ⏳ Tentative $retryCount/$maxRetries..." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $healthCheckPassed) {
    Write-Host "   ⚠️  Le backend ne répond pas encore. Vérifiez les logs." -ForegroundColor Yellow
}

# Vérifier que la route /api/buildings est chargée
Write-Host "`n6️⃣ Vérification de la route /api/buildings..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/buildings" -Method GET -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   ⚠️  Route accessible sans token (inattendu, devrait être 401)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401) {
        Write-Host "   ✅ Route trouvée (401 = authentification requise, c'est normal)" -ForegroundColor Green
    } elseif ($_.Exception.Response.StatusCode.value__ -eq 404) {
        Write-Host "   ❌ Route non trouvée (404). Vérifiez les logs du backend." -ForegroundColor Red
        Write-Host "   💡 Vérifiez que buildingRoutes.js est correctement chargé dans server.js" -ForegroundColor Yellow
    } else {
        Write-Host "   ⚠️  Erreur: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ Redémarrage terminé!" -ForegroundColor Green
Write-Host "`n📋 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "   1. Vérifiez les logs du backend dans le terminal" -ForegroundColor White
Write-Host "   2. Cherchez les messages '[BUILDING ROUTES]' et '[SERVER]'" -ForegroundColor White
Write-Host "   3. Testez la route avec: node test-buildings-route-simple.js" -ForegroundColor White

Set-Location ..
