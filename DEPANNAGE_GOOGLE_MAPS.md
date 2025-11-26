# 🔧 Dépannage - Erreur Google Maps

## ❌ Erreur: "Impossible de charger Google Maps correctement"

Cette erreur indique que Google Maps ne peut pas se charger. Voici comment la résoudre :

## 🔍 Étapes de Dépannage

### 1. Vérifier la Console du Navigateur

1. Ouvrez la console du navigateur (F12 ou Clic droit → Inspecter)
2. Allez dans l'onglet **Console**
3. Cherchez les erreurs en rouge liées à Google Maps
4. Les erreurs courantes sont :
   - `RefererNotAllowedMapError` → Restrictions de la clé API
   - `ApiNotActivatedMapError` → API non activée
   - `InvalidKeyMapError` → Clé API invalide
   - `OverQueryLimitMapError` → Quota dépassé

### 2. Vérifier les Restrictions de la Clé API

**Problème le plus courant :** Les restrictions HTTP referrers bloquent `localhost:3000`

**Solution :**

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Cliquez sur votre clé API (`AIzaSyCnZ_Z7qq7e9P-9w67GuxR0IhTMQUJuL5k`)
4. Dans **Application restrictions** :
   - Sélectionnez **HTTP referrers (web sites)**
   - Ajoutez ces référents :
     ```
     localhost:3000/*
     http://localhost:3000/*
     https://localhost:3000/*
     127.0.0.1:3000/*
     ```
   - Pour la production, ajoutez aussi votre domaine :
     ```
     votre-domaine.com/*
     https://votre-domaine.com/*
     ```
5. Cliquez sur **Save**

### 3. Vérifier que les APIs sont Activées

1. Dans Google Cloud Console, allez dans **APIs & Services** → **Library**
2. Recherchez et activez ces APIs :
   - ✅ **Maps JavaScript API** (obligatoire)
   - ✅ **Geocoding API** (obligatoire)
   - ✅ **Directions API** (si vous utilisez les itinéraires)
   - ✅ **Places API** (optionnel)

### 4. Vérifier la Facturation

**Important :** Google Maps nécessite une facturation activée, même pour le crédit gratuit.

1. Allez dans **Billing** dans Google Cloud Console
2. Vérifiez qu'un compte de facturation est lié au projet
3. Si ce n'est pas le cas, créez-en un (carte de crédit requise, mais vous avez $200 de crédit gratuit/mois)

### 5. Vérifier la Clé API dans le Fichier .env.local

1. Ouvrez `frontend/.env.local`
2. Vérifiez que la ligne est correcte :
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyCnZ_Z7qq7e9P-9w67GuxR0IhTMQUJuL5k
   ```
3. Assurez-vous qu'il n'y a pas d'espaces avant ou après le `=`
4. Assurez-vous qu'il n'y a pas de guillemets autour de la clé

### 6. Redémarrer le Serveur Next.js

Après avoir modifié `.env.local` ou les restrictions de la clé API :

1. Arrêtez le serveur (Ctrl+C)
2. Redémarrez-le :
   ```bash
   cd frontend
   npm run dev
   ```

### 7. Vider le Cache du Navigateur

Parfois, le navigateur cache une ancienne version :

1. Appuyez sur **Ctrl+Shift+R** (Windows/Linux) ou **Cmd+Shift+R** (Mac)
2. Ou videz le cache manuellement dans les paramètres du navigateur

## 🐛 Erreurs Spécifiques et Solutions

### Erreur: "RefererNotAllowedMapError"

**Cause :** La clé API a des restrictions HTTP referrers qui ne permettent pas `localhost:3000`

**Solution :** Voir l'étape 2 ci-dessus

### Erreur: "ApiNotActivatedMapError"

**Cause :** L'API Maps JavaScript n'est pas activée

**Solution :** Voir l'étape 3 ci-dessus

### Erreur: "InvalidKeyMapError"

**Cause :** La clé API est invalide ou mal configurée

**Solution :** 
- Vérifiez que la clé est correcte dans `.env.local`
- Vérifiez que vous utilisez la bonne clé API dans Google Cloud Console
- Assurez-vous que la clé n'a pas été supprimée ou désactivée

### Erreur: "OverQueryLimitMapError"

**Cause :** Le quota de requêtes est dépassé

**Solution :**
- Vérifiez votre utilisation dans Google Cloud Console
- Attendez que le quota se réinitialise (quotas quotidiens)
- Vérifiez votre facturation

### Erreur: "Geocoder is not a constructor"

**Cause :** L'API n'est pas complètement chargée avant utilisation

**Solution :** Déjà corrigée dans le code. Redémarrez le serveur.

## ✅ Vérification Finale

Une fois toutes les étapes effectuées :

1. ✅ Clé API configurée dans `.env.local`
2. ✅ Restrictions HTTP referrers incluent `localhost:3000/*`
3. ✅ APIs activées (Maps JavaScript API, Geocoding API)
4. ✅ Facturation activée
5. ✅ Serveur Next.js redémarré
6. ✅ Cache du navigateur vidé

## 📞 Support Supplémentaire

Si le problème persiste :

1. Consultez la [documentation Google Maps](https://developers.google.com/maps/documentation/javascript/error-messages)
2. Vérifiez les [statistiques d'utilisation](https://console.cloud.google.com/google/maps-apis/quotas) dans Google Cloud Console
3. Consultez les [logs d'erreur](https://console.cloud.google.com/logs) dans Google Cloud Console

## 💡 Astuce

Pour tester rapidement si la clé API fonctionne, ouvrez cette URL dans votre navigateur (remplacez `YOUR_API_KEY` par votre clé) :

```
https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initMap
```

Si vous voyez une erreur dans la console, cela vous donnera plus d'informations sur le problème.

