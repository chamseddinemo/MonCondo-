# Script de test pour vérifier la route de génération de documents
$separator = '=' * 60
Write-Host $separator -ForegroundColor Cyan
Write-Host "TEST: Route POST /api/requests/:id/generate-documents" -ForegroundColor Cyan
Write-Host $separator -ForegroundColor Cyan

# Configuration
$baseUrl = "http://localhost:5000/api"
$testRequestId = "TEST_ID"  # Remplacer par un vrai ID pour tester

Write-Host ""
Write-Host "1. Test de la santé du backend..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:5000/health" -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✅ Backend accessible (Status: $($healthResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   ⚠️  Assurez-vous que le backend est démarré (port 5000)" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "2. Test de la structure de la route..." -ForegroundColor Yellow
Write-Host "   Route attendue: POST $baseUrl/requests/:id/generate-documents" -ForegroundColor White
Write-Host "   Cette route doit être définie AVANT la route générique /:id" -ForegroundColor White

Write-Host ""
Write-Host "3. Vérification des fichiers..." -ForegroundColor Yellow
$requestRoutesFile = "backend/routes/requestRoutes.js"
$controllerFile = "backend/controllers/requestController.js"

if (Test-Path $requestRoutesFile) {
    Write-Host "   ✅ $requestRoutesFile existe" -ForegroundColor Green
    
    # Vérifier que generateDocuments est importé
    $routesContent = Get-Content $requestRoutesFile -Raw
    if ($routesContent -match "generateDocuments") {
        Write-Host "   ✅ generateDocuments est importé dans requestRoutes.js" -ForegroundColor Green
    } else {
        Write-Host "   ❌ generateDocuments n'est pas importé dans requestRoutes.js" -ForegroundColor Red
    }
    
    # Vérifier que la route est définie
    if ($routesContent -match "router\.post.*generate-documents") {
        Write-Host "   ✅ Route POST /:id/generate-documents est définie" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Route POST /:id/generate-documents n'est pas définie" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ $requestRoutesFile n'existe pas" -ForegroundColor Red
}

if (Test-Path $controllerFile) {
    Write-Host "   ✅ $controllerFile existe" -ForegroundColor Green
    
    # Vérifier que generateDocuments est exporté
    $controllerContent = Get-Content $controllerFile -Raw
    if ($controllerContent -match "exports\.generateDocuments") {
        Write-Host "   ✅ exports.generateDocuments est défini dans requestController.js" -ForegroundColor Green
    } else {
        Write-Host "   ❌ exports.generateDocuments n'est pas défini dans requestController.js" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ $controllerFile n'existe pas" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. Instructions pour tester manuellement..." -ForegroundColor Yellow
Write-Host "   Pour tester la route, vous devez:" -ForegroundColor White
Write-Host "   1. Redémarrer le backend pour charger les nouvelles routes" -ForegroundColor White
Write-Host "   2. Vous connecter en tant qu'admin" -ForegroundColor White
Write-Host "   3. Aller sur la page admin de la demande (Unité 101)" -ForegroundColor White
Write-Host "   4. Cliquer sur '📄 Générer les documents'" -ForegroundColor White
Write-Host "   5. Vérifier dans la console du navigateur l'URL exacte utilisée" -ForegroundColor White
Write-Host "   6. Vérifier dans la console du backend si la route est appelée" -ForegroundColor White

Write-Host ""
Write-Host $separator -ForegroundColor Cyan

