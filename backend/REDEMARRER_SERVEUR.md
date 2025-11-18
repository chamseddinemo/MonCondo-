# 🔄 Redémarrer le serveur backend

## ⚠️ IMPORTANT

**Le serveur backend DOIT être redémarré après chaque modification de code pour que les changements prennent effet.**

## 📋 Étapes pour redémarrer

### 1. Arrêter le serveur actuel

Dans le terminal où le serveur backend tourne, appuyez sur `Ctrl+C` pour arrêter le serveur.

### 2. Redémarrer le serveur

```bash
cd backend
npm start
```

### 3. Vérifier les logs au démarrage

Vous devriez voir dans les logs :

```
[SERVER] ✅ Routes requests chargées: /api/requests
[SERVER] ✅✅ Route PUT /api/requests/:id/accept CONFIRMÉE et enregistrée!
```

Si vous voyez ce message, la route est bien enregistrée.

### 4. Vérifier que la route est trouvée

Lorsque vous testez depuis le frontend, vous devriez voir dans les logs du serveur :

```
[SERVER] 📥 [timestamp] PUT /api/requests/69153133bf674ac3b226525e/accept
[AUTH] ✅ Accès autorisé
[ROLE_AUTH] ✅ Accès admin autorisé automatiquement
[ACCEPT REQUEST] ⚡ Fonction acceptRequest appelée
```

Si vous ne voyez PAS ces logs, cela signifie que la route n'est pas matchée et qu'il y a un problème avec l'ordre des routes.

## 🔍 Vérification

Après le redémarrage, testez depuis le frontend. Si vous voyez toujours une erreur 404, vérifiez les logs du serveur pour voir quelle route est matchée (ou non).
