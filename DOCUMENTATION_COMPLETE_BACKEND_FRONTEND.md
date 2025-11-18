# 📚 Documentation Complète - MonCondo+
## Architecture Backend et Frontend - Toutes les Routes et Relations

**Date de création**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Version**: 1.0.0  
**Projet**: MonCondo+ - Système de gestion immobilière

---

## 📋 Table des Matières

1. [Architecture Backend](#1-architecture-backend)
2. [Structure des Fichiers Backend](#2-structure-des-fichiers-backend)
3. [Routes Backend Complètes](#3-routes-backend-complètes)
4. [Architecture Frontend](#4-architecture-frontend)
5. [Structure des Fichiers Frontend](#5-structure-des-fichiers-frontend)
6. [Routes Frontend](#6-routes-frontend)
7. [Relations Backend-Frontend](#7-relations-backend-frontend)
8. [Services et Hooks Frontend](#8-services-et-hooks-frontend)
9. [Modèles de Données](#9-modèles-de-données)
10. [Middlewares et Sécurité](#10-middlewares-et-sécurité)
11. [Guide d'Uniformisation](#11-guide-duniformisation)

---

## 1. Architecture Backend

### 1.1 Technologies Utilisées
- **Node.js** (Runtime JavaScript)
- **Express.js** (Framework web)
- **MongoDB** (Base de données)
- **Mongoose** (ODM pour MongoDB)
- **JWT** (Authentification)
- **Socket.io** (Communication temps réel)
- **Multer** (Upload de fichiers)
- **Bcrypt** (Hachage de mots de passe)

### 1.2 Structure du Projet Backend
```
backend/
├── config/              # Configuration
│   ├── database.js      # Configuration MongoDB
│   └── jwt.js           # Configuration JWT
├── controllers/         # Logique métier
├── middlewares/         # Middlewares Express
├── models/              # Modèles Mongoose
├── routes/              # Définition des routes
├── services/            # Services métier
├── utils/               # Utilitaires
├── uploads/             # Fichiers uploadés
└── server.js            # Point d'entrée
```

---

## 2. Structure des Fichiers Backend

### 2.1 Fichiers Principaux

#### `server.js`
- **Rôle**: Point d'entrée de l'application
- **Port**: 5000 (par défaut)
- **Fonctions principales**:
  - Configuration Express
  - Configuration CORS
  - Configuration Socket.io
  - Montage des routes
  - Gestion des erreurs
  - Middleware de logging

#### `package.json`
- **Dépendances principales**:
  - express
  - mongoose
  - jsonwebtoken
  - bcryptjs
  - socket.io
  - multer
  - dotenv
  - cors

### 2.2 Controllers (Logique Métier)

| Fichier | Description | Fonctions Principales |
|---------|-------------|----------------------|
| `authController.js` | Authentification | register, login, getMe, forgotPassword, resetPassword, updatePassword |
| `userController.js` | Gestion utilisateurs | getUsers, getUser, createUser, updateUser, deleteUser, promoteToOwner |
| `buildingController.js` | Gestion immeubles | getBuildings, getBuilding, createBuilding, updateBuilding, deleteBuilding, getBuildingsStats |
| `unitController.js` | Gestion unités | getUnits, getUnit, createUnit, updateUnit, deleteUnit, getAvailableUnits, getUnitsStats, assignOwner, assignTenant |
| `requestController.js` | Gestion demandes | getRequests, getRequest, createRequest, updateRequest, deleteRequest, acceptRequest, rejectRequest, assignRequest |
| `paymentController.js` | Gestion paiements | getPayments, getPayment, createPayment, updatePayment, deletePayment, processPayment, generateReceipt |
| `messageController.js` | Gestion messages | getMessages, getMessage, createMessage, updateMessage, deleteMessage, markAsRead |
| `documentController.js` | Gestion documents | getDocuments, getDocument, createDocument, updateDocument, deleteDocument, downloadDocument |
| `notificationController.js` | Gestion notifications | getNotifications, createNotification, markAsRead, deleteNotification |
| `conversationController.js` | Gestion conversations | getConversations, getConversation, createConversation, archiveConversation |

### 2.3 Models (Schémas MongoDB)

| Fichier | Collection | Champs Principaux |
|---------|-----------|-------------------|
| `User.js` | users | email, password, firstName, lastName, role, isActive |
| `Building.js` | buildings | name, address, admin, totalUnits, isActive |
| `Unit.js` | units | unitNumber, building, type, size, bedrooms, status, rentPrice, salePrice |
| `Request.js` | requests | type, status, applicant, unit, documents, adminNotes |
| `Payment.js` | payments | amount, type, status, unit, payer, dueDate, paidDate |
| `Message.js` | messages | sender, recipient, content, read, conversation |
| `Document.js` | documents | name, type, filePath, request, signed |
| `Notification.js` | notifications | user, type, title, message, read |
| `Conversation.js` | conversations | participants, type, lastMessage, archived |

### 2.4 Middlewares

| Fichier | Description | Utilisation |
|---------|-------------|-------------|
| `auth.js` | Authentification JWT | `protect`, `optionalAuth` |
| `roleAuth.js` | Autorisation par rôle | `roleAuth('admin')`, `roleAuth('admin', 'proprietaire')` |
| `upload.js` | Upload de fichiers | Multer configuration |
| `authorizePayment.js` | Autorisation paiement | Vérification permissions paiement |

### 2.5 Services

| Fichier | Description |
|---------|-------------|
| `emailService.js` | Envoi d'emails |
| `paymentService.js` | Logique métier paiements |
| `paymentProviders.js` | Intégration Stripe, Interac, virements |
| `documentService.js` | Génération documents PDF |
| `pdfService.js` | Génération PDF |
| `excelService.js` | Génération Excel |
| `notificationService.js` | Gestion notifications |
| `requestSyncService.js` | Synchronisation demandes |
| `paymentSyncService.js` | Synchronisation paiements |
| `messageSyncService.js` | Synchronisation messages |
| `globalSyncService.js` | Synchronisation globale |

---

## 3. Routes Backend Complètes

### 3.1 Ordre de Montage des Routes (CRITIQUE)

L'ordre dans `server.js` est **CRITIQUE**. Les routes spécifiques doivent être montées **AVANT** les routes génériques.

```javascript
// 1. Route de santé (publique)
app.get('/api/health', ...)

// 2. Routes spécifiques (par ordre d'importance)
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/buildings', buildingRoutes)  // ⚠️ IMPORTANT: Avant dashboardRoutes
app.use('/api/units', unitRoutes)
app.use('/api/requests', requestRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/conversations', conversationRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/upload', uploadRoutes)

// 3. Routes dashboard (génériques)
app.use('/api', dashboardRoutes)

// 4. Route générique /api (dernier recours)
app.use('/api', indexRoutes)
```

### 3.2 Routes d'Authentification
**Base URL**: `/api/auth`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| POST | `/register` | Inscription | Public | `register` |
| POST | `/login` | Connexion | Public | `login` |
| GET | `/me` | Infos utilisateur connecté | Authentifié | `getMe` |
| POST | `/forgotpassword` | Demande réinitialisation | Public | `forgotPassword` |
| PUT | `/resetpassword/:resettoken` | Réinitialisation | Public | `resetPassword` |
| PUT | `/updatepassword` | Mise à jour mot de passe | Authentifié | `updatePassword` |

### 3.3 Routes Utilisateurs
**Base URL**: `/api/users`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/` | Liste utilisateurs | Admin | `getUsers` |
| POST | `/` | Créer utilisateur | Admin | `createUser` |
| GET | `/:id` | Détails utilisateur | Authentifié | `getUser` |
| PUT | `/:id` | Modifier utilisateur | Authentifié | `updateUser` |
| DELETE | `/:id` | Supprimer utilisateur | Admin | `deleteUser` |
| PUT | `/:id/promote` | Promouvoir propriétaire | Admin | `promoteToOwner` |

### 3.4 Routes Immeubles ⭐
**Base URL**: `/api/buildings`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/` | Liste immeubles | Authentifié | `getBuildings` |
| POST | `/` | Créer immeuble | Admin | `createBuilding` |
| GET | `/:id` | Détails immeuble | Admin | `getBuilding` |
| PUT | `/:id` | Modifier immeuble | Admin | `updateBuilding` |
| DELETE | `/:id` | Supprimer immeuble | Admin | `deleteBuilding` |
| GET | `/stats` | Statistiques immeubles | Admin | `getBuildingsStats` |

**⚠️ IMPORTANT**: Cette route doit être montée **AVANT** `dashboardRoutes` dans `server.js`.

**Réponse GET `/api/buildings`**:
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "...",
      "name": "Résidence ABC",
      "address": {
        "street": "123 Rue Example",
        "city": "Montréal",
        "province": "QC",
        "postalCode": "H1A 1A1"
      },
      "totalUnits": 10,
      "availableUnits": 4,
      "rentedUnits": 6,
      "monthlyRevenue": 12000,
      "occupancyRate": 60,
      "imageUrl": "...",
      "isActive": true
    }
  ]
}
```

### 3.5 Routes Unités
**Base URL**: `/api/units`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/available` | Unités disponibles | Public (optionalAuth) | `getAvailableUnits` |
| GET | `/` | Liste unités | Authentifié | `getUnits` |
| POST | `/` | Créer unité | Admin | `createUnit` |
| GET | `/nouvelles` | Unités récentes | Authentifié | `getNouvellesUnits` |
| GET | `/stats` | Statistiques unités | Admin | `getUnitsStats` |
| GET | `/:id` | Détails unité | Authentifié | `getUnit` |
| PUT | `/:id` | Modifier unité | Authentifié | `updateUnit` |
| DELETE | `/:id` | Supprimer unité | Admin | `deleteUnit` |
| PUT | `/:id/assign-owner` | Assigner propriétaire | Admin | `assignOwner` |
| PUT | `/:id/assign-tenant` | Assigner locataire | Authentifié | `assignTenant` |
| PUT | `/:id/release` | Libérer unité | Authentifié | `releaseUnit` |

### 3.6 Routes Demandes
**Base URL**: `/api/requests`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/` | Liste demandes | Authentifié | `getRequests` |
| POST | `/` | Créer demande | Authentifié | `createRequest` |
| POST | `/visitor-request` | Demande visiteur | Authentifié | `createVisitorRequest` |
| GET | `/:id` | Détails demande | Authentifié | `getRequest` |
| PUT | `/:id` | Modifier demande | Authentifié | `updateRequest` |
| DELETE | `/:id` | Supprimer demande | Authentifié | `deleteRequest` |
| PUT | `/:id/status` | Modifier statut | Admin | `updateStatus` |
| PUT | `/:id/assign` | Assigner admin | Admin | `assignRequest` |
| PUT | `/:id/accept` | Accepter demande | Admin | `acceptRequest` |
| PUT | `/:id/reject` | Rejeter demande | Admin | `rejectRequest` |
| POST | `/:id/notes` | Ajouter note admin | Admin | `addAdminNote` |
| PUT | `/:id/assign-unit` | Assigner unité | Admin | `assignUnit` |
| PUT | `/:id/documents/:docId/sign` | Signer document | Authentifié | `signDocument` |
| GET | `/:id/documents/:docId/download` | Télécharger document | Authentifié | `downloadDocument` |
| GET | `/:id/payment-status` | Statut paiement | Authentifié | `getPaymentStatus` |
| POST | `/:id/payment/initiate` | Initier paiement | Authentifié | `initiateInitialPayment` |
| PUT | `/:id/payment/validate` | Valider paiement | Admin | `validateInitialPayment` |

### 3.7 Routes Paiements
**Base URL**: `/api/payments`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/` | Liste paiements | Authentifié | `getPayments` |
| POST | `/` | Créer paiement | Authentifié | `createPayment` |
| GET | `/stats` | Statistiques paiements | Authentifié | `getPaymentStats` |
| GET | `/next-due` | Prochain paiement dû | Locataire | `getNextDuePayment` |
| GET | `/overdue/all` | Paiements en retard | Admin | `getOverduePayments` |
| GET | `/report/pdf` | Rapport PDF | Admin | `generatePaymentReport` |
| GET | `/report/excel` | Rapport Excel | Admin | `generatePaymentReportExcel` |
| GET | `/:id` | Détails paiement | Authentifié | `getPayment` |
| PUT | `/:id` | Modifier paiement | Admin | `updatePayment` |
| DELETE | `/:id` | Supprimer paiement | Admin | `deletePayment` |
| POST | `/:id/process` | Traiter paiement | Authentifié | `processPayment` |
| POST | `/:id/stripe/create-intent` | Créer intention Stripe | Authentifié | `createStripeIntent` |
| POST | `/:id/stripe/confirm` | Confirmer Stripe | Authentifié | `confirmStripePayment` |
| POST | `/:id/interac/instructions` | Instructions Interac | Authentifié | `createInteracInstructions` |
| POST | `/:id/bank-transfer/instructions` | Instructions virement | Authentifié | `createBankTransferInstructions` |
| GET | `/:id/receipt` | Générer reçu | Authentifié | `generateReceipt` |

### 3.8 Routes Messages
**Base URL**: `/api/messages`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/` | Liste messages | Authentifié | `getMessages` |
| POST | `/` | Créer message | Authentifié | `createMessage` |
| GET | `/unread` | Messages non lus | Authentifié | `getUnreadMessages` |
| GET | `/unread/count` | Nombre non lus | Authentifié | `getUnreadCount` |
| GET | `/conversation/:userId` | Conversation avec utilisateur | Authentifié | `getConversation` |
| GET | `/:id` | Détails message | Authentifié | `getMessage` |
| PUT | `/:id` | Modifier message | Authentifié | `updateMessage` |
| DELETE | `/:id` | Supprimer message | Authentifié | `deleteMessage` |
| PUT | `/:id/read` | Marquer comme lu | Authentifié | `markAsRead` |

### 3.9 Routes Documents
**Base URL**: `/api/documents`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/` | Liste documents | Authentifié | `getDocuments` |
| POST | `/` | Créer document | Authentifié | `createDocument` |
| GET | `/:id` | Détails document | Authentifié | `getDocument` |
| PUT | `/:id` | Modifier document | Authentifié | `updateDocument` |
| DELETE | `/:id` | Supprimer document | Authentifié | `deleteDocument` |
| GET | `/:id/download` | Télécharger document | Authentifié | `downloadDocument` |

### 3.10 Routes Notifications
**Base URL**: `/api/notifications`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/` | Liste notifications | Authentifié | `getNotifications` |
| POST | `/` | Créer notification | Authentifié | `createNotification` |
| GET | `/export/:format` | Exporter historique | Authentifié | `exportHistory` |
| PATCH | `/read/all` | Marquer tout comme lu | Authentifié | `markAllAsRead` |
| PATCH | `/read/:id` | Marquer comme lu | Authentifié | `markAsRead` |
| DELETE | `/:id` | Supprimer notification | Authentifié | `deleteNotification` |

### 3.11 Routes Conversations
**Base URL**: `/api/conversations`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/` | Liste conversations | Authentifié | `getConversations` |
| GET | `/contacts` | Liste contacts | Authentifié | `getContacts` |
| POST | `/direct` | Créer conversation directe | Authentifié | `createOrGetDirectConversation` |
| POST | `/unit` | Créer conversation unité | Authentifié | `createUnitConversation` |
| GET | `/:id` | Détails conversation | Authentifié | `getConversation` |
| GET | `/:id/messages` | Messages conversation | Authentifié | `getConversationMessages` |
| PUT | `/:id/archive` | Archiver conversation | Authentifié | `archiveConversation` |

### 3.12 Routes Upload
**Base URL**: `/api/upload`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| POST | `/messages` | Upload fichiers messages | Authentifié | Upload middleware |

### 3.13 Routes Dashboard
**Base URL**: `/api`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/admin/dashboard` | Dashboard admin | Admin | Dashboard handler |
| GET | `/admin/users` | Liste utilisateurs (admin) | Admin | Dashboard handler |
| GET | `/admin/stats` | Statistiques système | Admin | Dashboard handler |
| GET | `/proprietaire/dashboard` | Dashboard propriétaire | Propriétaire | Dashboard handler |
| GET | `/proprietaire/my-units` | Mes unités (propriétaire) | Propriétaire | Dashboard handler |
| GET | `/locataire/dashboard` | Dashboard locataire | Locataire | Dashboard handler |
| GET | `/locataire/my-unit` | Mon unité (locataire) | Locataire | Dashboard handler |
| GET | `/dashboard` | Dashboard général | Tous rôles | Dashboard handler |
| GET | `/me` | Infos utilisateur | Authentifié | Dashboard handler |

### 3.14 Route Générique
**Base URL**: `/api`

| Méthode | Route | Description | Accès |
|---------|-------|-------------|-------|
| GET | `/` | Informations API | Public |

---

## 4. Architecture Frontend

### 4.1 Technologies Utilisées
- **Next.js** (Framework React)
- **React** (Bibliothèque UI)
- **TypeScript** (Typage statique)
- **Axios** (Client HTTP)
- **Socket.io-client** (Communication temps réel)
- **Tailwind CSS** (Styling)

### 4.2 Structure du Projet Frontend
```
frontend/
├── components/          # Composants réutilisables
├── contexts/           # Contextes React
├── hooks/              # Hooks personnalisés
├── pages/              # Pages Next.js
├── services/           # Services API
├── utils/              # Utilitaires
└── public/             # Fichiers statiques
```

---

## 5. Structure des Fichiers Frontend

### 5.1 Pages Principales

| Fichier | Route | Description | Rôle Requis |
|---------|-------|-------------|-------------|
| `index.tsx` | `/` | Page d'accueil | Public |
| `login.tsx` | `/login` | Connexion | Public |
| `dashboard/admin.tsx` | `/dashboard/admin` | Dashboard admin | Admin |
| `dashboard/proprietaire.tsx` | `/dashboard/proprietaire` | Dashboard propriétaire | Propriétaire |
| `dashboard/locataire.tsx` | `/dashboard/locataire` | Dashboard locataire | Locataire |
| `admin/buildings.tsx` | `/admin/buildings` | Gestion immeubles | Admin |
| `admin/units.tsx` | `/admin/units` | Gestion unités | Admin |
| `admin/users.tsx` | `/admin/users` | Gestion utilisateurs | Admin |
| `admin/requests.tsx` | `/admin/requests` | Gestion demandes | Admin |
| `buildings/[id].tsx` | `/buildings/:id` | Détails immeuble | Authentifié |
| `buildings/[id]/edit.tsx` | `/buildings/:id/edit` | Modifier immeuble | Admin |
| `units/[id].tsx` | `/units/:id` | Détails unité | Authentifié |
| `payments/index.tsx` | `/payments` | Liste paiements | Authentifié |
| `payments/admin.tsx` | `/payments/admin` | Gestion paiements | Admin |
| `messages.tsx` | `/messages` | Messagerie | Authentifié |
| `documents.tsx` | `/documents` | Documents | Authentifié |

### 5.2 Composants

| Fichier | Description |
|---------|-------------|
| `Header.tsx` | En-tête avec navigation |
| `Footer.tsx` | Pied de page |
| `ProtectedRoute.tsx` | Protection des routes par rôle |
| `LoadingSpinner.tsx` | Indicateur de chargement |
| `ErrorBoundary.tsx` | Gestion des erreurs |

### 5.3 Contextes

| Fichier | Description |
|---------|-------------|
| `AuthContext.tsx` | Authentification utilisateur |
| `SocketContext.tsx` | Communication Socket.io |
| `NotificationContext.tsx` | Gestion notifications |

---

## 6. Routes Frontend

### 6.1 Routes Publiques

| Route | Page | Description |
|-------|------|-------------|
| `/` | `index.tsx` | Page d'accueil |
| `/login` | `login.tsx` | Connexion |
| `/404` | `404.tsx` | Page non trouvée |
| `/unauthorized` | `unauthorized.tsx` | Accès refusé |

### 6.2 Routes Authentifiées

| Route | Page | Rôle | Description |
|-------|------|------|-------------|
| `/dashboard/admin` | `dashboard/admin.tsx` | Admin | Dashboard administrateur |
| `/dashboard/proprietaire` | `dashboard/proprietaire.tsx` | Propriétaire | Dashboard propriétaire |
| `/dashboard/locataire` | `dashboard/locataire.tsx` | Locataire | Dashboard locataire |
| `/admin/buildings` | `admin/buildings.tsx` | Admin | Gestion immeubles |
| `/admin/units` | `admin/units.tsx` | Admin | Gestion unités |
| `/admin/users` | `admin/users.tsx` | Admin | Gestion utilisateurs |
| `/admin/requests` | `admin/requests.tsx` | Admin | Gestion demandes |
| `/buildings/:id` | `buildings/[id].tsx` | Authentifié | Détails immeuble |
| `/buildings/:id/edit` | `buildings/[id]/edit.tsx` | Admin | Modifier immeuble |
| `/units/:id` | `units/[id].tsx` | Authentifié | Détails unité |
| `/payments` | `payments/index.tsx` | Authentifié | Liste paiements |
| `/payments/admin` | `payments/admin.tsx` | Admin | Gestion paiements |
| `/messages` | `messages.tsx` | Authentifié | Messagerie |
| `/documents` | `documents.tsx` | Authentifié | Documents |

### 6.3 Redirections

| Route Ancienne | Route Nouvelle | Raison |
|----------------|----------------|--------|
| `/buildings` | `/admin/buildings` | Uniformisation |
| `/units` | `/admin/units` | Uniformisation |

---

## 7. Relations Backend-Frontend

### 7.1 Mapping Routes Backend → Frontend

#### Immeubles
| Frontend | Backend | Méthode | Description |
|----------|---------|---------|-------------|
| `admin/buildings.tsx` | `/api/buildings` | GET | Liste immeubles |
| `admin/buildings.tsx` | `/api/buildings/stats` | GET | Statistiques immeubles |
| `buildings/[id].tsx` | `/api/buildings/:id` | GET | Détails immeuble |
| `buildings/[id]/edit.tsx` | `/api/buildings/:id` | PUT | Modifier immeuble |
| `admin/buildings.tsx` | `/api/buildings` | POST | Créer immeuble |
| `admin/buildings.tsx` | `/api/buildings/:id` | DELETE | Supprimer immeuble |

#### Unités
| Frontend | Backend | Méthode | Description |
|----------|---------|---------|-------------|
| `admin/units.tsx` | `/api/units` | GET | Liste unités |
| `admin/units.tsx` | `/api/units/stats` | GET | Statistiques unités |
| `admin/units.tsx` | `/api/units/available` | GET | Unités disponibles |
| `units/[id].tsx` | `/api/units/:id` | GET | Détails unité |
| `admin/units.tsx` | `/api/units` | POST | Créer unité |
| `admin/units.tsx` | `/api/units/:id` | PUT | Modifier unité |
| `admin/units.tsx` | `/api/units/:id` | DELETE | Supprimer unité |

#### Dashboard
| Frontend | Backend | Méthode | Description |
|----------|---------|---------|-------------|
| `dashboard/admin.tsx` | `/api/admin/dashboard` | GET | Dashboard admin |
| `dashboard/admin.tsx` | `/api/admin/stats` | GET | Statistiques admin |
| `dashboard/proprietaire.tsx` | `/api/proprietaire/dashboard` | GET | Dashboard propriétaire |
| `dashboard/locataire.tsx` | `/api/locataire/dashboard` | GET | Dashboard locataire |

### 7.2 Services Frontend

#### `realEstateService.ts`
Service centralisé pour les données immobilières.

**Fonctions principales**:
- `getAllBuildings()` → `GET /api/buildings`
- `getBuildingsStats()` → `GET /api/buildings/stats`
- `getAllUnits()` → `GET /api/units`
- `getAvailableUnits()` → `GET /api/units/available`
- `getUnitsStats()` → `GET /api/units/stats`
- `getGlobalStats()` → `GET /api/admin/stats`

#### `axiosInstances.ts`
Instances Axios configurées.

- `authenticatedAxios`: Instance avec token JWT automatique
- `publicAxios`: Instance pour routes publiques

---

## 8. Services et Hooks Frontend

### 8.1 Hooks Personnalisés

| Hook | Fichier | Description |
|------|---------|-------------|
| `useAuth` | `contexts/AuthContext.tsx` | Authentification utilisateur |
| `useSocket` | `contexts/SocketContext.tsx` | Communication Socket.io |
| `useGlobalStats` | `hooks/useGlobalStats.ts` | Statistiques globales |
| `useRealEstateData` | `hooks/useRealEstateData.ts` | Données immobilières |

### 8.2 Services

| Service | Fichier | Description |
|---------|---------|-------------|
| `realEstateService` | `services/realEstateService.ts` | Service immobiliers |
| `axiosInstances` | `utils/axiosInstances.ts` | Instances Axios |

---

## 9. Modèles de Données

### 9.1 User (Utilisateur)
```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed, required),
  firstName: String (required),
  lastName: String (required),
  role: String (enum: ['admin', 'proprietaire', 'locataire', 'visiteur']),
  phone: String,
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### 9.2 Building (Immeuble)
```javascript
{
  _id: ObjectId,
  name: String (required),
  address: {
    street: String (required),
    city: String (required),
    province: String (required),
    postalCode: String (required),
    country: String (default: 'Canada')
  },
  admin: ObjectId (ref: 'User', required),
  totalUnits: Number (default: 0),
  yearBuilt: Number,
  description: String,
  amenities: [String],
  image: String,
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### 9.3 Unit (Unité)
```javascript
{
  _id: ObjectId,
  unitNumber: String (required),
  building: ObjectId (ref: 'Building', required),
  floor: Number,
  type: String (required),
  size: Number (required),
  bedrooms: Number (required),
  bathrooms: Number,
  status: String (enum: ['disponible', 'loue', 'en_location', 'vendu', 'Vendu']),
  rentPrice: Number,
  salePrice: Number,
  monthlyCharges: Number,
  availableFrom: Date,
  description: String,
  images: [String],
  isAvailable: Boolean (default: true),
  proprietaire: ObjectId (ref: 'User'),
  locataire: ObjectId (ref: 'User'),
  createdAt: Date,
  updatedAt: Date
}
```

---

## 10. Middlewares et Sécurité

### 10.1 Middleware `protect`
- Vérifie la présence du token JWT
- Vérifie la validité du token
- Vérifie que l'utilisateur existe et est actif
- Ajoute `req.user` à la requête

### 10.2 Middleware `roleAuth`
- Vérifie que l'utilisateur a un des rôles requis
- Utilisation: `roleAuth('admin')`, `roleAuth('admin', 'proprietaire')`

### 10.3 Middleware `optionalAuth`
- Authentification optionnelle
- Si token présent, ajoute `req.user`
- Si token absent, continue sans erreur

---

## 11. Guide d'Uniformisation

### 11.1 Règles d'Uniformisation

#### ✅ À FAIRE
1. **Utiliser `realEstateService`** pour toutes les données immobilières
2. **Utiliser `authenticatedAxios`** pour toutes les requêtes authentifiées
3. **Utiliser `useGlobalStats`** pour les statistiques globales
4. **Routes frontend**: `/admin/buildings` et `/admin/units` (pas `/buildings`)
5. **Routes backend**: Toujours préfixées par `/api/`

#### ❌ À ÉVITER
1. ❌ Appels directs à `axios` (utiliser `authenticatedAxios`)
2. ❌ Routes frontend `/buildings` (utiliser `/admin/buildings`)
3. ❌ Calculs de stats côté frontend (utiliser les endpoints backend)
4. ❌ Données hardcodées (toujours depuis la DB)

### 11.2 Checklist de Vérification

Pour chaque page frontend:
- [ ] Utilise `realEstateService` ou `authenticatedAxios`
- [ ] Gère les erreurs (401, 403, 404, 500)
- [ ] Affiche un état de chargement
- [ ] Utilise les hooks appropriés (`useAuth`, `useGlobalStats`)
- [ ] Routes backend correctes et documentées
- [ ] Protection par rôle si nécessaire

### 11.3 Ordre de Montage des Routes Backend

**CRITIQUE**: L'ordre dans `server.js` doit être respecté:

1. `/api/health` (route de santé)
2. `/api/auth` (authentification)
3. `/api/users` (utilisateurs)
4. **`/api/buildings`** ⭐ (immeubles - AVANT dashboardRoutes)
5. `/api/units` (unités)
6. `/api/requests` (demandes)
7. `/api/documents` (documents)
8. `/api/messages` (messages)
9. `/api/conversations` (conversations)
10. `/api/payments` (paiements)
11. `/api/notifications` (notifications)
12. `/api/upload` (upload)
13. `/api` (dashboardRoutes - routes dashboard)
14. `/api` (indexRoutes - route générique)

### 11.4 Vérification des Routes

Pour vérifier qu'une route backend fonctionne:

1. **Vérifier le backend est démarré**:
   ```powershell
   Invoke-WebRequest -Uri "http://localhost:5000/api/health"
   ```

2. **Tester la route sans token** (devrait retourner 401):
   ```powershell
   node test-buildings-route-simple.js
   ```

3. **Vérifier les logs du backend**:
   - Chercher `[BUILDING ROUTES]` pour les routes buildings
   - Chercher `[SERVER]` pour les logs serveur

4. **Vérifier la console du navigateur**:
   - Ouvrir F12 → Console
   - Chercher les logs `[realEstateService]` ou `[AdminBuildings]`

---

## 12. Résumé des Endpoints Critiques

### 12.1 Immeubles ⭐
- `GET /api/buildings` - Liste immeubles (Authentifié)
- `GET /api/buildings/stats` - Statistiques (Admin)
- `GET /api/buildings/:id` - Détails (Admin)
- `POST /api/buildings` - Créer (Admin)
- `PUT /api/buildings/:id` - Modifier (Admin)
- `DELETE /api/buildings/:id` - Supprimer (Admin)

### 12.2 Unités
- `GET /api/units` - Liste unités (Authentifié)
- `GET /api/units/stats` - Statistiques (Admin)
- `GET /api/units/available` - Disponibles (Public avec optionalAuth)
- `GET /api/units/:id` - Détails (Authentifié)
- `POST /api/units` - Créer (Admin)
- `PUT /api/units/:id` - Modifier (Authentifié)
- `DELETE /api/units/:id` - Supprimer (Admin)

### 12.3 Dashboard
- `GET /api/admin/dashboard` - Dashboard admin (Admin)
- `GET /api/admin/stats` - Statistiques système (Admin)
- `GET /api/proprietaire/dashboard` - Dashboard propriétaire (Propriétaire)
- `GET /api/locataire/dashboard` - Dashboard locataire (Locataire)

---

## 13. Problèmes Courants et Solutions

### 13.1 Route 404
**Problème**: Route retourne 404  
**Solutions**:
1. Vérifier que le backend est redémarré
2. Vérifier l'ordre des routes dans `server.js`
3. Vérifier que la route est bien montée
4. Vérifier les logs du backend

### 13.2 Erreur 401 (Non autorisé)
**Problème**: Token manquant ou expiré  
**Solutions**:
1. Vérifier que l'utilisateur est connecté
2. Vérifier que le token est présent dans localStorage
3. Se reconnecter si nécessaire

### 13.3 Erreur 403 (Accès refusé)
**Problème**: Rôle insuffisant  
**Solutions**:
1. Vérifier que l'utilisateur a le rôle requis
2. Vérifier le middleware `roleAuth`

### 13.4 Données non affichées
**Problème**: Page affiche 0 ou données vides  
**Solutions**:
1. Vérifier que la base de données contient des données
2. Vérifier les logs du backend
3. Vérifier la console du navigateur
4. Vérifier que les endpoints retournent des données

---

## 14. Commandes Utiles

### 14.1 Backend
```powershell
# Démarrer le backend
cd backend
npm start

# Vérifier la santé
Invoke-WebRequest -Uri "http://localhost:5000/api/health"

# Tester une route
node test-buildings-route-simple.js
```

### 14.2 Frontend
```powershell
# Démarrer le frontend
cd frontend
npm run dev

# Build production
npm run build
npm start
```

---

## 15. Contacts et Support

Pour toute question ou problème:
1. Vérifier cette documentation
2. Vérifier les logs du backend
3. Vérifier la console du navigateur
4. Vérifier les fichiers de test

---

**Fin du Document**

*Document généré automatiquement - MonCondo+ v1.0.0*


