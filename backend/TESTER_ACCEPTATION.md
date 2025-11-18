# Guide de test - Acceptation de demande

## 🎯 Objectif

Tester que la fonctionnalité d'acceptation de demande fonctionne correctement depuis le frontend.

## 📋 Prérequis

1. ✅ Serveur backend démarré sur le port 5000
2. ✅ Serveur frontend démarré sur le port 3000
3. ✅ Base de données MongoDB connectée
4. ✅ Compte admin créé: `admin@moncondo.com / administrateur`
5. ✅ Au moins une demande en attente dans la base de données

## 🚀 Étapes de test

### 1. Préparation

1. **Ouvrir deux terminaux:**
   - Terminal 1: Serveur backend (port 5000)
   - Terminal 2: Serveur frontend (port 3000) - optionnel si déjà démarré

2. **Ouvrir le navigateur:**
   - Ouvrir `http://localhost:3000`
   - Ouvrir les outils de développement (F12)
   - Aller dans l'onglet "Console"

### 2. Connexion

1. Se connecter avec les identifiants admin:
   - Email: `admin@moncondo.com`
   - Password: `administrateur`

2. Vérifier que la connexion est réussie:
   - Vous devriez être redirigé vers le dashboard admin
   - Vérifier que le token est présent dans `localStorage` (Console > Application > Local Storage)

### 3. Accéder à une demande

1. **Option A: Depuis la liste des demandes**
   - Aller dans "Administration" > "Demandes"
   - Cliquer sur "Voir détails" pour une demande en attente

2. **Option B: Accès direct**
   - Aller directement à: `http://localhost:3000/admin/requests/[ID_DE_LA_DEMANDE]`
   - Remplacer `[ID_DE_LA_DEMANDE]` par l'ID d'une demande en attente

### 4. Tester l'acceptation

1. **Vérifier les informations de la demande:**
   - Statut: "En attente"
   - Type: "Location" ou "Achat"
   - Informations du demandeur
   - Informations de l'unité (si applicable)

2. **Cliquer sur "Accepter la demande":**
   - Un message de confirmation devrait apparaître
   - Message: "Êtes-vous sûr de vouloir accepter cette demande de Location ?"
   - Description: "Cette action va: - Générer les documents nécessaires - Envoyer une notification au demandeur - Initialiser le processus de paiement"

3. **Confirmer l'acceptation:**
   - Cliquer sur "OK" dans la popup de confirmation

### 5. Observer les logs

#### Dans la console du navigateur (frontend):

Vous devriez voir dans l'ordre:
```
[ACCEPT] Préparation de la requête: {
  originalId: '69153133bf674ac3b226525e',
  cleanedId: '69153133bf674ac3b226525e',
  idType: 'string',
  idLength: 24,
  hasSpaces: false
}
[ACCEPT] URL construite: {
  url: 'http://localhost:5000/api/requests/69153133bf674ac3b226525e/accept',
  urlLength: 72,
  urlHasSpaces: false,
  isValidUrl: true
}
[API PUT] Requête API: {
  url: 'http://localhost:5000/api/requests/69153133bf674ac3b226525e/accept',
  urlLength: 72,
  urlHasSpaces: false,
  urlValid: true,
  timestamp: '2025-12-11T...'
}
[ACCEPT] Envoi de la requête PUT: {
  url: 'http://localhost:5000/api/requests/69153133bf674ac3b226525e/accept',
  method: 'PUT',
  hasToken: true,
  tokenLength: 200+
}
[ACCEPT] Réponse reçue: {
  status: 200,
  statusText: 'OK',
  success: true,
  message: 'Demande acceptée avec succès. Le bail a été généré. ...'
}
[API PUT Response] Réponse API: {
  url: 'http://localhost:5000/api/requests/69153133bf674ac3b226525e/accept',
  status: 200,
  statusText: 'OK',
  success: true,
  message: 'Demande acceptée avec succès. Le bail a été généré. ...'
}
```

#### Dans le terminal du serveur backend:

Vous devriez voir dans l'ordre:
```
[SERVER] 📥 [timestamp] PUT /api/requests/69153133bf674ac3b226525e/accept
[SERVER]    Path: /69153133bf674ac3b226525e/accept
[SERVER]    Base URL: 
[SERVER]    URL: /api/requests/69153133bf674ac3b226525e/accept
[SERVER]    Headers Authorization: Présent (Bearer eyJhbGciOiJIUzI1NiIs...)
[SERVER]    IP: ::1

[AUTH] ✅ Accès autorisé
[AUTH]    User: admin@moncondo.com (admin)
[AUTH]    Route: PUT /api/requests/69153133bf674ac3b226525e/accept
[AUTH]    User ID: 507f1f77bcf86cd799439011

[ROLE_AUTH] ✅ Accès admin autorisé automatiquement
[ROLE_AUTH]    User: admin@moncondo.com (admin)
[ROLE_AUTH]    Route: PUT /api/requests/69153133bf674ac3b226525e/accept

[REQUEST ROUTES] ✅ PUT /api/requests/69153133bf674ac3b226525e/accept - Path: /69153133bf674ac3b226525e/accept
[REQUEST ROUTES] Base URL: /api/requests
[REQUEST ROUTES] User: admin@moncondo.com
[REQUEST ROUTES] Role: admin

[ROUTE] PUT /:id/accept - Requête reçue: {
  id: '69153133bf674ac3b226525e',
  method: 'PUT',
  url: '/api/requests/69153133bf674ac3b226525e/accept',
  path: '/69153133bf674ac3b226525e/accept',
  baseUrl: '/api/requests',
  user: 'admin@moncondo.com',
  role: 'admin'
}

[ACCEPT REQUEST] Requête reçue: {
  id: '69153133bf674ac3b226525e',
  cleanedId: '69153133bf674ac3b226525e',
  idLength: 24,
  cleanedIdLength: 24,
  hasSpaces: false,
  user: 'admin@moncondo.com',
  role: 'admin',
  method: 'PUT',
  url: '/api/requests/69153133bf674ac3b226525e/accept',
  path: '/69153133bf674ac3b226525e/accept',
  baseUrl: '/api/requests'
}

[DOCUMENT SERVICE] Génération du bail...
[NOTIFICATION SERVICE] Notification de demande acceptée créée...
```

### 6. Vérifier le résultat

1. **Dans l'interface:**
   - Le statut de la demande devrait changer à "Acceptée"
   - Un message de succès devrait apparaître: "✅ Demande acceptée avec succès!"
   - Les documents générés devraient apparaître dans la section "Documents"
   - Les informations de paiement initial devraient apparaître

2. **Dans la base de données:**
   - Le statut de la demande devrait être "accepte"
   - Les documents générés devraient être enregistrés
   - Les notifications devraient être créées
   - Le paiement initial devrait être initialisé

## ❌ Cas d'erreur

### Erreur 404: Route non trouvée

**Symptômes:**
- Message: "La ressource demandée est introuvable"
- Logs frontend: `[ACCEPT] 404 - Route non trouvée`
- Logs backend: `[404] ⚠️ Route non trouvée: PUT /api/requests/:id/accept`

**Solutions:**
1. Vérifier que le serveur backend est démarré
2. Vérifier que la route est enregistrée (logs au démarrage)
3. Vérifier que le serveur backend a été redémarré après les modifications
4. Vérifier que l'URL ne contient pas d'espaces
5. Vérifier l'ordre des routes dans `server.js`

### Erreur 401: Non autorisé

**Symptômes:**
- Message: "Votre session a expiré. Veuillez vous reconnecter."
- Logs backend: `[AUTH] ❌ Tentative d'accès sans token`

**Solutions:**
1. Vérifier que vous êtes connecté
2. Vérifier que le token est présent dans `localStorage`
3. Se reconnecter si nécessaire

### Erreur 403: Accès refusé

**Symptômes:**
- Message: "Vous n'avez pas les permissions nécessaires"
- Logs backend: `[ROLE_AUTH] Accès refusé`

**Solutions:**
1. Vérifier que vous êtes connecté avec un compte admin
2. Vérifier que le compte a le rôle "admin"
3. Se connecter avec `admin@moncondo.com / administrateur`

### Erreur 400: Demande déjà traitée

**Symptômes:**
- Message: "Cette demande a déjà été traitée"
- Logs backend: `[ACCEPT REQUEST] Demande déjà traitée`

**Solutions:**
1. Utiliser une demande avec le statut "en_attente"
2. Vérifier le statut de la demande dans la base de données

## 📊 Résultats attendus

### ✅ Succès

- Statut HTTP: 200
- Message: "Demande acceptée avec succès. Le bail a été généré. Un paiement initial de X $ est requis. Une notification a été envoyée au demandeur."
- Statut de la demande: "accepte"
- Documents générés: 1 (bail pour location) ou 1 (contrat de vente pour achat)
- Paiement initial: Initialisé avec le montant approprié
- Notification: Créée pour le demandeur

### ❌ Échec

- Statut HTTP: 404, 401, 403, ou 500
- Message d'erreur affiché à l'utilisateur
- Logs détaillés dans la console du navigateur et le terminal du serveur

## 🔍 Vérifications supplémentaires

1. **Vérifier que les documents sont générés:**
   - Aller dans la section "Documents" de la demande
   - Vérifier que le fichier PDF est présent
   - Vérifier que le document peut être téléchargé

2. **Vérifier que les notifications sont créées:**
   - Aller dans le dashboard du demandeur
   - Vérifier que la notification est présente
   - Vérifier que le contenu de la notification est correct

3. **Vérifier que le paiement initial est initialisé:**
   - Aller dans la section "Paiements" de la demande
   - Vérifier que le paiement initial est présent
   - Vérifier que le montant est correct

4. **Vérifier que l'unité est attribuée (si applicable):**
   - Aller dans les détails de l'unité
   - Vérifier que le locataire/propriétaire est mis à jour
   - Vérifier que l'unité n'est plus disponible

## 📝 Notes

- Les logs sont très détaillés pour faciliter le diagnostic
- Tous les logs sont préfixés avec `[ACCEPT]`, `[API PUT]`, `[SERVER]`, etc.
- Les erreurs sont affichées avec des suggestions de résolution
- Les URLs sont validées pour éviter les problèmes d'espaces ou de caractères spéciaux

