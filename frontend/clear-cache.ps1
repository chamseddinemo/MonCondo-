# Script PowerShell pour nettoyer le cache Next.js
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  NETTOYAGE CACHE NEXT.JS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Arrêter le serveur si en cours d'exécution
Write-Host "🛑 Arrêt du serveur Next.js..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*next*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Supprimer le dossier .next
if (Test-Path ".next") {
    Write-Host "🗑️  Suppression du dossier .next..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".next"
    Write-Host "✅ Dossier .next supprimé" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Dossier .next introuvable (déjà supprimé)" -ForegroundColor Gray
}

# Supprimer node_modules/.cache si existe
if (Test-Path "node_modules\.cache") {
    Write-Host "🗑️  Suppression du cache node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "✅ Cache node_modules supprimé" -ForegroundColor Green
}

Write-Host "`n✅ Nettoyage terminé!" -ForegroundColor Green
Write-Host "`n💡 Redémarrez le serveur avec: npm run dev" -ForegroundColor Cyan
Write-Host "💡 Videz le cache du navigateur avec: Ctrl+Shift+R" -ForegroundColor Cyan
Write-Host ""

