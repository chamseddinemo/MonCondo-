# Script PowerShell pour redémarrer le serveur backend
# Usage: .\redemarrer-serveur.ps1

Write-Host "🔄 Redémarrage du serveur backend..." -ForegroundColor Yellow

# Arrêter le serveur s'il est déjà en cours d'exécution
Write-Host "⏹️  Arrêt du serveur..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*node.exe" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Attendre quelques secondes
Start-Sleep -Seconds 2

# Changer de répertoire vers backend
Set-Location -Path "backend"

# Démarrer le serveur
Write-Host "▶️  Démarrage du serveur..." -ForegroundColor Green
npm start
