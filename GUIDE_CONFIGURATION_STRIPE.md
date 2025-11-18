# 🚀 Guide de Configuration Stripe - MonCondo+

## 📋 Configuration Rapide

### 1️⃣ Backend - Fichier `.env`

Créez ou modifiez `backend/.env` et ajoutez :

```env
# Stripe - Mode Test (développement)
STRIPE_SECRET_KEY=sk_test_votre_cle_secrete_stripe
STRIPE_STATEMENT_DESCRIPTOR=MONCONDO+
```

### 2️⃣ Frontend - Fichier `.env.local`

Créez `frontend/.env.local` et ajoutez :

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Stripe - Mode Test
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_votre_cle_publique_stripe
```

## 🔑 Obtenir les Clés Stripe

1. **Créez un compte** sur https://stripe.com (gratuit)
2. **Accédez au Dashboard** → **Developers** → **API keys**
3. **Mode Test** (pour développement) :
   - **Secret key** : Commence par `sk_test_...`
   - **Publishable key** : Commence par `pk_test_...`

## ✅ Vérification

### Backend
```bash
cd backend
node -e "require('dotenv').config(); console.log('STRIPE:', process.env.STRIPE_SECRET_KEY ? '✅ Configuré' : '❌ Manquant');"
```

### Frontend
Vérifiez que `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` est défini dans `.env.local`

## 🧪 Tester avec des Cartes de Test

Utilisez ces numéros pour tester :

- **✅ Succès** : `4242 4242 4242 4242`
- **❌ Échec** : `4000 0000 0000 0002`
- **🔐 3D Secure** : `4000 0027 6000 3184`

**Date d'expiration** : N'importe quelle date future (ex: 12/25)  
**CVC** : N'importe quel 3 chiffres (ex: 123)  
**Code postal** : N'importe quel code postal (ex: 12345)

## 🔄 Redémarrer les Serveurs

Après avoir configuré les clés :

```bash
# Backend
cd backend
npm start

# Frontend (dans un autre terminal)
cd frontend
npm run dev
```

## 🎯 Fonctionnalités Disponibles

✅ **Paiement par carte** (Stripe) - Si configuré  
✅ **Interac e-Transfer** - Toujours disponible  
✅ **Virement bancaire** - Toujours disponible  

## 🐛 Résolution de Problèmes

### Erreur : "Stripe n'est pas configuré"
→ Vérifiez que `STRIPE_SECRET_KEY` est dans `backend/.env`

### Erreur : "recipient required"
→ Corrigé automatiquement : le système utilise le propriétaire de l'unité

### Erreur 400 : "Invalid API Key"
→ Vérifiez que la clé commence par `sk_test_` (test) ou `sk_live_` (production)

### Erreur : PaymentIntent creation failed
→ Vérifiez les logs du serveur backend pour plus de détails

## 📚 Documentation Complète

Voir `backend/CONFIGURATION_STRIPE.md` pour plus de détails.

