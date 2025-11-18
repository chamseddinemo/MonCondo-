# Guide pour redémarrer le serveur backend et tester l'acceptation de demande

## 🔄 Étape 1: Redémarrer le serveur backend

### Option A: Redémarrer manuellement

1. **Arrêter le serveur actuel:**
   - Ouvrir le terminal où le serveur backend tourne
   - Appuyer sur `Ctrl+C` pour arrêter le serveur

2. **Redémarrer le serveur:**
   ```bash
   cd backend
   npm start
   ```

### Option B: Utiliser le script PowerShell (Windows)

```powershell
# Arrêter le processus Node.js sur le port 5000
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { (Get-NetTCPConnection -OwningProcess $_.Id -ErrorAction SilentlyContinue).LocalPort -eq 5000 } | Stop-Process -Force

# Attendre 2 secondes
Start-Sleep -Seconds 2

# Redémarrer le serveur
cd backend
npm start
```

## ✅ Étape 2: Vérifier que le serveur démarre correctement

Au démarrage, vous devriez voir dans les logs:

```
[SERVER] ✅ Serveur démarré sur le port 5000
[SERVER] ✅ Routes requests chargées: /api/requests
[SERVER] ✅ Routes requests enregistrées:
[SERVER]   [6] PUT /api/requests/:id/accept
[SERVER]   ✅ Route PUT /api/requests/:id/accept trouvée et enregistrée!
[SERVER]   ✅ Route PUT /api/requests/:id/accept confirmée dans la stack!
```

**⚠️ Important:** Si vous ne voyez pas ces logs, le serveur n'a pas les dernières modifications. Vérifiez que vous avez bien sauvegardé tous les fichiers.

## 🧪 Étape 3: Tester la route avec le script de test

### Test automatique (recommandé)

```bash
cd backend
node test-accept-route.js
```

Ce script va:
1. Se connecter avec les identifiants admin
2. Récupérer les demandes disponibles
3. Trouver une demande en attente
4. Tester la route `PUT /api/requests/:id/accept`
5. Afficher les résultats détaillés

### Test avec un ID spécifique

```bash
cd backend
node test-accept-route.js 69153133bf674ac3b226525e
```

## 🌐 Étape 4: Tester depuis le frontend

### 1. Ouvrir le navigateur

1. Ouvrir `http://localhost:3000`
2. Se connecter avec les identifiants admin:
   - Email: `admin@moncondo.com`
   - Password: `administrateur`

### 2. Accéder à une demande

1. Aller dans "Administration" > "Demandes"
2. Cliquer sur "Voir détails" pour une demande en attente
3. Ou accéder directement à: `http://localhost:3000/admin/requests/[ID_DE_LA_DEMANDE]`

### 3. Ouvrir la console du navigateur

1. Appuyer sur `F12` pour ouvrir les outils de développement
2. Aller dans l'onglet "Console"

### 4. Accepter la demande

1. Cliquer sur le bouton "✅ Accepter la demande"
2. Confirmer dans la popup de confirmation
3. Observer les logs dans la console du navigateur

### 5. Vérifier les logs

#### Dans la console du navigateur (frontend):

Vous devriez voir:
```
[ACCEPT] Préparation de la requête: { originalId: '...', cleanedId: '...', ... }
[ACCEPT] URL construite: { url: 'http://localhost:5000/api/requests/.../accept', ... }
[API PUT] Requête API: { url: '...', urlHasSpaces: false, ... }
[API PUT Response] Réponse API: { status: 200, success: true, ... }
```

#### Dans le terminal du serveur backend:

Vous devriez voir:
```
[SERVER] 📥 PUT /api/requests/:id/accept
[SERVER]    Headers Authorization: Présent (Bearer ...)
[AUTH] ✅ Accès autorisé
[AUTH]    User: admin@moncondo.com (admin)
[ROLE_AUTH] ✅ Accès admin autorisé automatiquement
[REQUEST ROUTES] ✅ PUT /api/requests/:id/accept
[ROUTE] PUT /:id/accept - Requête reçue: { id: '...', ... }
[ACCEPT REQUEST] Requête reçue: { id: '...', cleanedId: '...', ... }
```

## 🔍 Étape 5: Diagnostic en cas d'erreur

### Si vous voyez une erreur 404:

1. **Vérifier que le serveur backend est démarré:**
   ```bash
   netstat -ano | findstr :5000
   ```

2. **Vérifier les logs du serveur backend:**
   - Chercher `[SERVER] 📥 PUT /api/requests/:id/accept`
   - Si vous ne voyez pas ce log, la requête n'atteint pas le serveur

3. **Vérifier les logs dans la console du navigateur:**
   - Chercher `[ACCEPT] URL construite`
   - Vérifier que l'URL ne contient pas d'espaces
   - Vérifier que l'URL est correcte

4. **Vérifier que la route est enregistrée:**
   - Chercher `[SERVER] ✅ Route PUT /api/requests/:id/accept confirmée dans la stack!` dans les logs au démarrage
   - Si vous ne voyez pas ce log, la route n'est pas enregistrée

### Si vous voyez une erreur 401:

1. **Vérifier que vous êtes connecté:**
   - Vérifier que le token est présent dans `localStorage`
   - Se reconnecter si nécessaire

2. **Vérifier les logs du serveur:**
   - Chercher `[AUTH] ✅ Accès autorisé`
   - Si vous ne voyez pas ce log, l'authentification a échoué

### Si vous voyez une erreur 403:

1. **Vérifier que l'utilisateur a le rôle admin:**
   - Se connecter avec `admin@moncondo.com / administrateur`
   - Vérifier dans les logs: `[ROLE_AUTH] ✅ Accès admin autorisé`

## 📝 Checklist de vérification

- [ ] Le serveur backend est démarré sur le port 5000
- [ ] Les logs au démarrage montrent que la route est enregistrée
- [ ] Le frontend est accessible sur `http://localhost:3000`
- [ ] Vous êtes connecté avec les identifiants admin
- [ ] La console du navigateur est ouverte (F12)
- [ ] Les logs du serveur backend sont visibles
- [ ] Vous avez une demande en attente à tester

## 🎯 Résultat attendu

Après avoir cliqué sur "Accepter la demande" et confirmé:

1. **Dans la console du navigateur:**
   - Vous devriez voir `[API PUT Response] Réponse API: { status: 200, success: true, ... }`
   - Vous devriez voir un message de succès: `✅ Demande acceptée avec succès!`

2. **Dans les logs du serveur backend:**
   - Vous devriez voir `[ACCEPT REQUEST] Requête reçue`
   - Vous devriez voir les logs de génération de documents
   - Vous devriez voir les logs de notification

3. **Dans l'interface:**
   - Le statut de la demande devrait changer à "Acceptée"
   - Les documents générés devraient apparaître
   - Les informations de paiement initial devraient apparaître

## 🚀 Prochaines étapes

Une fois que l'acceptation fonctionne:

1. **Tester la génération de documents:**
   - Vérifier que les documents PDF sont générés
   - Vérifier que les documents sont accessibles

2. **Tester les notifications:**
   - Vérifier que le demandeur reçoit une notification
   - Vérifier que l'admin reçoit une confirmation

3. **Tester le processus de paiement:**
   - Vérifier que le paiement initial est initialisé
   - Vérifier que le montant est correct

4. **Tester l'attribution d'unité:**
   - Vérifier que l'unité est attribuée au demandeur
   - Vérifier que les informations sont mises à jour

## 📞 Support

Si vous rencontrez des problèmes:

1. Vérifiez les logs du serveur backend
2. Vérifiez les logs dans la console du navigateur
3. Vérifiez que tous les fichiers ont été sauvegardés
4. Vérifiez que le serveur backend a été redémarré
5. Partagez les logs avec l'équipe de développement

