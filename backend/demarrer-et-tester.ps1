# Script pour démarrer le serveur et lancer les tests
Write-Host "🚀 Démarrage du serveur backend..." -ForegroundColor Cyan

# Démarrer le serveur en arrière-plan
$backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; Write-Host 'Backend démarré sur http://localhost:5000' -ForegroundColor Green; npm start" -PassThru

# Attendre que le serveur démarre
Write-Host "⏳ Attente du démarrage du serveur (30 secondes max)..." -ForegroundColor Yellow
$serverReady = $false
$attempts = 0
$maxAttempts = 30

while (-not $serverReady -and $attempts -lt $maxAttempts) {
    Start-Sleep -Seconds 1
    $attempts++
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api" -Method GET -TimeoutSec 2 -ErrorAction SilentlyContinue
        $serverReady = $true
        Write-Host "✅ Serveur backend prêt!" -ForegroundColor Green
    } catch {
        Write-Host "." -NoNewline
    }
}

Write-Host ""

if ($serverReady) {
    Write-Host "`n🧪 Lancement des tests complets..." -ForegroundColor Cyan
    Write-Host ""
    node test-complet-paiements.js
} else {
    Write-Host "`n❌ Le serveur n'a pas démarré dans les délais" -ForegroundColor Red
    Write-Host "Vérifiez les erreurs dans la fenêtre PowerShell du backend" -ForegroundColor Yellow
}

