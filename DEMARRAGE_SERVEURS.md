# 🚀 Guide de Démarrage des Serveurs MonCondo+

## ⚠️ Problème Résolu : "Ce site est inaccessible - localhost n'autorise pas la connexion"

### Cause
Le serveur de développement Next.js n'était pas démarré sur le port 3000.

### Solution
Les serveurs ont été démarrés automatiquement.

## 📋 Commandes de Démarrage Manuel

### Option 1 : Démarrage Automatique (Recommandé)
Les serveurs sont maintenant démarrés en arrière-plan.

### Option 2 : Démarrage Manuel

#### Backend (Port 5000)
```powershell
cd backend
node server.js
```

#### Frontend (Port 3000)
```powershell
cd frontend
npm run dev
```

## 🔍 Vérification

### Vérifier que les serveurs sont démarrés

**Backend (port 5000) :**
```powershell
netstat -ano | findstr ":5000"
```

**Frontend (port 3000) :**
```powershell
netstat -ano | findstr ":3000"
```

### Accéder à l'application

- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:5000/api

## 🛠️ Dépannage

### Si le port 3000 est déjà utilisé
1. Trouver le processus :
```powershell
netstat -ano | findstr ":3000"
```

2. Arrêter le processus :
```powershell
taskkill /PID <PID> /F
```

3. Redémarrer le serveur frontend

### Si le port 5000 est déjà utilisé
1. Trouver le processus :
```powershell
netstat -ano | findstr ":5000"
```

2. Arrêter le processus :
```powershell
taskkill /PID <PID> /F
```

3. Redémarrer le serveur backend

## ✅ Vérification Finale

1. ✅ Backend démarré sur http://localhost:5000
2. ✅ Frontend démarré sur http://localhost:3000
3. ✅ Google Maps API configurée dans `.env.local`
4. ✅ Base de données MongoDB connectée

## 📝 Notes

- Les serveurs doivent être démarrés **avant** d'accéder à l'application
- Le frontend nécessite le backend pour fonctionner correctement
- En cas d'erreur, vérifier les logs dans les fenêtres PowerShell ouvertes

