# 🧪 Test Complet du Système de Paiement

## 📋 Checklist de Test

### ✅ Prérequis
- [ ] Backend démarré sur http://localhost:5000
- [ ] Frontend démarré sur http://localhost:3000
- [ ] Base de données MongoDB connectée
- [ ] Utilisateur locataire créé et connecté

### 🧪 Tests à Effectuer

#### 1️⃣ Test Paiement Interac
1. Se connecter en tant que locataire
2. Aller sur `/payments/locataire`
3. Cliquer sur "Payer maintenant" sur un paiement en attente
4. Sélectionner "Interac e-Transfer"
5. Vérifier que les instructions s'affichent correctement
6. Cliquer sur "Confirmer le paiement"
7. **Vérifier** : Redirection vers `/payments/[id]/success`
8. **Vérifier** : Message de succès affiché
9. **Vérifier** : Statut du paiement mis à jour à "payé"

#### 2️⃣ Test Paiement Virement Bancaire
1. Se connecter en tant que locataire
2. Aller sur `/payments/locataire`
3. Cliquer sur "Payer maintenant" sur un paiement en attente
4. Sélectionner "Virement bancaire"
5. Vérifier que les instructions s'affichent correctement
6. Cliquer sur "Confirmer le paiement"
7. **Vérifier** : Redirection vers `/payments/[id]/success`
8. **Vérifier** : Message de succès affiché
9. **Vérifier** : Statut du paiement mis à jour à "payé"

#### 3️⃣ Test Paiement Stripe (si configuré)
1. Se connecter en tant que locataire
2. Aller sur `/payments/locataire`
3. Cliquer sur "Payer maintenant" sur un paiement en attente
4. Sélectionner "Carte de crédit / débit"
5. **Si Stripe configuré** :
   - Vérifier que le formulaire Stripe s'affiche
   - Utiliser la carte de test : `4242 4242 4242 4242`
   - Date : 12/25, CVC : 123
   - Cliquer sur "Payer"
   - **Vérifier** : Redirection vers `/payments/[id]/success`
   - **Vérifier** : Message de succès affiché
   - **Vérifier** : Statut du paiement mis à jour à "payé"
6. **Si Stripe non configuré** :
   - Vérifier que le message "Paiement par carte non disponible" s'affiche
   - Vérifier que le bouton "Choisir une autre méthode" fonctionne

#### 4️⃣ Test Page de Succès
1. Après un paiement réussi, vérifier :
   - [ ] Message de confirmation affiché
   - [ ] Montant payé affiché correctement
   - [ ] Méthode de paiement affichée
   - [ ] ID de transaction affiché (si disponible)
   - [ ] Date de paiement affichée
   - [ ] Bouton "Télécharger le reçu" fonctionne (si reçu généré)
   - [ ] Bouton "Retour à mes paiements" fonctionne

#### 5️⃣ Test Expérience Utilisateur
- [ ] Les indicateurs de chargement s'affichent pendant le traitement
- [ ] Les messages d'erreur sont clairs et compréhensibles
- [ ] Les transitions entre les étapes sont fluides
- [ ] Aucune erreur dans la console du navigateur
- [ ] Les redirections fonctionnent correctement

## 🐛 Problèmes Potentiels et Solutions

### Erreur 400/403 lors de la création du PaymentIntent
**Solution** : Vérifier que Stripe est configuré ou que le message d'erreur s'affiche correctement

### Paiement non confirmé après succès
**Solution** : Vérifier les logs backend pour voir si `markPaymentAsPaid` est appelé

### Redirection vers success mais statut non mis à jour
**Solution** : Vérifier que `loadPayment()` est appelé avant la redirection

### Formulaire Stripe ne s'affiche pas
**Solution** : Vérifier que `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` est défini dans `.env.local`

## 📊 Résultats Attendus

### ✅ Succès
- Tous les paiements aboutissent à la page de succès
- Le statut est mis à jour à "payé" dans la base de données
- Les notifications sont créées
- Les reçus sont générés (si configuré)

### ❌ Échecs à Documenter
- Erreurs dans la console
- Redirections qui ne fonctionnent pas
- Statuts non mis à jour
- Messages d'erreur peu clairs

