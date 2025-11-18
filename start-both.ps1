# Script pour demarrer backend et frontend

Write-Host "Demarrage des serveurs MonCondo+..." -ForegroundColor Green
Write-Host ""

# Tuer les anciens processus
Write-Host "Nettoyage des processus existants..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | ForEach-Object { 
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2

# Demarrer le backend
Write-Host "Demarrage du backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; Write-Host 'Backend - Port 5000' -ForegroundColor Green; npm start"

Start-Sleep -Seconds 3

# Demarrer le frontend
Write-Host "Demarrage du frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; Write-Host 'Frontend - Port 3001' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "Les serveurs demarrent dans 2 fenetres separees..." -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:5000" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3001" -ForegroundColor Yellow
Write-Host ""
Write-Host "POUR TESTER LA MESSAGERIE:" -ForegroundColor Cyan
Write-Host "1. Ouvrez 2 navigateurs (Chrome et Firefox)" -ForegroundColor White
Write-Host "2. Connectez-vous avec:" -ForegroundColor White
Write-Host "   - admin@moncondo.com / admin123" -ForegroundColor Gray
Write-Host "   - pierre.tremblay@example.com / password123" -ForegroundColor Gray
Write-Host "3. Allez sur Messages et echangez des messages!" -ForegroundColor White
Write-Host ""

