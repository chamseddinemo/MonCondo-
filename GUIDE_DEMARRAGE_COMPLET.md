# 🚀 Guide Complet de Démarrage - MonCondo+

## ✅ Problème Résolu : "Ce site est inaccessible - localhost n'autorise pas la connexion"

### 🔧 Solution Appliquée
Les serveurs ont été démarrés automatiquement :
- ✅ **Frontend** : http://localhost:3000 (ACTIF)
- ✅ **Backend** : http://localhost:5000/api (ACTIF)

## 📋 Méthodes de Démarrage

### Méthode 1 : Script Automatique (Recommandé)

#### Windows (BAT)
Double-cliquez sur `START_SERVERS.bat` à la racine du projet.

#### Windows PowerShell
```powershell
.\START_SERVERS.ps1
```

### Méthode 2 : Démarrage Manuel

#### Terminal 1 - Backend
```powershell
cd backend
node server.js
```

#### Terminal 2 - Frontend
```powershell
cd frontend
npm run dev
```

## 🔍 Vérification des Serveurs

### Vérifier que les serveurs sont actifs

**Frontend (port 3000) :**
```powershell
netstat -ano | findstr ":3000"
```

**Backend (port 5000) :**
```powershell
netstat -ano | findstr ":5000"
```

### Accéder à l'application

1. **Frontend** : Ouvrez votre navigateur et allez sur http://localhost:3000
2. **Backend API** : http://localhost:5000/api

## 🛠️ Dépannage

### Problème : Port déjà utilisé

#### Solution 1 : Arrêter le processus
```powershell
# Trouver le processus
netstat -ano | findstr ":3000"
# ou
netstat -ano | findstr ":5000"

# Arrêter le processus (remplacez <PID> par le numéro trouvé)
taskkill /PID <PID> /F
```

#### Solution 2 : Utiliser le script PowerShell
Le script `START_SERVERS.ps1` arrête automatiquement les processus existants.

### Problème : Erreur de connexion à la base de données

1. Vérifiez que MongoDB est démarré
2. Vérifiez le fichier `backend/.env` :
   ```env
   MONGODB_URI=mongodb://localhost:27017/moncondo
   ```

### Problème : Erreur de compilation Next.js

1. Supprimez le dossier `.next` :
   ```powershell
   cd frontend
   Remove-Item -Recurse -Force .next
   ```

2. Réinstallez les dépendances :
   ```powershell
   npm install
   ```

3. Redémarrez le serveur :
   ```powershell
   npm run dev
   ```

### Problème : Google Maps ne s'affiche pas

1. Vérifiez le fichier `frontend/.env.local` :
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCnZ_Z7qq7e9P-9w67GuxR0IhTMQUJuL5k
   ```

2. Redémarrez le serveur frontend après modification du `.env.local`

## ✅ Checklist de Vérification

- [ ] Backend démarré sur http://localhost:5000
- [ ] Frontend démarré sur http://localhost:3000
- [ ] MongoDB connecté et fonctionnel
- [ ] Google Maps API configurée dans `.env.local`
- [ ] Aucune erreur dans les consoles des serveurs
- [ ] L'application s'affiche correctement dans le navigateur

## 📝 Notes Importantes

1. **Ordre de démarrage** : Démarrez toujours le backend avant le frontend
2. **Temps de démarrage** : Attendez 5-10 secondes après le démarrage pour que les serveurs soient prêts
3. **Fenêtres de serveur** : Ne fermez pas les fenêtres PowerShell où les serveurs tournent
4. **Modifications** : Après modification du code, les serveurs se rechargent automatiquement (hot reload)

## 🎯 Prochaines Étapes

1. ✅ Accédez à http://localhost:3000
2. ✅ Connectez-vous avec vos identifiants
3. ✅ Testez la fonctionnalité Google Maps sur les pages d'immeubles/unités
4. ✅ Vérifiez que tout fonctionne correctement

## 🆘 Support

Si vous rencontrez toujours des problèmes :

1. Vérifiez les logs dans les fenêtres PowerShell des serveurs
2. Vérifiez la console du navigateur (F12)
3. Consultez les fichiers de documentation :
   - `DEMARRAGE_SERVEURS.md`
   - `DEPANNAGE_GOOGLE_MAPS.md`

---

**✨ Les serveurs sont maintenant démarrés et fonctionnels à 100% !**

