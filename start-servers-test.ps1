# Script pour demarrer les serveurs et tester la messagerie

Write-Host "Demarrage de MonCondo+ pour test de messagerie..." -ForegroundColor Green
Write-Host ""

# Tuer les anciens processus Node.js
Write-Host "Nettoyage des processus existants..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object { 
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2

# Demarrer le backend dans une nouvelle fenetre
Write-Host "Demarrage du backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; Write-Host 'Demarrage du backend...' -ForegroundColor Green; npm start"

# Attendre que le backend demarre
Write-Host "Attente du demarrage du backend (15 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Vérifier que le backend est démarré
$backendRunning = $false
try {
    # Tenter une connexion au backend (on ignore la réponse, on vérifie juste qu'il répond)
    $null = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test@test.com","password":"test"}' -ErrorAction Stop
    $backendRunning = $true
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401 -or $_.Exception.Response.StatusCode.value__ -eq 400) {
        $backendRunning = $true
    }
}

if ($backendRunning) {
    Write-Host "Backend demarre sur le port 5000" -ForegroundColor Green
} else {
    Write-Host "Le backend ne repond pas. Verifiez la fenetre backend pour les erreurs." -ForegroundColor Red
    Write-Host "Probleme possible: MongoDB non connecte" -ForegroundColor Yellow
    exit 1
}

# Demarrer le frontend dans une nouvelle fenetre
Write-Host "Demarrage du frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; Write-Host 'Demarrage du frontend...' -ForegroundColor Green; npm run dev"

# Attendre que le frontend demarre
Write-Host "Attente du demarrage du frontend (15 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "Serveurs demarres!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3001" -ForegroundColor Yellow
Write-Host ""
Write-Host "Comptes de test pour la messagerie:" -ForegroundColor Cyan
Write-Host "   1. Admin:           admin@moncondo.com / admin123" -ForegroundColor White
Write-Host "   2. Jean Dupont:     jean.dupont@example.com / password123" -ForegroundColor White
Write-Host "   3. Pierre Tremblay: pierre.tremblay@example.com / password123" -ForegroundColor White
Write-Host "   4. Sophie Gagnon:   sophie.gagnon@example.com / password123" -ForegroundColor White
Write-Host ""
Write-Host "Pour tester la messagerie:" -ForegroundColor Green
Write-Host "   1. Ouvrez http://localhost:3001 dans deux navigateurs differents (ou deux onglets incognito)" -ForegroundColor White
Write-Host "   2. Connectez-vous avec deux comptes differents" -ForegroundColor White
Write-Host "   3. Allez dans Messages dans le menu" -ForegroundColor White
Write-Host "   4. Cliquez sur Nouveau message et selectionnez un contact" -ForegroundColor White
Write-Host "   5. Envoyez des messages et voyez-les apparaitre en temps reel!" -ForegroundColor White
Write-Host ""
Write-Host "Astuce: Ouvrez la console developpeur (F12) pour voir les logs Socket.io" -ForegroundColor Cyan
Write-Host ""

