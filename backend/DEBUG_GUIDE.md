# Guide de débogage - Route PUT /api/requests/:id/accept

## 📋 Vue d'ensemble

Ce guide vous aidera à diagnostiquer les problèmes liés à la route `PUT /api/requests/:id/accept` qui retourne une erreur 404.

## 🔍 Vérifications à effectuer

### 1. Vérifier que le serveur backend est démarré

```bash
cd backend
npm start
```

Vous devriez voir dans les logs:
```
[SERVER] ✅ Serveur démarré sur le port 5000
[SERVER] ✅ Routes requests chargées: /api/requests
[SERVER] ✅ Routes requests enregistrées:
[SERVER]   - PUT /api/requests/:id/accept
```

### 2. Vérifier les logs au démarrage

Au démarrage du serveur, vérifiez que:
- ✅ `[SERVER] ✅ Routes requests chargées: /api/requests` apparaît
- ✅ Les routes requests sont listées (y compris `PUT /api/requests/:id/accept`)
- ✅ Aucune erreur lors du chargement des routes

### 3. Tester la route avec le script de test

```bash
cd backend
node test-route.js
```

Ce script va:
1. Se connecter avec les identifiants admin
2. Récupérer les demandes
3. Tester la route `PUT /api/requests/:id/accept`
4. Afficher les logs détaillés

### 4. Vérifier les logs lors d'une requête

Lorsque vous faites une requête à `PUT /api/requests/:id/accept`, vous devriez voir dans les logs du serveur:

#### ✅ Si la requête atteint le serveur:
```
[SERVER] 📥 [timestamp] PUT /api/requests/:id/accept
[SERVER]    Path: /:id/accept
[SERVER]    Headers Authorization: Présent (Bearer ...)
```

#### ✅ Si l'authentification réussit:
```
[AUTH] ✅ Accès autorisé
[AUTH]    User: admin@moncondo.com (admin)
[AUTH]    Route: PUT /api/requests/:id/accept
```

#### ✅ Si l'autorisation réussit:
```
[ROLE_AUTH] ✅ Accès admin autorisé automatiquement
[ROLE_AUTH]    User: admin@moncondo.com (admin)
[ROLE_AUTH]    Route: PUT /api/requests/:id/accept
```

#### ✅ Si la requête atteint requestRoutes:
```
[REQUEST ROUTES] ✅ PUT /api/requests/:id/accept
[REQUEST ROUTES] Base URL: /api/requests
[REQUEST ROUTES] User: admin@moncondo.com
[REQUEST ROUTES] Role: admin
```

#### ✅ Si la route est matchée:
```
[ROUTE] PUT /:id/accept - Requête reçue: {
  id: '...',
  method: 'PUT',
  url: '/api/requests/:id/accept',
  user: 'admin@moncondo.com',
  role: 'admin'
}
```

#### ✅ Si le contrôleur est appelé:
```
[ACCEPT REQUEST] Requête reçue: {
  id: '...',
  cleanedId: '...',
  user: 'admin@moncondo.com',
  role: 'admin'
}
```

#### ❌ Si la route n'est pas trouvée (404):
```
[404] ⚠️ Route non trouvée: PUT /api/requests/:id/accept
[404]    Path: /:id/accept
[404]    Base URL: /api/requests
[404] ⚠️ Tentative d'accès à une route requests: PUT /api/requests/:id/accept
[404] ⚠️ Routes requests disponibles:
[404]   - PUT /api/requests/:id/accept
...
```

## 🔧 Problèmes courants et solutions

### Problème 1: La requête n'atteint pas le serveur

**Symptôme:** Aucun log `[SERVER] 📥` n'apparaît

**Solution:**
- Vérifiez que le serveur backend est démarré
- Vérifiez que l'URL est correcte (`http://localhost:5000/api/requests/:id/accept`)
- Vérifiez que le port 5000 n'est pas utilisé par un autre processus

### Problème 2: Token manquant ou invalide

**Symptôme:** Log `[AUTH] ❌ Tentative d'accès sans token` ou `[AUTH] Token invalide`

**Solution:**
- Vérifiez que le token est présent dans les headers: `Authorization: Bearer <token>`
- Vérifiez que le token n'est pas expiré
- Vérifiez que le token est valide en se reconnectant

### Problème 3: Utilisateur non admin

**Symptôme:** Log `[ROLE_AUTH] Accès refusé` ou erreur 403

**Solution:**
- Vérifiez que l'utilisateur a le rôle `admin`
- Connectez-vous avec les identifiants admin: `admin@moncondo.com / administrateur`

### Problème 4: Route non trouvée (404)

**Symptôme:** Log `[404] ⚠️ Route non trouvée`

**Causes possibles:**
1. **L'ordre des routes est incorrect**
   - Vérifiez que `requestRoutes` est monté AVANT `dashboardRoutes` dans `server.js`
   - Vérifiez que les routes spécifiques (`/:id/accept`) sont définies AVANT la route générique (`/:id`)

2. **La route n'est pas enregistrée**
   - Vérifiez que `router.put('/:id/accept', ...)` est présent dans `requestRoutes.js`
   - Vérifiez que `app.use('/api/requests', require('./routes/requestRoutes'))` est présent dans `server.js`

3. **L'URL contient des espaces ou des caractères spéciaux**
   - Vérifiez que l'ID de la demande ne contient pas d'espaces
   - Utilisez `buildApiUrlWithId('requests', id, 'accept')` pour construire l'URL

4. **La méthode HTTP est incorrecte**
   - Vérifiez que la méthode est `PUT` et non `POST` ou `GET`

## 📊 Flux de la requête

```
1. Requête HTTP PUT /api/requests/:id/accept
   ↓
2. Middleware de logging ([SERVER] 📥)
   ↓
3. Route /api/requests → requestRoutes
   ↓
4. Middleware protect ([AUTH])
   ↓
5. Middleware de debug requestRoutes ([REQUEST ROUTES])
   ↓
6. Route PUT /:id/accept ([ROUTE])
   ↓
7. Middleware roleAuth('admin') ([ROLE_AUTH])
   ↓
8. Contrôleur acceptRequest ([ACCEPT REQUEST])
   ↓
9. Réponse JSON
```

## 🧪 Tester manuellement

### Avec curl:
```bash
# 1. Se connecter pour obtenir un token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@moncondo.com","password":"administrateur"}'

# 2. Utiliser le token pour accepter une demande
curl -X PUT http://localhost:5000/api/requests/<ID>/accept \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json"
```

### Avec le script de test:
```bash
cd backend
node test-route.js
```

## 📝 Logs à vérifier

1. **Au démarrage du serveur:**
   - `[SERVER] ✅ Routes requests chargées: /api/requests`
   - `[SERVER] ✅ Routes requests enregistrées:`
   - `[SERVER]   - PUT /api/requests/:id/accept`

2. **Lors d'une requête:**
   - `[SERVER] 📥 PUT /api/requests/:id/accept`
   - `[AUTH] ✅ Accès autorisé`
   - `[ROLE_AUTH] ✅ Accès admin autorisé automatiquement`
   - `[REQUEST ROUTES] ✅ PUT /api/requests/:id/accept`
   - `[ROUTE] PUT /:id/accept - Requête reçue`
   - `[ACCEPT REQUEST] Requête reçue`

3. **En cas d'erreur 404:**
   - `[404] ⚠️ Route non trouvée: PUT /api/requests/:id/accept`
   - Vérifiez les logs pour identifier où la requête est bloquée

## 🚀 Prochaines étapes

1. Redémarrer le serveur backend
2. Exécuter le script de test: `node test-route.js`
3. Vérifier les logs du serveur
4. Partager les logs si le problème persiste

