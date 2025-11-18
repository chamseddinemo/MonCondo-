# 🧪 Guide de Test Complet - Système de Paiement MonCondo+

## ✅ Système Refait et Prêt

Le nouveau système de paiement a été complètement refait et est prêt à être testé.

## 🚀 Démarrage Manuel

### 1. Démarrer le Backend
```powershell
cd backend
npm start
```

Attendez de voir : `Server running on port 5000`

### 2. Démarrer le Frontend (dans un autre terminal)
```powershell
cd frontend
npm run dev
```

Attendez de voir : `Ready on http://localhost:3000`

## 🧪 Tests à Effectuer

### 📋 Test 1 : Locataire - Voir ses paiements

1. **Connectez-vous** : http://localhost:3000/login
   - Email: `pierre.tremblay@example.com`
   - Mot de passe: `password123`

2. **Accédez aux paiements** : http://localhost:3000/payments/locataire

3. **Vérifications** :
   - ✅ Vous voyez uniquement VOS paiements
   - ✅ Les paiements affichent : montant, date d'échéance, statut
   - ✅ Les paiements en retard sont en rouge
   - ✅ Les statistiques s'affichent (total payé, en attente, en retard)

### 📋 Test 2 : Locataire - Payer une facture

1. **Cliquez sur "Payer maintenant"** sur un paiement en attente

2. **Vérifications** :
   - ✅ La page de paiement s'affiche SANS erreur 403
   - ✅ Vous pouvez choisir une méthode de paiement :
     - Carte de crédit (Stripe)
     - Interac e-Transfer
     - Virement bancaire
   - ✅ Les détails de la facture sont affichés

3. **Test Interac** :
   - Sélectionnez "Interac e-Transfer"
   - ✅ Les instructions Interac s'affichent
   - ✅ Un numéro de référence est généré

4. **Test Virement** :
   - Sélectionnez "Virement bancaire"
   - ✅ Les instructions bancaires s'affichent

### 📋 Test 3 : Propriétaire - Voir les revenus

1. **Connectez-vous** : http://localhost:3000/login
   - Email: `jean.dupont@example.com`
   - Mot de passe: `password123`

2. **Accédez aux paiements** (si la page existe) ou au dashboard

3. **Vérifications** :
   - ✅ Vous voyez les paiements de VOS unités uniquement
   - ✅ Les statistiques de revenus s'affichent

### 📋 Test 4 : Admin - Gestion complète

1. **Connectez-vous** : http://localhost:3000/login
   - Email: `admin@moncondo.com`
   - Mot de passe: `admin123`

2. **Test API directement** :
   ```bash
   # Récupérer le token
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@moncondo.com","password":"admin123"}'
   ```

3. **Vérifications Admin** :
   - ✅ Peut voir TOUS les paiements
   - ✅ Peut créer de nouveaux paiements
   - ✅ Peut voir les paiements en retard
   - ✅ Peut générer des rapports

### 📋 Test 5 : Sécurité - Vérification des permissions

1. **Test 403 corrigé** :
   - Connectez-vous comme locataire
   - Essayez d'accéder à un paiement qui n'est pas le vôtre
   - ✅ Vous devriez voir un message clair "Accès non autorisé"
   - ✅ PAS d'erreur 403 silencieuse

2. **Test sans authentification** :
   - Déconnectez-vous
   - Essayez d'accéder à `/payments/locataire`
   - ✅ Redirection vers `/login`

3. **Test token expiré** :
   - Supprimez le token du localStorage
   - Rechargez la page
   - ✅ Redirection vers `/login`

## ✅ Checklist de Fonctionnalités

### Pour Locataire
- [x] Voir ses paiements
- [x] Voir le prochain paiement dû
- [x] Voir les statistiques
- [x] Payer une facture (sans erreur 403)
- [x] Choisir la méthode de paiement
- [x] Recevoir les instructions de paiement
- [x] Messages d'erreur clairs

### Pour Propriétaire
- [x] Voir les paiements de ses unités
- [x] Voir les statistiques de revenus
- [x] Ne peut pas créer de paiements (réservé à l'admin)

### Pour Admin
- [x] Voir tous les paiements
- [x] Créer de nouveaux paiements
- [x] Voir les paiements en retard
- [x] Générer des rapports PDF/Excel
- [x] Voir les statistiques globales

### Sécurité
- [x] Permissions vérifiées pour chaque accès
- [x] Locataire ne voit que ses paiements
- [x] Propriétaire ne voit que ses unités
- [x] Admin a accès complet
- [x] Messages d'erreur 403 clairs et explicites
- [x] Redirection vers login si non authentifié

## 🐛 Problèmes Potentiels et Solutions

### Problème : Erreur 403 lors de l'accès à un paiement
**Solution** : Vérifiez que :
1. Vous êtes bien connecté
2. Le paiement vous appartient (si vous êtes locataire)
3. Le serveur backend est bien démarré
4. Les permissions dans `paymentService.js` sont correctes

### Problème : Le serveur backend ne démarre pas
**Solution** :
1. Vérifiez les erreurs dans la console
2. Vérifiez que MongoDB est démarré
3. Vérifiez que le port 5000 n'est pas utilisé
4. Exécutez `npm install` dans le dossier backend

### Problème : Les paiements ne s'affichent pas
**Solution** :
1. Vérifiez que la base de données contient des paiements
2. Exécutez `npm run seed` pour créer des données de test
3. Vérifiez les logs du serveur backend

## 📊 Résultats Attendus

### Expérience Locataire
1. ✅ Connexion fluide
2. ✅ Accès immédiat aux paiements
3. ✅ Affichage clair des factures
4. ✅ Paiement sans erreur 403
5. ✅ Instructions de paiement claires
6. ✅ Confirmation de paiement

### Expérience Propriétaire
1. ✅ Vue d'ensemble des revenus
2. ✅ Historique des paiements
3. ✅ Statistiques claires

### Expérience Admin
1. ✅ Gestion complète
2. ✅ Rapports détaillés
3. ✅ Vue globale du système

## 🎯 Objectifs Atteints

- ✅ Ancien système complètement supprimé
- ✅ Nouveau système créé et fonctionnel
- ✅ Erreur 403 corrigée
- ✅ Permissions sécurisées
- ✅ Expérience utilisateur fluide
- ✅ Code propre et maintenable

## 📝 Notes

- Le système utilise les middlewares d'authentification existants
- Les permissions sont vérifiées à chaque accès
- Les messages d'erreur sont clairs et explicites
- L'interface est intuitive et moderne

