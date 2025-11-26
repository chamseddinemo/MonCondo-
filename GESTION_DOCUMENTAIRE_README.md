# 📚 Système de Gestion Documentaire Avancé

## ✅ Fonctionnalités Implémentées

### Backend

#### Modèles
- **DocumentCategory** : Catégories personnalisables avec couleur et icône
- **DocumentTag** : Tags pour étiqueter les documents
- **DocumentFolder** : Dossiers hiérarchiques pour organiser les documents
- **Document** (amélioré) : Support des tags, dossiers, catégories personnalisées, métadonnées, archivage

#### Contrôleurs
- **documentCategoryController** : CRUD pour les catégories
- **documentTagController** : CRUD pour les tags avec compteur d'utilisation
- **documentFolderController** : CRUD pour les dossiers avec arborescence
- **documentController** (amélioré) : Recherche avancée, tri, pagination, filtres multiples

#### Routes API

**Documents**
- `GET /api/documents` - Liste avec recherche, tri, pagination
- `POST /api/documents` - Upload avec tags, catégorie, dossier
- `GET /api/documents/:id` - Détails d'un document
- `PUT /api/documents/:id` - Mise à jour
- `DELETE /api/documents/:id` - Suppression
- `GET /api/documents/:id/download` - Téléchargement

**Catégories**
- `GET /api/documents/categories` - Liste des catégories
- `POST /api/documents/categories` - Créer une catégorie (Admin)
- `PUT /api/documents/categories/:id` - Modifier (Admin)
- `DELETE /api/documents/categories/:id` - Supprimer (Admin)

**Tags**
- `GET /api/documents/tags` - Liste des tags
- `POST /api/documents/tags` - Créer un tag
- `PUT /api/documents/tags/:id` - Modifier
- `DELETE /api/documents/tags/:id` - Supprimer

**Dossiers**
- `GET /api/documents/folders` - Liste des dossiers
- `GET /api/documents/folders/tree` - Arborescence des dossiers
- `POST /api/documents/folders` - Créer un dossier
- `PUT /api/documents/folders/:id` - Modifier
- `DELETE /api/documents/folders/:id` - Supprimer

### Frontend

#### Pages
- `/documents` - Page principale de gestion documentaire

#### Composants
- **DocumentManager** - Composant principal avec onglets
- **DocumentList** - Liste des documents avec tri et pagination (à créer)
- **DocumentUpload** - Formulaire d'upload avec catégories/tags/dossiers (à créer)
- **DocumentFilters** - Filtres avancés (à créer)
- **FolderTree** - Arborescence des dossiers (à créer)
- **CategoryManager** - Gestion des catégories (à créer)
- **TagManager** - Gestion des tags (à créer)

## 🚀 Installation et Configuration

### 1. Initialiser les catégories système

```bash
cd backend
node scripts/initDocumentCategories.js
```

Cela créera les catégories par défaut :
- Contrat
- Facture
- Maintenance
- Règlement
- Fiche Technique
- Plan Maintenance
- Autre

### 2. Redémarrer le backend

Les nouvelles routes sont automatiquement chargées dans `server.js`.

### 3. Créer les composants frontend manquants

Les composants suivants doivent être créés :
- `frontend/components/documents/DocumentList.tsx`
- `frontend/components/documents/DocumentUpload.tsx`
- `frontend/components/documents/DocumentFilters.tsx`
- `frontend/components/documents/FolderTree.tsx`
- `frontend/components/documents/CategoryManager.tsx`
- `frontend/components/documents/TagManager.tsx`

## 📋 Fonctionnalités

### Recherche et Filtres
- Recherche textuelle (nom, description)
- Filtre par catégorie
- Filtre par dossier
- Filtre par tags (multiple)
- Filtre par immeuble/unité
- Filtre archivé/non archivé

### Tri
- Par nom
- Par taille
- Par date
- Par nombre de téléchargements
- Ordre croissant/décroissant

### Permissions
- Admin : Accès complet
- Propriétaire : Documents de ses unités
- Locataire : Documents de son unité
- Visiteur : Documents publics uniquement

### Organisation
- Catégories personnalisables avec couleurs et icônes
- Tags multiples par document
- Dossiers hiérarchiques
- Métadonnées personnalisées

## 🔄 Prochaines Étapes

1. Créer les composants frontend manquants
2. Ajouter des tests unitaires
3. Implémenter la prévisualisation des documents
4. Ajouter le versioning des documents
5. Implémenter les notifications de changement

