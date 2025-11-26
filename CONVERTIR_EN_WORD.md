# 📄 Comment Convertir l'Analyse en Word (.docx)

## Méthode 1 : Pandoc (Recommandé)

### Installation de Pandoc

**Windows** :
1. Télécharger depuis : https://github.com/jgm/pandoc/releases/latest
2. Installer l'exécutable `.msi`
3. Vérifier l'installation : `pandoc --version`

**Via Chocolatey** :
```powershell
choco install pandoc
```

### Conversion

```bash
cd C:\Users\Acer\Desktop\MonCondo+
pandoc ANALYSE_COMPLETE_PROJET_MonCondo+.md -o ANALYSE_COMPLETE_PROJET_MonCondo+.docx
```

## Méthode 2 : Microsoft Word

1. Ouvrir Microsoft Word
2. Fichier → Ouvrir → Sélectionner `ANALYSE_COMPLETE_PROJET_MonCondo+.md`
3. Word convertira automatiquement le Markdown
4. Fichier → Enregistrer sous → Format : Word Document (.docx)

## Méthode 3 : Outils En Ligne

1. Aller sur https://www.markdowntoword.com/
2. Uploader le fichier `.md`
3. Télécharger le fichier `.docx` généré

## Méthode 4 : VS Code Extension

1. Installer l'extension "Markdown PDF" dans VS Code
2. Ouvrir le fichier `.md`
3. Clic droit → "Markdown PDF: Export (docx)"

---

**Fichier source** : `ANALYSE_COMPLETE_PROJET_MonCondo+.md`  
**Fichier cible** : `ANALYSE_COMPLETE_PROJET_MonCondo+.docx`

