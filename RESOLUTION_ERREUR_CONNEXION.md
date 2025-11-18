# 🔧 Résolution de l'Erreur de Connexion

## Problème
Erreur de connexion lors de l'accès à l'application.

## Solutions

### 1. Vérifier que le Backend est démarré

Le backend doit être actif sur le port **5000**.

**Démarrer le backend :**
```powershell
cd backend
npm start
```

Vous devriez voir :
```
Server running on port 5000
MongoDB connecté: ...
```

### 2. Vérifier que le Frontend est démarré

Le frontend doit être actif sur le port **3000**.

**Démarrer le frontend :**
```powershell
cd frontend
npm run dev
```

Vous devriez voir :
```
Ready on http://localhost:3000
```

### 3. Vérifier la Connexion MongoDB

Si vous voyez une erreur MongoDB :

1. **Vérifier que MongoDB est démarré** (si local)
2. **Vérifier la variable MONGODB_URI** dans `backend/.env`

Le fichier `.env` devrait contenir :
```env
MONGODB_URI=mongodb://localhost:27017/moncondo
# ou
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/moncondo
```

### 4. Vérifier les Ports

**Vérifier que les ports ne sont pas utilisés :**
```powershell
netstat -ano | Select-String ":5000|:3000"
```

Si un port est utilisé par un autre processus :
- Arrêtez le processus
- Ou changez le port dans la configuration

### 5. Erreurs Courantes

#### Erreur : "ECONNREFUSED"
**Cause :** Le serveur backend n'est pas démarré
**Solution :** Démarrez le backend avec `npm start`

#### Erreur : "Cannot GET /api/payments"
**Cause :** Les routes ne sont pas chargées
**Solution :** Vérifiez que `server.js` charge bien `paymentRoutes.js`

#### Erreur : "401 Unauthorized"
**Cause :** Token manquant ou expiré
**Solution :** Reconnectez-vous

#### Erreur : "403 Forbidden"
**Cause :** Permissions insuffisantes
**Solution :** Vérifiez que vous avez les droits nécessaires

### 6. Test de Connexion

**Tester le backend directement :**
```powershell
curl http://localhost:5000/api
```

Vous devriez recevoir une réponse JSON.

**Tester l'authentification :**
```powershell
curl -X POST http://localhost:5000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"pierre.tremblay@example.com","password":"password123"}'
```

### 7. Redémarrage Complet

Si rien ne fonctionne :

1. **Arrêter tous les processus Node.js :**
   ```powershell
   Get-Process -Name node | Stop-Process -Force
   ```

2. **Redémarrer le backend :**
   ```powershell
   cd backend
   npm start
   ```

3. **Redémarrer le frontend (nouveau terminal) :**
   ```powershell
   cd frontend
   npm run dev
   ```

### 8. Vérification des Logs

**Backend :** Regardez la console où `npm start` est exécuté
**Frontend :** Regardez la console du navigateur (F12)

Les erreurs détaillées y seront affichées.

## ✅ Checklist

- [ ] Backend démarré sur le port 5000
- [ ] Frontend démarré sur le port 3000
- [ ] MongoDB connecté (ou connexion par défaut active)
- [ ] Aucune erreur dans les logs
- [ ] Les ports ne sont pas bloqués par un firewall
- [ ] Les variables d'environnement sont correctes

## 📞 Support

Si le problème persiste :
1. Vérifiez les logs du serveur backend
2. Vérifiez la console du navigateur (F12)
3. Vérifiez que tous les fichiers nécessaires sont présents

