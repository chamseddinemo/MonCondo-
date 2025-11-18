# Documentation Complète des Routes Backend - MonCondo+

## Table des matières
1. [Routes d'authentification](#routes-dauthentification)
2. [Routes utilisateurs](#routes-utilisateurs)
3. [Routes immeubles](#routes-immeubles)
4. [Routes unités](#routes-unités)
5. [Routes paiements](#routes-paiements)
6. [Routes demandes](#routes-demandes)
7. [Routes messages](#routes-messages)
8. [Routes notifications](#routes-notifications)
9. [Routes documents](#routes-documents)
10. [Routes conversations](#routes-conversations)
11. [Routes upload](#routes-upload)
12. [Routes dashboard](#routes-dashboard)
13. [Résumé des fonctionnalités](#résumé-des-fonctionnalités)

---	

## Routes d'authentification
**Base URL:** `/api/auth`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| POST | `/register` | Inscription d'un nouvel utilisateur | Public | `register` |
| POST | `/login` | Connexion d'un utilisateur | Public | `login` |
| GET | `/me` | Récupérer les informations de l'utilisateur connecté | Authentifié | `getMe` |
| POST | `/forgotpassword` | Demander une réinitialisation de mot de passe | Public | `forgotPassword` |
| PUT | `/resetpassword/:resettoken` | Réinitialiser le mot de passe avec un token | Public | `resetPassword` |
| PUT | `/updatepassword` | Mettre à jour le mot de passe | Authentifié | `updatePassword` |

**Fonctionnalités:**
- Inscription avec validation des données
- Authentification JWT
- Réinitialisation de mot de passe par email
- Gestion des sessions

---

## Routes utilisateurs
**Base URL:** `/api/users`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/` | Liste tous les utilisateurs | Admin | `getUsers` |
| POST | `/` | Créer un nouvel utilisateur | Admin | `createUser` |
| GET | `/:id` | Récupérer un utilisateur spécifique | Authentifié | `getUser` |
| PUT | `/:id` | Mettre à jour un utilisateur | Authentifié | `updateUser` |
| DELETE | `/:id` | Supprimer un utilisateur | Admin | `deleteUser` |
| PUT | `/:id/promote` | Promouvoir un utilisateur au rôle propriétaire | Admin | `promoteToOwner` |

**Fonctionnalités:**
- Gestion complète des utilisateurs (CRUD)
- Promotion de rôles
- Filtrage par rôle, statut actif
- Protection des données sensibles (mots de passe)

---

## Routes immeubles
**Base URL:** `/api/buildings`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/` | Liste tous les immeubles | Public (optionalAuth) | `getBuildings` |
| POST | `/` | Créer un nouvel immeuble | Admin | `createBuilding` |
| GET | `/:id` | Récupérer un immeuble spécifique | Authentifié | `getBuilding` |
| PUT | `/:id` | Mettre à jour un immeuble | Admin | `updateBuilding` |
| DELETE | `/:id` | Supprimer un immeuble | Admin | `deleteBuilding` |
| PUT | `/:id/assign-admin` | Assigner un administrateur à un immeuble | Admin | `assignAdmin` |

**Fonctionnalités:**
- Gestion complète des immeubles
- Liste publique des immeubles actifs
- Association d'administrateurs
- Gestion des adresses et informations détaillées

---

## Routes unités
**Base URL:** `/api/units`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/available` | Liste les unités disponibles (à louer/vendre) | Public (optionalAuth) | `getAvailableUnits` |
| GET | `/nouvelles` | Liste les unités récemment ajoutées | Authentifié | `getNouvellesUnits` |
| GET | `/` | Liste toutes les unités | Authentifié | `getUnits` |
| POST | `/` | Créer une nouvelle unité | Admin | `createUnit` |
| GET | `/:id` | Récupérer une unité spécifique | Authentifié | `getUnit` |
| PUT | `/:id` | Mettre à jour une unité | Authentifié | `updateUnit` |
| DELETE | `/:id` | Supprimer une unité | Admin | `deleteUnit` |
| PUT | `/:id/assign-owner` | Assigner un propriétaire à une unité | Admin | `assignOwner` |
| PUT | `/:id/assign-tenant` | Assigner un locataire à une unité | Authentifié | `assignTenant` |
| PUT | `/:id/release` | Libérer une unité (retirer locataire) | Authentifié | `releaseUnit` |

**Fonctionnalités:**
- Gestion complète des unités
- Liste publique des unités disponibles
- Attribution de propriétaires et locataires
- Filtrage par statut, type, prix, taille
- Gestion des images et descriptions

---

## Routes paiements
**Base URL:** `/api/payments`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/` | Liste tous les paiements | Authentifié | `getPayments` |
| POST | `/` | Créer un nouveau paiement | Authentifié (avec autorisation) | `createPayment` |
| GET | `/stats` | Statistiques des paiements | Authentifié | `getPaymentStats` |
| GET | `/next-due` | Prochain paiement dû (locataire) | Authentifié | `getNextDuePayment` |
| GET | `/overdue/all` | Liste tous les paiements en retard | Admin | `getOverduePayments` |
| GET | `/report/pdf` | Générer un rapport PDF des paiements | Admin | `generatePaymentReport` |
| GET | `/report/excel` | Générer un rapport Excel des paiements | Admin | `generatePaymentReportExcel` |
| GET | `/:id` | Récupérer un paiement spécifique | Authentifié | `getPayment` |
| PUT | `/:id` | Mettre à jour un paiement | Admin | `updatePayment` |
| DELETE | `/:id` | Supprimer un paiement | Admin | `deletePayment` |
| POST | `/:id/process` | Traiter un paiement | Authentifié | `processPayment` |
| POST | `/:id/stripe/create-intent` | Créer une intention de paiement Stripe | Authentifié | `createStripeIntent` |
| POST | `/:id/stripe/confirm` | Confirmer un paiement Stripe | Authentifié | `confirmStripePayment` |
| POST | `/:id/interac/instructions` | Créer des instructions Interac | Authentifié | `createInteracInstructions` |
| POST | `/:id/bank-transfer/instructions` | Créer des instructions virement bancaire | Authentifié | `createBankTransferInstructions` |
| GET | `/:id/receipt` | Générer un reçu de paiement | Authentifié | `generateReceipt` |

**Fonctionnalités:**
- Gestion complète des paiements (loyers, paiements initiaux, commissions)
- Intégration Stripe pour paiements en ligne
- Support Interac et virements bancaires
- Génération de reçus et rapports
- Suivi des paiements en retard
- Synchronisation automatique des statuts
- Statistiques détaillées

---

## Routes demandes
**Base URL:** `/api/requests`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/` | Liste toutes les demandes | Authentifié | `getRequests` |
| POST | `/` | Créer une nouvelle demande | Authentifié | `createRequest` |
| POST | `/visitor-request` | Créer une demande visiteur (public) | Authentifié | `createVisitorRequest` |
| GET | `/:id` | Récupérer une demande spécifique | Authentifié | `getRequest` |
| PUT | `/:id` | Mettre à jour une demande | Authentifié | `updateRequest` |
| DELETE | `/:id` | Supprimer une demande | Authentifié | `deleteRequest` |
| PUT | `/:id/status` | Mettre à jour le statut d'une demande | Admin | `updateStatus` |
| PUT | `/:id/assign` | Assigner une demande à un admin | Admin | `assignRequest` |
| PUT | `/:id/accept` | Accepter une demande | Admin | `acceptRequest` |
| PUT | `/:id/reject` | Rejeter une demande | Admin | `rejectRequest` |
| POST | `/:id/notes` | Ajouter une note admin à une demande | Admin | `addAdminNote` |
| PUT | `/:id/documents/:docId/sign` | Signer un document | Authentifié | `signDocument` |
| GET | `/:id/documents/:docId/download` | Télécharger un document | Authentifié | `downloadDocument` |
| PUT | `/:id/assign-unit` | Assigner une unité à une demande | Admin | `assignUnit` |
| GET | `/:id/payment-status` | Récupérer le statut du paiement initial | Authentifié | `getPaymentStatus` |
| POST | `/:id/payment/initiate` | Initier le paiement initial | Authentifié | `initiateInitialPayment` |
| PUT | `/:id/payment/validate` | Valider un paiement initial | Admin | `validateInitialPayment` |

**Fonctionnalités:**
- Gestion des demandes (location, achat, maintenance, réclamation, services)
- Workflow d'approbation (en attente, en cours, terminée)
- Génération automatique de documents (contrats, factures)
- Signature électronique de documents
- Paiements initiaux pour achats
- Notes et commentaires admin
- Filtrage par type, statut, priorité, unité
- Synchronisation temps réel

---

## Routes messages
**Base URL:** `/api/messages`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/` | Liste tous les messages | Authentifié | `getMessages` |
| POST | `/` | Créer un nouveau message | Authentifié | `createMessage` |
| GET | `/unread` | Liste les messages non lus | Authentifié | `getUnreadMessages` |
| GET | `/unread/count` | Compte les messages non lus | Authentifié | `getUnreadCount` |
| GET | `/conversation/:userId` | Récupérer une conversation avec un utilisateur | Authentifié | `getConversation` |
| GET | `/:id` | Récupérer un message spécifique | Authentifié | `getMessage` |
| PUT | `/:id` | Mettre à jour un message | Authentifié | `updateMessage` |
| DELETE | `/:id` | Supprimer un message | Authentifié | `deleteMessage` |
| PUT | `/:id/read` | Marquer un message comme lu | Authentifié | `markAsRead` |

**Fonctionnalités:**
- Messagerie en temps réel (Socket.io)
- Conversations directes entre utilisateurs
- Groupement par expéditeur
- Marquage des messages lus/non lus
- Compteur de messages non lus
- Support des pièces jointes
- Synchronisation automatique

---

## Routes notifications
**Base URL:** `/api/notifications`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/` | Liste toutes les notifications | Authentifié | `getNotifications` |
| PATCH | `/read/:id` | Marquer une notification comme lue | Authentifié | `markAsRead` |
| PATCH | `/read/all` | Marquer toutes les notifications comme lues | Authentifié | `markAllAsRead` |
| DELETE | `/:id` | Supprimer une notification | Authentifié | `deleteNotification` |
| GET | `/export/:format` | Exporter l'historique des notifications | Authentifié | `exportHistory` |

**Fonctionnalités:**
- Notifications en temps réel
- Types: paiements, documents, unités, demandes, messages
- Marquage individuel ou en masse
- Export de l'historique
- Filtrage par type et statut

---

## Routes documents
**Base URL:** `/api/documents`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/` | Liste tous les documents | Authentifié | `getDocuments` |
| POST | `/` | Uploader un document | Authentifié | `uploadDocument` |
| GET | `/:id` | Récupérer un document spécifique | Authentifié | `getDocument` |
| PUT | `/:id` | Mettre à jour un document | Authentifié | `updateDocument` |
| DELETE | `/:id` | Supprimer un document | Authentifié | `deleteDocument` |
| GET | `/:id/download` | Télécharger un document | Authentifié | `downloadDocument` |

**Fonctionnalités:**
- Upload de documents (PDF, images, etc.)
- Organisation par unité, catégorie
- Contrôle d'accès par rôle
- Téléchargement sécurisé
- Génération automatique de documents (contrats, factures)
- Filtrage et recherche

---

## Routes conversations
**Base URL:** `/api/conversations`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/` | Liste toutes les conversations | Authentifié | `getConversations` |
| GET | `/contacts` | Liste les contacts disponibles | Authentifié | `getContacts` |
| POST | `/direct` | Créer ou récupérer une conversation directe | Authentifié | `createOrGetDirectConversation` |
| POST | `/unit` | Créer une conversation pour une unité | Authentifié | `createUnitConversation` |
| GET | `/:id` | Récupérer une conversation spécifique | Authentifié | `getConversation` |
| GET | `/:id/messages` | Récupérer les messages d'une conversation | Authentifié | `getConversationMessages` |
| PUT | `/:id/archive` | Archiver une conversation | Authentifié | `archiveConversation` |

**Fonctionnalités:**
- Gestion des conversations
- Conversations directes et de groupe
- Conversations liées aux unités
- Archivage des conversations
- Liste des contacts

---

## Routes upload
**Base URL:** `/api/upload`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| POST | `/messages` | Uploader des fichiers pour les messages | Authentifié | Upload middleware |

**Fonctionnalités:**
- Upload multiple de fichiers
- Support jusqu'à 10 fichiers par requête
- Stockage organisé par utilisateur
- Validation des types de fichiers

---

## Routes dashboard
**Base URL:** `/api/dashboard`

| Méthode | Route | Description | Accès | Contrôleur |
|---------|-------|-------------|-------|-----------|
| GET | `/admin/dashboard` | Tableau de bord administrateur | Admin | Dashboard handler |
| GET | `/admin/users` | Liste des utilisateurs (admin) | Admin | Dashboard handler |
| GET | `/admin/stats` | Statistiques système (admin) | Admin | Dashboard handler |
| GET | `/proprietaire/dashboard` | Tableau de bord propriétaire | Propriétaire | Dashboard handler |
| GET | `/proprietaire/my-units` | Unités du propriétaire | Propriétaire | Dashboard handler |
| GET | `/locataire/dashboard` | Tableau de bord locataire | Locataire | Dashboard handler |
| GET | `/locataire/my-unit` | Unité du locataire | Locataire | Dashboard handler |
| GET | `/dashboard` | Tableau de bord générique | Tous rôles | Dashboard handler |
| GET | `/me` | Informations utilisateur connecté | Authentifié | Dashboard handler |

**Fonctionnalités Dashboard Admin:**
- Statistiques globales (utilisateurs, immeubles, unités, demandes, paiements)
- Utilisateurs récents
- Demandes récentes
- Paiements récents
- Messages récents
- Revenus mensuels
- Paiements en retard
- Répartition par rôle

**Fonctionnalités Dashboard Propriétaire:**
- Statistiques des unités (total, disponibles, louées)
- Taux d'occupation
- Revenus mensuels
- Paiements reçus
- Paiements en retard
- Demandes de maintenance
- Candidatures (location/achat)
- Documents à signer
- Paiements initiaux en attente

**Fonctionnalités Dashboard Locataire:**
- Informations de l'unité assignée
- Demandes personnelles
- Paiements personnels
- Messages récents
- Notifications
- Documents accessibles
- Statistiques personnelles

---

## Résumé des fonctionnalités

### Architecture générale
- **Framework:** Express.js
- **Base de données:** MongoDB avec Mongoose
- **Authentification:** JWT (JSON Web Tokens)
- **Temps réel:** Socket.io pour messages et notifications
- **Sécurité:** Middleware d'authentification et autorisation par rôle

### Systèmes de synchronisation
1. **PaymentSyncService:** Synchronisation automatique des paiements
   - Mise à jour des statuts
   - Calcul des totaux
   - Gestion des paiements en retard
   - Mise à jour des unités et immeubles

2. **RequestSyncService:** Synchronisation automatique des demandes
   - Mise à jour des statuts
   - Génération de documents
   - Gestion des workflows
   - Calcul des statistiques

3. **MessageSyncService:** Synchronisation automatique des messages
   - Comptage des messages non lus
   - Groupement par expéditeur
   - Mise à jour en temps réel

### Rôles et permissions
- **Admin:** Accès complet à toutes les fonctionnalités
- **Propriétaire:** Gestion de ses unités, paiements, demandes
- **Locataire:** Accès à son unité, paiements, demandes personnelles
- **Public:** Consultation des immeubles et unités disponibles

### Fonctionnalités principales
1. **Gestion immobilière**
   - Immeubles et unités
   - Attribution de propriétaires et locataires
   - Suivi des statuts (disponible, loué, vendu)

2. **Gestion financière**
   - Paiements de loyers
   - Paiements initiaux
   - Intégration Stripe
   - Génération de reçus et rapports

3. **Gestion des demandes**
   - Location et achat
   - Maintenance et réclamations
   - Workflow d'approbation
   - Génération de documents

4. **Communication**
   - Messagerie en temps réel
   - Notifications
   - Conversations

5. **Gestion documentaire**
   - Upload et téléchargement
   - Génération automatique
   - Signature électronique
   - Organisation par unité

### Sécurité
- Authentification JWT obligatoire pour la plupart des routes
- Middleware `protect` pour vérifier l'authentification
- Middleware `roleAuth` pour vérifier les rôles
- Middleware `optionalAuth` pour routes publiques avec token optionnel
- Validation des données d'entrée
- Protection contre les injections et attaques XSS

### Performance
- Utilisation de `Promise.all` pour requêtes parallèles
- Indexation MongoDB pour performances
- Services de synchronisation pour cohérence des données
- Cache des statistiques fréquemment utilisées

---

**Version:** 1.0.0  
**Date de création:** 2025  
**Dernière mise à jour:** 2025

