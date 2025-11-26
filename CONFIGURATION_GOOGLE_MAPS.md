# 🗺️ Configuration Google Maps - MonCondo+

## 📋 Vue d'ensemble

Ce guide explique comment configurer l'intégration Google Maps dans MonCondo+ pour afficher les immeubles sur une carte interactive.

## 🔑 Obtenir une Clé API Google Maps

### 1. Créer un Projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez la facturation (nécessaire pour l'API Maps)

### 2. Activer les APIs Requises

Dans la console Google Cloud, activez les APIs suivantes :

- **Maps JavaScript API** (pour la carte interactive)
- **Geocoding API** (pour convertir les adresses en coordonnées)
- **Places API** (optionnel, pour les recherches de lieux)
- **Directions API** (pour les itinéraires)

**Comment activer :**
1. Allez dans **APIs & Services** → **Library**
2. Recherchez chaque API et cliquez sur **Enable**

### 3. Créer une Clé API

1. Allez dans **APIs & Services** → **Credentials**
2. Cliquez sur **Create Credentials** → **API Key**
3. Copiez la clé générée
4. (Recommandé) Restreignez la clé :
   - Cliquez sur la clé créée
   - Dans **Application restrictions**, sélectionnez **HTTP referrers**
   - Ajoutez vos domaines (ex: `localhost:3000/*`, `votre-domaine.com/*`)
   - Dans **API restrictions**, sélectionnez **Restrict key**
   - Choisissez uniquement les APIs nécessaires

## ⚙️ Configuration dans MonCondo+

### Frontend - Fichier `.env.local`

Créez ou modifiez `frontend/.env.local` :

```env
# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=votre_cle_api_google_maps
```

### Backend - Fichier `.env`

Créez ou modifiez `backend/.env` :

```env
# Google Maps API Key (pour géocodage côté serveur)
GOOGLE_MAPS_API_KEY=votre_cle_api_google_maps
```

## 📦 Installation des Dépendances

Les dépendances sont déjà ajoutées dans `package.json`. Si nécessaire, installez :

```bash
cd frontend
npm install @react-google-maps/api
```

## ✅ Vérification de la Configuration

### Frontend

Vérifiez que la variable d'environnement est bien chargée :

```bash
cd frontend
node -e "console.log('GOOGLE_MAPS_API_KEY:', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? '✅ Configuré' : '❌ Manquant')"
```

### Backend

```bash
cd backend
node -e "require('dotenv').config(); console.log('GOOGLE_MAPS_API_KEY:', process.env.GOOGLE_MAPS_API_KEY ? '✅ Configuré' : '❌ Manquant');"
```

## 🚀 Utilisation

### Dans les Pages

La carte Google Maps est intégrée dans :

1. **Page Explorer** (`/explorer`) - Vue carte avec tous les immeubles
2. **Page Détails Immeuble** (`/buildings/[id]`) - Carte centrée sur l'immeuble
3. **Dashboard Admin** (`/admin/buildings`) - Vue carte avec gestion complète

### Fonctionnalités Disponibles

- ✅ **Marqueurs interactifs** selon le statut (vert=disponible, orange=peu disponible, rouge=complet)
- ✅ **Info-bulles** avec informations de l'immeuble
- ✅ **Itinéraires** depuis la position de l'utilisateur
- ✅ **Filtrage** par statut, ville, prix
- ✅ **Clusterisation** automatique pour plusieurs marqueurs proches
- ✅ **Vue satellite/plan** avec basculement
- ✅ **Géolocalisation** de l'utilisateur
- ✅ **Synchronisation temps réel** via Socket.io

## 🎨 Personnalisation

### Modifier le Centre par Défaut

Dans `frontend/components/maps/GoogleMap.tsx`, modifiez :

```typescript
const defaultCenter = { lat: 45.5017, lng: -73.5673 } // Montréal
```

### Modifier les Styles de Carte

Dans `GoogleMap.tsx`, modifiez le tableau `mapStyles` pour personnaliser l'apparence.

### Modifier les Icônes de Marqueurs

Dans `GoogleMap.tsx`, modifiez la fonction `getMarkerIcon` pour utiliser vos propres icônes.

## 💰 Coûts

Google Maps propose un crédit gratuit de **$200 par mois**, ce qui couvre généralement :

- **~28,000** requêtes de géocodage
- **~28,000** chargements de carte
- **~40,000** requêtes de directions

Au-delà, les tarifs sont :
- Géocodage : $5 par 1000 requêtes
- Maps JavaScript API : $7 par 1000 chargements
- Directions API : $5 par 1000 requêtes

## 🐛 Résolution de Problèmes

### Erreur : "This page can't load Google Maps correctly"

1. Vérifiez que la clé API est correctement configurée dans `.env.local`
2. Vérifiez que les APIs sont activées dans Google Cloud Console
3. Vérifiez les restrictions de la clé API (domaines autorisés)

### Erreur : "Geocoding API error"

1. Vérifiez que la Geocoding API est activée
2. Vérifiez les quotas dans Google Cloud Console
3. Vérifiez que la facturation est activée

### La carte ne s'affiche pas

1. Vérifiez la console du navigateur pour les erreurs
2. Vérifiez que `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` est bien défini
3. Redémarrez le serveur Next.js après avoir ajouté la variable d'environnement

## 📚 Documentation

- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [React Google Maps API](https://react-google-maps-api-docs.netlify.app/)
- [Geocoding API](https://developers.google.com/maps/documentation/geocoding)

