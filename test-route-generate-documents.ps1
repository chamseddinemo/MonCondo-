# Script de test pour vérifier la route generate-documents
$separator = '=' * 60
Write-Host $separator -ForegroundColor Cyan
Write-Host "🔍 TEST: Route POST /api/requests/:id/generate-documents" -ForegroundColor Cyan
Write-Host $separator -ForegroundColor Cyan

Write-Host ""
Write-Host "1. Vérification que le backend est démarré..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✅ Backend accessible (Status: $($healthResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   ⚠️  Démarrez le backend avec: cd backend && npm start" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "2. Vérification des fichiers..." -ForegroundColor Yellow

# Vérifier que la route est définie dans requestRoutes.js
$requestRoutesFile = "backend/routes/requestRoutes.js"
if (Test-Path $requestRoutesFile) {
    $content = Get-Content $requestRoutesFile -Raw
    if ($content -match "router\.post\('/:id/generate-documents'") {
        Write-Host "   ✅ Route POST /:id/generate-documents trouvée dans requestRoutes.js" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Route POST /:id/generate-documents NON trouvée dans requestRoutes.js" -ForegroundColor Red
    }
    
    if ($content -match "generateDocuments") {
        Write-Host "   ✅ generateDocuments trouvé dans requestRoutes.js" -ForegroundColor Green
    } else {
        Write-Host "   ❌ generateDocuments NON trouvé dans requestRoutes.js" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ Fichier requestRoutes.js non trouvé" -ForegroundColor Red
}

# Vérifier que la fonction est exportée dans requestController.js
$controllerFile = "backend/controllers/requestController.js"
if (Test-Path $controllerFile) {
    $content = Get-Content $controllerFile -Raw
    if ($content -match "exports\.generateDocuments") {
        Write-Host "   ✅ exports.generateDocuments trouvé dans requestController.js" -ForegroundColor Green
    } else {
        Write-Host "   ❌ exports.generateDocuments NON trouvé dans requestController.js" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ Fichier requestController.js non trouvé" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Vérification de l'ordre des routes..." -ForegroundColor Yellow
if (Test-Path $requestRoutesFile) {
    $lines = Get-Content $requestRoutesFile
    $generateDocsLine = -1
    $genericRouteLine = -1
    
    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match "router\.post\('/:id/generate-documents'") {
            $generateDocsLine = $i + 1
        }
        if ($lines[$i] -match "router\.route\('/:id'\)") {
            $genericRouteLine = $i + 1
        }
    }
    
    if ($generateDocsLine -gt 0 -and $genericRouteLine -gt 0) {
        if ($generateDocsLine -lt $genericRouteLine) {
            Write-Host "   ✅ Route generate-documents (ligne $generateDocsLine) est AVANT la route générique (ligne $genericRouteLine)" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Route generate-documents (ligne $generateDocsLine) est APRÈS la route générique (ligne $genericRouteLine)" -ForegroundColor Red
            Write-Host "   ⚠️  La route generate-documents doit être définie AVANT la route générique /:id" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ⚠️  Impossible de déterminer l'ordre des routes" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "4. Instructions pour résoudre le problème..." -ForegroundColor Yellow
Write-Host "   Si la route n'est toujours pas trouvée:" -ForegroundColor White
Write-Host "   1. Assurez-vous que le backend est REDÉMARRÉ (Ctrl+C puis npm start)" -ForegroundColor White
Write-Host "   2. Vérifiez dans la console du backend que vous voyez:" -ForegroundColor White
Write-Host "      [REQUEST ROUTES] ✅✅ Route POST /:id/generate-documents confirmée" -ForegroundColor Cyan
Write-Host "   3. Vérifiez dans la console du navigateur (F12) l'URL exacte utilisée" -ForegroundColor White
Write-Host "   4. Vérifiez dans la console du backend si la requête arrive (logs [REQUEST ROUTES DEBUG])" -ForegroundColor White
Write-Host "   5. Vérifiez que vous êtes bien connecté en tant qu'admin" -ForegroundColor White

Write-Host ""
Write-Host "5. Test de la route avec un ID de test (nécessite un token admin valide)..." -ForegroundColor Yellow
Write-Host "   ⚠️  Pour tester la route, vous devez:" -ForegroundColor White
Write-Host "   - Vous connecter en tant qu'admin dans le frontend" -ForegroundColor White
Write-Host "   - Aller sur la page admin d'une demande acceptée" -ForegroundColor White
Write-Host "   - Cliquer sur 'Générer les documents'" -ForegroundColor White
Write-Host "   - Vérifier les logs dans la console du backend et du navigateur" -ForegroundColor White

Write-Host ""
Write-Host $separator -ForegroundColor Cyan
Write-Host "✅ Vérification terminée" -ForegroundColor Green
Write-Host $separator -ForegroundColor Cyan

