# Script pour démarrer Backend et Frontend ensemble

# Windows PowerShell
Write-Host "🚀 Démarrage de MonCondo+..." -ForegroundColor Green
Write-Host ""

# Démarrer le backend
Write-Host "📦 Démarrage du backend sur le port 5000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm start"
Start-Sleep -Seconds 3

# Démarrer le frontend
Write-Host "🎨 Démarrage du frontend sur le port 3001..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host ""
Write-Host "✅ Les deux serveurs sont en cours de démarrage..." -ForegroundColor Green
Write-Host ""
Write-Host "📍 Backend:  http://localhost:5000" -ForegroundColor Yellow
Write-Host "📍 Frontend: http://localhost:3001" -ForegroundColor Yellow
Write-Host ""
Write-Host "⏳ Attendez quelques secondes que les serveurs démarrent complètement." -ForegroundColor White
Write-Host ""



