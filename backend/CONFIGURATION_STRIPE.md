# 🔧 Configuration Stripe - MonCondo+

## 📋 Variables d'Environnement Requises

Ajoutez ces variables dans votre fichier `backend/.env` :

```env
# ==================== STRIPE ====================
# Mode test (développement)
STRIPE_SECRET_KEY=sk_test_votre_cle_secrete_stripe
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_votre_cle_publique_stripe

# Mode production (quand prêt)
# STRIPE_SECRET_KEY=sk_live_votre_cle_secrete_stripe
# NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_votre_cle_publique_stripe

# Optionnel : Descripteur sur le relevé bancaire (max 22 caractères)
STRIPE_STATEMENT_DESCRIPTOR=MONCONDO+
```

## 🔑 Obtenir les Clés Stripe

### 1. Créer un Compte Stripe
1. Allez sur https://stripe.com
2. Créez un compte (gratuit)
3. Accédez au Dashboard

### 2. Récupérer les Clés API
1. Dans le Dashboard Stripe, allez dans **Developers** → **API keys**
2. **Mode Test** (pour développement) :
   - **Secret key** : Commence par `sk_test_...`
   - **Publishable key** : Commence par `pk_test_...`
3. **Mode Production** (pour vrai paiement) :
   - Activez le mode Live
   - **Secret key** : Commence par `sk_live_...`
   - **Publishable key** : Commence par `pk_live_...`

### 3. Configurer dans le Projet
1. Ouvrez `backend/.env`
2. Ajoutez les clés :
   ```env
   STRIPE_SECRET_KEY=sk_test_51AbCdEf...
   ```
3. Ouvrez `frontend/.env.local` (ou créez-le)
4. Ajoutez :
   ```env
   NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_51AbCdEf...
   ```

## ✅ Vérification de la Configuration

### Test Backend
```bash
cd backend
node -e "require('dotenv').config(); console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Configuré' : '❌ Manquant');"
```

### Test Frontend
Vérifiez que `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` est défini dans `.env.local`

## 🧪 Tester Stripe en Mode Test

### Cartes de Test Stripe
Utilisez ces numéros de carte pour tester :

- **Succès** : `4242 4242 4242 4242`
- **Échec** : `4000 0000 0000 0002`
- **3D Secure** : `4000 0027 6000 3184`

**Date d'expiration** : N'importe quelle date future (ex: 12/25)
**CVC** : N'importe quel 3 chiffres (ex: 123)
**Code postal** : N'importe quel code postal (ex: 12345)

## 🔒 Sécurité

- ✅ **NE JAMAIS** commiter les clés dans Git
- ✅ Utiliser `.env` (déjà dans `.gitignore`)
- ✅ Utiliser des clés de test en développement
- ✅ Activer le mode Live seulement en production
- ✅ Utiliser HTTPS en production

## 🐛 Résolution de Problèmes

### Erreur : "Stripe n'est pas configuré"
**Solution** : Vérifiez que `STRIPE_SECRET_KEY` est défini dans `backend/.env`

### Erreur : "recipient required"
**Solution** : Le champ `recipient` est maintenant automatiquement rempli avec le propriétaire de l'unité

### Erreur 400 : "Invalid API Key"
**Solution** : Vérifiez que la clé commence par `sk_test_` (test) ou `sk_live_` (production)

### Erreur : "PaymentIntent creation failed"
**Solution** : Vérifiez les logs du serveur backend pour plus de détails

## 📝 Notes

- Les clés de test fonctionnent sans frais
- Les paiements de test ne sont pas réellement débités
- Le mode test est parfait pour le développement
- Activez le mode production seulement quand vous êtes prêt

