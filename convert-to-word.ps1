# Script PowerShell pour convertir le document Markdown en Word
# Nécessite pandoc (https://pandoc.org/installing.html)

$mdFile = "ANALYSE_PAGE_CLIENT_MonCondo+.md"
$docxFile = "ANALYSE_PAGE_CLIENT_MonCondo+.docx"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  CONVERSION EN WORD" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Vérifier si pandoc est installé
$pandocPath = Get-Command pandoc -ErrorAction SilentlyContinue

if (-not $pandocPath) {
    Write-Host "❌ Pandoc n'est pas installé." -ForegroundColor Red
    Write-Host "`n📥 Pour installer Pandoc:" -ForegroundColor Yellow
    Write-Host "   1. Téléchargez depuis: https://pandoc.org/installing.html" -ForegroundColor White
    Write-Host "   2. Ou installez via Chocolatey: choco install pandoc" -ForegroundColor White
    Write-Host "`n💡 Alternative:" -ForegroundColor Yellow
    Write-Host "   - Ouvrez le fichier .md dans Microsoft Word" -ForegroundColor White
    Write-Host "   - Word peut convertir automatiquement le Markdown" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Vérifier si le fichier source existe
if (-not (Test-Path $mdFile)) {
    Write-Host "❌ Fichier source introuvable: $mdFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Pandoc trouvé: $($pandocPath.Source)" -ForegroundColor Green
Write-Host "📄 Fichier source: $mdFile" -ForegroundColor White
Write-Host "📝 Fichier de sortie: $docxFile`n" -ForegroundColor White

# Convertir
Write-Host "🔄 Conversion en cours..." -ForegroundColor Yellow
try {
    pandoc $mdFile -o $docxFile --from markdown --to docx --standalone --toc --toc-depth=3
    
    if (Test-Path $docxFile) {
        Write-Host "`n✅ Conversion réussie!" -ForegroundColor Green
        Write-Host "📄 Fichier Word créé: $docxFile" -ForegroundColor White
        Write-Host "`n💡 Vous pouvez maintenant ouvrir le fichier dans Microsoft Word." -ForegroundColor Cyan
    } else {
        Write-Host "`n❌ Erreur lors de la conversion." -ForegroundColor Red
    }
} catch {
    Write-Host "`n❌ Erreur: $_" -ForegroundColor Red
}

Write-Host ""

