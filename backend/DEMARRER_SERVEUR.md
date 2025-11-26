# 🚀 Comment Démarrer le Serveur Backend

## ✅ MongoDB Atlas Configuré!

MongoDB est connecté avec succès! Le serveur backend doit maintenant être démarré.

## 📋 Instructions de Démarrage

### Option 1: Terminal PowerShell (Recommandé)

1. **Ouvrez un nouveau terminal PowerShell**
2. **Naviguez vers le dossier backend:**
   ```powershell
   cd C:\Users\Acer\Desktop\MonCondo+\backend
   ```

3. **Démarrez le serveur:**
   ```powershell
   npm run dev
   ```

4. **Attendez de voir ces messages:**
   ```
   [SERVER] ✅ Serveur démarré sur le port 5000
   [DATABASE] ✅ MongoDB connecté: ac-xzxt6oz-shard-00-00.kohukjc.mongodb.net
   [DATABASE] 📊 Base de données: MonCondo+
   ```

5. **Le serveur est maintenant accessible sur:**
   - http://localhost:5000
   - http://localhost:5000/api/health

### Option 2: Script PowerShell

Créez un fichier `start-backend.ps1` dans le dossier `backend`:

```powershell
cd $PSScriptRoot
Write-Host "🚀 Démarrage du serveur backend..." -ForegroundColor Cyan
npm run dev
```

Puis exécutez:
```powershell
.\start-backend.ps1
```

## 🧪 Tester le Serveur

### Dans le Navigateur
Ouvrez: **http://localhost:5000/api/health**

Vous devriez voir:
```json
{
  "success": true,
  "message": "Backend MonCondo+ est opérationnel",
  "port": "5000"
}
```

### Avec PowerShell
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/health"
```

### Tests Complets
Dans un **autre terminal**, exécutez:
```powershell
cd backend
node scripts/test-complete-backend.js
```

## ⚠️ Problèmes Courants

### "Port 5000 already in use"
**Solution:** Arrêtez les processus Node.js:
```powershell
Get-Process -Name node | Stop-Process -Force
```

### "Cannot find module"
**Solution:** Installez les dépendances:
```powershell
npm install
```

### "MongoDB connection error"
**Solution:** Vérifiez que MongoDB Atlas Network Access est configuré (déjà fait ✅)

## ✅ Vérification

Une fois le serveur démarré, vous devriez voir:
- ✅ Serveur écoute sur le port 5000
- ✅ MongoDB connecté
- ✅ Routes API accessibles
- ✅ Health check fonctionne

## 🎉 Félicitations!

Votre backend est maintenant **100% opérationnel**!

