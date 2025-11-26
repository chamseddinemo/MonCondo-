# 🚀 Guide Rapide - Configuration Google Maps

## ⚡ Configuration en 3 Étapes

### Étape 1: Obtenir une Clé API Google Maps

1. **Allez sur [Google Cloud Console](https://console.cloud.google.com/)**
2. **Créez un projet** (ou sélectionnez un projet existant)
3. **Activez les APIs nécessaires:**
   - Maps JavaScript API
   - Geocoding API
   - Directions API (optionnel)
4. **Créez une clé API:**
   - APIs & Services → Credentials → Create Credentials → API Key
   - Copiez la clé générée

### Étape 2: Configurer le Fichier .env.local

1. **Ouvrez ou créez** le fichier `frontend/.env.local`
2. **Ajoutez** la ligne suivante (remplacez `votre_cle` par votre vraie clé):

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=votre_cle_api_google_maps
```

**Exemple:**
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Étape 3: Redémarrer le Serveur

```bash
# Arrêtez le serveur actuel (Ctrl+C)
# Puis redémarrez:
cd frontend
npm run dev
```

## ✅ Vérification

Après avoir redémarré le serveur:

1. **Ouvrez** une page avec la carte (ex: `/buildings/[id]`)
2. **Vérifiez** que la carte Google Maps s'affiche correctement
3. **Testez** les fonctionnalités:
   - Clic sur les marqueurs
   - Affichage des info-bulles
   - Calcul d'itinéraires (si activé)

## 🔒 Sécurité (Recommandé)

Pour sécuriser votre clé API:

1. **Dans Google Cloud Console**, cliquez sur votre clé API
2. **Application restrictions:**
   - Sélectionnez "HTTP referrers"
   - Ajoutez: `localhost:3000/*` (pour le développement)
   - Ajoutez: `votre-domaine.com/*` (pour la production)
3. **API restrictions:**
   - Sélectionnez "Restrict key"
   - Choisissez uniquement les APIs nécessaires

## 💡 Crédit Gratuit

Google Maps offre **$200 de crédit gratuit par mois**, ce qui correspond à environ:
- 28,000 chargements de carte
- 40,000 requêtes de géocodage

Cela devrait être largement suffisant pour le développement et les tests!

## 🐛 Problèmes Courants

### La carte ne s'affiche pas

1. ✅ Vérifiez que `.env.local` existe dans `frontend/`
2. ✅ Vérifiez que la variable commence par `NEXT_PUBLIC_`
3. ✅ Vérifiez qu'il n'y a pas d'espaces autour du `=`
4. ✅ Redémarrez le serveur Next.js

### Erreur "This API project is not authorized"

1. ✅ Vérifiez que les APIs sont activées dans Google Cloud Console
2. ✅ Vérifiez que la facturation est activée (nécessaire pour Maps API)

### Erreur "RefererNotAllowedMapError"

1. ✅ Vérifiez les restrictions HTTP referrers dans Google Cloud Console
2. ✅ Ajoutez `localhost:3000/*` aux référents autorisés

## 📚 Documentation Complète

Pour plus de détails, consultez: `CONFIGURATION_GOOGLE_MAPS.md`

