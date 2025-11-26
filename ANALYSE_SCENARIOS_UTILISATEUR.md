# ANALYSE COMPLÈTE DES SCÉNARIOS UTILISATEUR - MonCondo+

**Date d'analyse** : $(date)  
**Version du projet** : 1.0.0  
**Méthode d'analyse** : Analyse statique du code source (routes, contrôleurs, modèles, pages frontend)

---

## TABLE DES MATIÈRES

1. [Rôles identifiés](#1-rôles-identifiés)
2. [Scénarios visiteurs (non connectés)](#2-scénarios-visiteurs-non-connectés)
3. [Scénarios utilisateurs connectés (après inscription)](#3-scénarios-utilisateurs-connectés-après-inscription)
4. [Scénarios propriétaires](#4-scénarios-propriétaires)
5. [Scénarios locataires](#5-scénarios-locataires)
6. [Scénarios administrateurs](#6-scénarios-administrateurs)
7. [Flux complets de processus](#7-flux-complets-de-processus)
8. [Redirections et navigation](#8-redirections-et-navigation)
9. [Scénarios manquants ou incomplets](#9-scénarios-manquants-ou-incomplets)
10. [Scénarios futurs recommandés](#10-scénarios-futurs-recommandés)

---

## 1. RÔLES IDENTIFIÉS

D'après le modèle `User.js`, les rôles suivants existent dans le système :

| Rôle | Description | Valeur par défaut |
|------|-------------|-------------------|
| **admin** | Administrateur système avec accès complet | Non |
| **proprietaire** | Propriétaire d'unités | Non |
| **locataire** | Locataire d'une unité | Non |
| **visiteur** | Utilisateur non authentifié ou sans rôle spécifique | Oui |

**Note importante** : Les administrateurs ont accès automatique à toutes les routes protégées, indépendamment des restrictions de rôle (voir `roleAuth.js`).

---

## 2. SCÉNARIOS VISITEURS (NON CONNECTÉS)

### 2.1 Pages accessibles sans authentification

Les visiteurs peuvent accéder aux pages suivantes :

| Page | Route | Description | Composant |
|------|-------|-------------|------------|
| **Accueil** | `/` | Page d'accueil avec Hero, Features, FeaturedBuildings, FeaturedUnits, Testimonials, Community | `pages/index.tsx` |
| **Connexion/Inscription** | `/login` | Formulaire de connexion ou d'inscription (toggle) | `pages/login.tsx` |
| **Explorer** | `/explorer` | Liste publique des immeubles et unités disponibles avec filtres | `pages/explorer.tsx` |
| **Contact** | `/contact` | Formulaire de contact (envoie notification aux admins) | `pages/contact.tsx` |
| **FAQ** | `/faq` | Page FAQ | `pages/faq.tsx` |
| **CGU** | `/cgu` | Conditions générales d'utilisation | `pages/cgu.tsx` |
| **Politique de confidentialité** | `/privacy` | Politique de confidentialité | `pages/privacy.tsx` |
| **À propos** | `/about` | Page À propos | `pages/about.tsx` |
| **Services** | `/services` | Page des services | `pages/services.tsx` |
| **Communauté** | `/community` | Page communauté | `pages/community.tsx` |
| **Erreur 404** | `/404` | Page d'erreur 404 | `pages/404.tsx` |
| **Non autorisé** | `/unauthorized` | Page d'accès non autorisé | `pages/unauthorized.tsx` |

### 2.2 Actions possibles sans authentification

#### 2.2.1 Navigation et consultation

1. **Consulter la page d'accueil**
   - Voir le Hero avec le message d'accueil
   - Voir les immeubles en vedette (FeaturedBuildings)
   - Voir les unités en vedette (FeaturedUnits)
   - Voir les fonctionnalités (Features)
   - Voir les témoignages (Testimonials)
   - Voir la section communauté (Community)
   - Accéder au footer avec liens rapides

2. **Explorer les immeubles et unités**
   - Route : `/explorer`
   - Voir la liste de tous les immeubles actifs (via `/api/public/buildings`)
   - Voir la liste de toutes les unités disponibles (via `/api/public/units`)
   - Filtrer par :
     - Ville
     - Type de transaction (location/vente)
     - Nombre de chambres
     - Prix min/max
   - Voir les détails d'un immeuble (via `/api/public/buildings/:id`)
   - Voir les détails d'une unité disponible (via `/api/public/units/:id`)
   - Cliquer sur "Faire une demande" → Redirection vers `/login?redirect=/request`

3. **Voir les détails d'une unité**
   - Route : `/units/:id`
   - Accès : Public (route `/api/public/units/:id`)
   - Actions :
     - Voir les informations de l'unité
     - Voir les images
     - Voir l'immeuble associé
     - Cliquer sur "Faire une demande" → Redirection vers `/login?redirect=/request?unitId=:id`

4. **Voir les détails d'un immeuble**
   - Route : `/buildings/:id`
   - Accès : Public (route `/api/public/buildings/:id`)
   - Actions :
     - Voir les informations de l'immeuble
     - Voir les unités de cet immeuble
     - Voir les statistiques (total unités, disponibles)

5. **Envoyer un message de contact**
   - Route : `/contact` ou via le footer
   - API : `POST /api/contact` (publique)
   - Actions :
     - Remplir le formulaire (nom, email, message)
     - Envoyer le message
     - Le message est reçu comme notification par tous les admins
     - Notification en temps réel via Socket.io (`notification:new`)

6. **Consulter les pages légales**
   - FAQ (`/faq`)
   - CGU (`/cgu`)
   - Politique de confidentialité (`/privacy`)
   - À propos (`/about`)

### 2.3 Limitations des visiteurs

- ❌ Ne peuvent pas créer de demande de location/achat (redirection vers login)
- ❌ Ne peuvent pas accéder aux dashboards
- ❌ Ne peuvent pas voir les unités non disponibles
- ❌ Ne peuvent pas accéder aux pages admin, propriétaire, locataire
- ❌ Ne peuvent pas envoyer de messages privés
- ❌ Ne peuvent pas effectuer de paiements

---

## 3. SCÉNARIOS UTILISATEURS CONNECTÉS (APRÈS INSCRIPTION)

### 3.1 Processus d'inscription

**Route** : `POST /api/auth/register` (publique)

**Données requises** :
- firstName (requis)
- lastName (requis)
- email (requis, unique)
- password (requis, min 6 caractères)
- phone (optionnel)
- role (optionnel, défaut: 'visiteur') - Options : 'visiteur', 'locataire', 'proprietaire'

**Flux** :
1. L'utilisateur remplit le formulaire sur `/login` (mode inscription)
2. Soumission du formulaire
3. Vérification de l'unicité de l'email
4. Création de l'utilisateur avec mot de passe hashé (bcrypt)
5. Génération d'un token JWT
6. **Redirection automatique** : Connexion automatique après inscription
7. **Redirection** : Vers `/dashboard` qui redirige selon le rôle

### 3.2 Processus de connexion

**Route** : `POST /api/auth/login` (publique)

**Données requises** :
- email
- password

**Flux** :
1. L'utilisateur remplit le formulaire sur `/login` (mode connexion)
2. Vérification de l'email et du mot de passe
3. Vérification que le compte est actif (`isActive: true`)
4. Génération d'un token JWT
5. **Redirection** : Vers `/dashboard` qui redirige selon le rôle

### 3.3 Redirections après connexion/inscription

| Rôle utilisateur | Redirection après login/signup |
|------------------|--------------------------------|
| **admin** | `/dashboard/admin` |
| **proprietaire** | `/dashboard/proprietaire` |
| **locataire** | `/dashboard/locataire` |
| **visiteur** | `/` (page d'accueil) |

**Logique de redirection** :
- Page `/dashboard` → Redirige automatiquement vers le dashboard spécifique selon le rôle
- Page `/` → Redirige automatiquement les propriétaires et locataires vers `/dashboard`

### 3.4 Actions possibles après connexion (tous rôles)

#### 3.4.1 Gestion du profil

1. **Voir ses informations**
   - Route API : `GET /api/auth/me` (protégée)
   - Retourne : id, firstName, lastName, email, role, isActive

2. **Modifier son profil**
   - Route API : `PUT /api/users/:id` (protégée)
   - L'utilisateur peut modifier ses propres informations
   - Restrictions : Ne peut pas modifier son rôle (admin uniquement)

3. **Changer son mot de passe**
   - Route API : `PUT /api/auth/updatepassword` (protégée)
   - Nécessite l'ancien mot de passe

4. **Réinitialiser le mot de passe (oublié)**
   - Route API : `POST /api/auth/forgotpassword` (publique)
   - Route API : `PUT /api/auth/resetpassword/:resettoken` (publique)

#### 3.4.2 Navigation générale

- Accès à toutes les pages publiques
- Accès aux pages spécifiques selon le rôle (voir sections suivantes)
- Accès au dashboard selon le rôle

---

## 4. SCÉNARIOS PROPRIÉTAIRES

### 4.1 Pages accessibles aux propriétaires

| Page | Route | Description | Protection |
|------|-------|-------------|------------|
| **Dashboard propriétaire** | `/dashboard/proprietaire` | Tableau de bord avec statistiques, unités, demandes | `roleAuth('proprietaire')` |
| **Mes unités** | `/proprietaire/mes-unites` | Liste de toutes les unités du propriétaire | `roleAuth('proprietaire')` |
| **Consultation unités** | `/proprietaire/consult-units` | Consultation des unités disponibles | `roleAuth('proprietaire')` |
| **Services** | `/proprietaire/services` | Services disponibles pour propriétaires | `roleAuth('proprietaire')` |
| **Détails demande** | `/proprietaire/requests/:id` | Détails d'une demande (candidature pour ses unités) | `roleAuth('proprietaire')` |

### 4.2 Actions possibles pour les propriétaires

#### 4.2.1 Gestion des unités

1. **Voir ses unités**
   - Route API : `GET /api/dashboard/proprietaire/my-units` (protégée, propriétaire)
   - Route API : `GET /api/units` avec filtre `proprietaire: req.user._id`
   - Affiche :
     - Liste de toutes les unités dont il est propriétaire
     - Statut de chaque unité (disponible, loué, vendu, etc.)
     - Informations du locataire actuel (si applicable)
     - Informations de l'immeuble

2. **Voir les détails d'une unité**
   - Route API : `GET /api/units/:id` (protégée)
   - Vérification que l'unité appartient au propriétaire
   - Affiche toutes les informations de l'unité

3. **Modifier une unité**
   - Route API : `PUT /api/units/:id` (protégée)
   - Le propriétaire peut modifier ses propres unités
   - Peut modifier :
     - Prix de location (`rentPrice`)
     - Prix de vente (`salePrice`)
     - Statut (`status`)
     - Description
     - Caractéristiques (`features`)
     - Images (via upload)

4. **Assigner un locataire à une unité**
   - Route API : `PUT /api/units/:id/assign-tenant` (protégée)
   - Nécessite que l'unité appartienne au propriétaire
   - Change le statut de l'unité à "loue"
   - Assigne le locataire

5. **Libérer une unité (retirer le locataire)**
   - Route API : `PUT /api/units/:id/release` (protégée)
   - Retire le locataire
   - Change le statut à "disponible"

#### 4.2.2 Gestion des demandes (candidatures)

1. **Voir les candidatures pour ses unités**
   - Route API : `GET /api/requests` avec filtre `unit: { $in: unitIds }`
   - Types de demandes : 'location', 'achat'
   - Affiche :
     - Toutes les demandes pour ses unités
     - Statut (en_attente, accepte, refuse)
     - Informations du candidat
     - Documents générés (si acceptée)

2. **Voir les détails d'une candidature**
   - Route API : `GET /api/requests/:id` (protégée)
   - Vérification que la demande concerne une de ses unités
   - Affiche :
     - Informations complètes de la demande
     - Informations du candidat
     - Documents générés (bail, contrat de vente)
     - Statut du paiement initial (si applicable)
     - Notes admin

3. **Voir les demandes acceptées avec documents à signer**
   - Route API : `GET /api/dashboard/proprietaire/dashboard`
   - Retourne : `acceptedRequestsWithDocs`
   - Filtre : Demandes acceptées avec documents générés non signés
   - Actions possibles :
     - Télécharger les documents
     - Signer les documents (route : `PUT /api/requests/:id/documents/:docId/sign`)

4. **Voir les paiements initiaux en attente**
   - Route API : `GET /api/dashboard/proprietaire/dashboard`
   - Retourne : `pendingInitialPayments`
   - Filtre : Demandes acceptées avec paiement initial en attente
   - Le propriétaire peut voir le statut du paiement

#### 4.2.3 Gestion des paiements

1. **Voir les paiements reçus**
   - Route API : `GET /api/payments` avec filtre `unit: { $in: unitIds }`
   - Route Frontend : `/payments/proprietaire`
   - Affiche :
     - Tous les paiements pour ses unités
     - Statut (en_attente, paye, en_retard)
     - Montants
     - Dates d'échéance
     - Informations du payeur (locataire)

2. **Voir les paiements en retard**
   - Route API : `GET /api/dashboard/proprietaire/dashboard`
   - Retourne : `overduePayments`
   - Affiche les paiements en retard pour ses unités

3. **Voir les statistiques de revenus**
   - Route API : `GET /api/dashboard/proprietaire/dashboard`
   - Retourne :
     - `monthlyRevenue` : Revenus mensuels estimés
     - `receivedThisMonth` : Revenus reçus ce mois
     - `overdueCount` : Nombre de paiements en retard

4. **Créer un paiement**
   - Route API : `POST /api/payments` (protégée, middleware `authorizePayment`)
   - Le propriétaire peut créer des paiements pour ses unités
   - Vérification que l'unité lui appartient

#### 4.2.4 Gestion des demandes de maintenance/service

1. **Voir les demandes de maintenance**
   - Route API : `GET /api/dashboard/proprietaire/dashboard`
   - Retourne : `maintenanceRequests`
   - Filtre : Demandes de type 'maintenance', 'service', 'reclamation' pour ses unités
   - Statuts : 'en_attente', 'en_cours'

2. **Créer une demande de maintenance**
   - Route API : `POST /api/requests` (protégée)
   - Type : 'maintenance', 'service', 'reclamation'
   - Peut être liée à une unité

#### 4.2.5 Messages et notifications

1. **Voir les messages**
   - Route API : `GET /api/messages` (protégée)
   - Route Frontend : `/messages`
   - Affiche les conversations avec locataires, admins, autres propriétaires

2. **Envoyer un message**
   - Route API : `POST /api/messages` (protégée)
   - Peut envoyer des messages à d'autres utilisateurs

3. **Voir les notifications**
   - Route API : `GET /api/notifications` (protégée)
   - Route Frontend : `/notifications`
   - Affiche toutes les notifications du propriétaire

#### 4.2.6 Documents

1. **Voir les documents**
   - Route API : `GET /api/documents` (protégée)
   - Route Frontend : `/documents`
   - Affiche les documents accessibles au propriétaire

2. **Télécharger un document**
   - Route API : `GET /api/documents/:id/download` (protégée)
   - Télécharge un document

---

## 5. SCÉNARIOS LOCATAIRES

### 5.1 Pages accessibles aux locataires

| Page | Route | Description | Protection |
|------|-------|-------------|------------|
| **Dashboard locataire** | `/dashboard/locataire` | Tableau de bord avec unité, paiements, demandes | `roleAuth('locataire')` |
| **Profil** | `/locataire/profile` | Profil du locataire | `roleAuth('locataire')` |
| **Services** | `/locataire/services` | Services disponibles pour locataires | `roleAuth('locataire')` |
| **Paramètres** | `/locataire/settings` | Paramètres du compte | `roleAuth('locataire')` |
| **Détails demande** | `/locataire/requests/:id` | Détails d'une demande créée par le locataire | `roleAuth('locataire')` |

### 5.2 Actions possibles pour les locataires

#### 5.2.1 Gestion de l'unité

1. **Voir son unité assignée**
   - Route API : `GET /api/dashboard/locataire/my-unit` (protégée, locataire)
   - Route API : `GET /api/dashboard/locataire/dashboard` (retourne `myUnit`)
   - Affiche :
     - Informations de l'unité
     - Informations de l'immeuble
     - Informations du propriétaire
     - Images

2. **Voir les détails de l'unité**
   - Route API : `GET /api/units/:id` (protégée)
   - Vérification que l'unité est assignée au locataire

#### 5.2.2 Gestion des demandes

1. **Créer une demande de location/achat**
   - Route Frontend : `/request` (redirige vers login si non connecté)
   - Route API : `POST /api/requests` (protégée)
   - Types possibles : 'location', 'achat'
   - Peut sélectionner une unité disponible
   - Peut laisser un message/description
   - **Redirection après création** : Vers le dashboard locataire

2. **Voir ses demandes**
   - Route API : `GET /api/requests` avec filtre `createdBy: req.user._id`
   - Route Frontend : `/dashboard/locataire` (affiche `myRequests`)
   - Affiche :
     - Toutes les demandes créées par le locataire
     - Statut (en_attente, accepte, refuse, en_cours, termine)
     - Type (location, achat, maintenance, service, reclamation)

3. **Voir les détails d'une demande**
   - Route API : `GET /api/requests/:id` (protégée)
   - Route Frontend : `/locataire/requests/:id`
   - Vérification que la demande appartient au locataire
   - Affiche :
     - Informations complètes
     - Statut et historique
     - Documents générés (si acceptée)
     - Paiement initial (si applicable)

4. **Modifier une demande**
   - Route API : `PUT /api/requests/:id` (protégée)
   - Le locataire peut modifier ses propres demandes (si en_attente)

5. **Créer une demande de maintenance/service**
   - Route API : `POST /api/requests` (protégée)
   - Types : 'maintenance', 'service', 'reclamation'
   - Peut être liée à son unité assignée

#### 5.2.3 Gestion des paiements

1. **Voir ses paiements**
   - Route API : `GET /api/payments` avec filtre `payer: req.user._id`
   - Route Frontend : `/payments/locataire`
   - Affiche :
     - Tous les paiements du locataire
     - Statut (en_attente, paye, en_retard)
     - Montants
     - Dates d'échéance

2. **Voir le prochain paiement dû**
   - Route API : `GET /api/payments/next-due` (protégée, locataire)
   - Route Frontend : `/dashboard/locataire` (affiche le prochain paiement)
   - Affiche le prochain paiement à effectuer

3. **Voir les paiements en retard**
   - Route API : `GET /api/payments` avec filtre `payer: req.user._id, status: 'en_retard'`
   - Route Frontend : `/dashboard/locataire` (affiche dans stats)

4. **Effectuer un paiement**
   - Route Frontend : `/payments/:id/pay`
   - Route API : `POST /api/payments/:id/process` (protégée)
   - Méthodes de paiement disponibles :
     - **Stripe** : `POST /api/payments/:id/stripe/create-intent` puis `POST /api/payments/:id/stripe/confirm`
     - **Interac** : `POST /api/payments/:id/interac/instructions`
     - **Virement bancaire** : `POST /api/payments/:id/bank-transfer/instructions`
   - **Redirection après paiement** : Vers `/payments/:id/success`

5. **Voir le reçu d'un paiement**
   - Route API : `GET /api/payments/:id/receipt` (protégée)
   - Génère et télécharge un PDF de reçu

6. **Créer un nouveau paiement**
   - Route Frontend : `/payments/new`
   - Route API : `POST /api/payments` (protégée, middleware `authorizePayment`)
   - Le locataire peut créer un paiement pour son unité

#### 5.2.4 Gestion des documents

1. **Voir les documents**
   - Route API : `GET /api/documents` (protégée)
   - Route Frontend : `/documents`
   - Affiche :
     - Documents de son unité
     - Documents publics
     - Documents accessibles aux locataires

2. **Télécharger un document**
   - Route API : `GET /api/documents/:id/download` (protégée)
   - Télécharge un document

3. **Signer un document (bail, contrat)**
   - Route API : `PUT /api/requests/:id/documents/:docId/sign` (protégée)
   - Pour les documents générés après acceptation d'une demande

#### 5.2.5 Messages et notifications

1. **Voir les messages**
   - Route API : `GET /api/messages` (protégée)
   - Route Frontend : `/messages`
   - Affiche les conversations avec propriétaire, admins

2. **Envoyer un message**
   - Route API : `POST /api/messages` (protégée)
   - Peut envoyer des messages au propriétaire de son unité

3. **Voir les messages non lus**
   - Route API : `GET /api/messages/unread` (protégée)
   - Route API : `GET /api/messages/unread/count` (protégée)

4. **Marquer un message comme lu**
   - Route API : `PUT /api/messages/:id/read` (protégée)

5. **Voir les notifications**
   - Route API : `GET /api/notifications` (protégée)
   - Route Frontend : `/notifications`
   - Affiche toutes les notifications du locataire

6. **Marquer une notification comme lue**
   - Route API : `PATCH /api/notifications/read/:id` (protégée)

7. **Marquer toutes les notifications comme lues**
   - Route API : `PATCH /api/notifications/read/all` (protégée)

---

## 6. SCÉNARIOS ADMINISTRATEURS

### 6.1 Pages accessibles aux administrateurs

| Page | Route | Description | Protection |
|------|-------|-------------|------------|
| **Dashboard admin** | `/dashboard/admin` | Tableau de bord avec statistiques globales | `roleAuth('admin')` |
| **Gestion immeubles** | `/admin/buildings` | Liste et gestion de tous les immeubles | `roleAuth('admin')` |
| **Gestion unités** | `/admin/units` | Liste et gestion de toutes les unités | `roleAuth('admin')` |
| **Gestion utilisateurs** | `/admin/users` | Liste et gestion de tous les utilisateurs | `roleAuth('admin')` |
| **Gestion demandes** | `/admin/requests` | Liste et gestion de toutes les demandes | `roleAuth('admin')` |
| **Détails demande** | `/admin/requests/:id` | Détails d'une demande avec actions admin | `roleAuth('admin')` |
| **Éditer demande** | `/admin/requests/:id/edit` | Édition d'une demande | `roleAuth('admin')` |
| **Gestion paiements** | `/payments/admin` | Gestion de tous les paiements | `roleAuth('admin')` |
| **Analytics** | `/analytics` | Page d'analytics (si implémentée) | `roleAuth('admin')` |

### 6.2 Actions possibles pour les administrateurs

#### 6.2.1 Gestion des immeubles

1. **Voir tous les immeubles**
   - Route API : `GET /api/buildings` (protégée, admin)
   - Route Frontend : `/admin/buildings`
   - Affiche tous les immeubles avec filtres et recherche

2. **Créer un immeuble**
   - Route API : `POST /api/buildings` (protégée, admin)
   - Route Frontend : `/admin/buildings` (modal d'ajout)
   - Actions automatiques :
     - Génération de 3 documents PDF administratifs :
       - Fiche technique
       - Règlement intérieur
       - Plan de maintenance
     - Sauvegarde des documents dans la base de données

3. **Voir les détails d'un immeuble**
   - Route API : `GET /api/buildings/:id` (protégée)
   - Route Frontend : `/buildings/:id`
   - Affiche :
     - Informations complètes
     - Liste des unités
     - Documents administratifs
     - Images

4. **Modifier un immeuble**
   - Route API : `PUT /api/buildings/:id` (protégée, admin)
   - Route Frontend : `/buildings/:id` (modal d'édition)
   - Peut modifier :
     - Nom
     - Adresse
     - Description
     - Année de construction
     - Image (drag-and-drop vers `/images/immeubles`)

5. **Supprimer un immeuble**
   - Route API : `DELETE /api/buildings/:id` (protégée, admin)
   - Route Frontend : `/admin/buildings` (bouton de suppression)

6. **Voir les statistiques des immeubles**
   - Route API : `GET /api/buildings/stats` (protégée, admin)
   - Retourne des statistiques globales

7. **Voir les documents administratifs d'un immeuble**
   - Route Frontend : `/buildings/:id` (bouton "Voir les documents administratifs")
   - Affiche une modal avec :
     - Fiche technique (PDF)
     - Règlement intérieur (PDF)
     - Plan de maintenance (PDF)
   - Actions :
     - Télécharger chaque document
     - Voir la taille du fichier

#### 6.2.2 Gestion des unités

1. **Voir toutes les unités**
   - Route API : `GET /api/units` (protégée)
   - Route Frontend : `/admin/units`
   - Affiche toutes les unités avec :
     - Filtres (immeuble, statut, type)
     - Recherche
     - Actions : Voir détails, Modifier, Supprimer

2. **Créer une unité**
   - Route API : `POST /api/units` (protégée, admin)
   - Route Frontend : `/admin/units` (modal d'ajout)
   - Peut créer une unité avec :
     - Numéro d'unité
     - Immeuble associé
     - Type, surface, chambres, salles de bain
     - Prix de location/vente
     - Statut
     - Images (drag-and-drop vers `/images/unites`)

3. **Voir les détails d'une unité**
   - Route API : `GET /api/units/:id` (protégée)
   - Route Frontend : `/admin/units` (modal de détails)
   - Affiche toutes les informations

4. **Modifier une unité**
   - Route API : `PUT /api/units/:id` (protégée)
   - Route Frontend : `/admin/units` (modal d'édition)
   - Peut modifier toutes les informations
   - Peut ajouter/modifier les images (drag-and-drop)

5. **Supprimer une unité**
   - Route API : `DELETE /api/units/:id` (protégée, admin)
   - Route Frontend : `/admin/units` (bouton de suppression)

6. **Assigner un propriétaire à une unité**
   - Route API : `PUT /api/units/:id/assign-owner` (protégée, admin)
   - Route Frontend : `/admin/units` (dans le modal d'édition)

7. **Assigner un locataire à une unité**
   - Route API : `PUT /api/units/:id/assign-tenant` (protégée)
   - Route Frontend : `/admin/units` (dans le modal d'édition)

8. **Exporter les unités en Excel**
   - Route Frontend : `/admin/units` (bouton "Exporter Excel")
   - Génère un fichier Excel avec toutes les unités

9. **Exporter les unités en PDF**
   - Route Frontend : `/admin/units` (bouton "Exporter PDF")
   - Génère un fichier PDF avec toutes les unités

10. **Voir les unités disponibles**
    - Route API : `GET /api/units/available` (publique avec `optionalAuth`)
    - Affiche les unités disponibles

11. **Voir les nouvelles unités**
    - Route API : `GET /api/units/nouvelles` (protégée)
    - Affiche les unités récemment ajoutées

12. **Voir les statistiques des unités**
    - Route API : `GET /api/units/stats` (protégée, admin)
    - Retourne des statistiques globales

#### 6.2.3 Gestion des utilisateurs

1. **Voir tous les utilisateurs**
   - Route API : `GET /api/users` (protégée, admin)
   - Route Frontend : `/admin/users`
   - Affiche tous les utilisateurs avec :
     - Filtres par rôle
     - Recherche
     - Statut actif/inactif

2. **Créer un utilisateur**
   - Route API : `POST /api/users` (protégée, admin)
   - Route Frontend : `/admin/users` (modal d'ajout)
   - Peut créer un utilisateur avec n'importe quel rôle

3. **Voir les détails d'un utilisateur**
   - Route API : `GET /api/users/:id` (protégée)
   - Route Frontend : `/admin/users` (modal de détails)

4. **Modifier un utilisateur**
   - Route API : `PUT /api/users/:id` (protégée)
   - Route Frontend : `/admin/users` (modal d'édition)
   - Peut modifier :
     - Informations personnelles
     - Rôle
     - Statut actif/inactif

5. **Supprimer un utilisateur**
   - Route API : `DELETE /api/users/:id` (protégée, admin)
   - Route Frontend : `/admin/users` (bouton de suppression)

6. **Promouvoir un utilisateur au rôle propriétaire**
   - Route API : `PUT /api/users/:id/promote` (protégée, admin)
   - Change le rôle d'un utilisateur en 'proprietaire'

#### 6.2.4 Gestion des demandes

1. **Voir toutes les demandes**
   - Route API : `GET /api/requests` (protégée)
   - Route Frontend : `/admin/requests`
   - Affiche toutes les demandes avec :
     - Filtres (type, statut, priorité)
     - Recherche
     - Actions : Voir détails, Modifier, Supprimer, Accepter, Refuser

2. **Voir les détails d'une demande**
   - Route API : `GET /api/requests/:id` (protégée)
   - Route Frontend : `/admin/requests/:id`
   - Affiche :
     - Informations complètes
     - Historique des statuts
     - Documents générés
     - Paiement initial
     - Notes admin

3. **Créer une demande**
   - Route API : `POST /api/requests` (protégée)
   - Route Frontend : `/admin/requests` (modal d'ajout)
   - Peut créer n'importe quel type de demande

4. **Modifier une demande**
   - Route API : `PUT /api/requests/:id` (protégée)
   - Route Frontend : `/admin/requests/:id/edit`
   - Peut modifier toutes les informations

5. **Supprimer une demande**
   - Route API : `DELETE /api/requests/:id` (protégée)
   - Route Frontend : `/admin/requests` (bouton de suppression)

6. **Accepter une demande**
   - Route API : `PUT /api/requests/:id/accept` (protégée, admin)
   - Route Frontend : `/admin/requests/:id` (bouton "Accepter")
   - Actions automatiques :
     - Change le statut à 'accepte'
     - Génère les documents (bail pour location, contrat de vente pour achat)
     - Crée un paiement initial (si achat)
     - Envoie des notifications

7. **Refuser une demande**
   - Route API : `PUT /api/requests/:id/reject` (protégée, admin)
   - Route Frontend : `/admin/requests/:id` (bouton "Refuser")
   - Change le statut à 'refuse'
   - Peut ajouter une raison de refus

8. **Modifier le statut d'une demande**
   - Route API : `PUT /api/requests/:id/status` (protégée, admin)
   - Peut changer le statut : 'en_attente', 'en_cours', 'termine', 'accepte', 'refuse'

9. **Assigner une demande à un utilisateur**
   - Route API : `PUT /api/requests/:id/assign` (protégée, admin)
   - Assigne une demande à un admin ou propriétaire

10. **Ajouter une note admin**
    - Route API : `POST /api/requests/:id/notes` (protégée, admin)
    - Ajoute une note interne visible uniquement par les admins

11. **Valider un paiement initial**
    - Route API : `PUT /api/requests/:id/payment/validate` (protégée, admin)
    - Valide le paiement initial d'une demande acceptée

12. **Assigner une unité à une demande**
    - Route API : `PUT /api/requests/:id/assign-unit` (protégée, admin)
    - Assigne une unité à une demande (si non spécifiée)

13. **Télécharger un document d'une demande**
    - Route API : `GET /api/requests/:id/documents/:docId/download` (protégée)
    - Télécharge un document généré

14. **Voir le statut du paiement initial**
    - Route API : `GET /api/requests/:id/payment-status` (protégée)
    - Affiche le statut du paiement initial

#### 6.2.5 Gestion des paiements

1. **Voir tous les paiements**
   - Route API : `GET /api/payments` (protégée)
   - Route Frontend : `/payments/admin`
   - Affiche tous les paiements avec filtres

2. **Voir les détails d'un paiement**
   - Route API : `GET /api/payments/:id` (protégée)
   - Route Frontend : `/payments/:id`

3. **Modifier un paiement**
   - Route API : `PUT /api/payments/:id` (protégée, admin)
   - Peut modifier le statut, montant, dates

4. **Supprimer un paiement**
   - Route API : `DELETE /api/payments/:id` (protégée, admin)

5. **Voir les paiements en retard**
   - Route API : `GET /api/payments/overdue/all` (protégée, admin)
   - Affiche tous les paiements en retard

6. **Générer un rapport de paiements (PDF)**
   - Route API : `GET /api/payments/report/pdf` (protégée, admin)
   - Génère un rapport PDF

7. **Générer un rapport de paiements (Excel)**
   - Route API : `GET /api/payments/report/excel` (protégée, admin)
   - Génère un rapport Excel

8. **Voir les statistiques de paiements**
   - Route API : `GET /api/payments/stats` (protégée)
   - Retourne des statistiques globales

#### 6.2.6 Gestion des documents

1. **Voir tous les documents**
   - Route API : `GET /api/documents` (protégée)
   - Route Frontend : `/documents`
   - Affiche tous les documents

2. **Télécharger un document**
   - Route API : `GET /api/documents/:id/download` (protégée)
   - Télécharge un document

3. **Uploader un document**
   - Route API : `POST /api/documents` (protégée, upload middleware)
   - Route Frontend : `/documents` (formulaire d'upload)
   - Peut uploader n'importe quel type de document

4. **Modifier un document**
   - Route API : `PUT /api/documents/:id` (protégée)
   - Peut modifier les métadonnées

5. **Supprimer un document**
   - Route API : `DELETE /api/documents/:id` (protégée)
   - Supprime un document

#### 6.2.7 Messages et notifications

1. **Voir tous les messages**
   - Route API : `GET /api/messages` (protégée)
   - Route Frontend : `/messages`
   - Affiche toutes les conversations

2. **Envoyer un message**
   - Route API : `POST /api/messages` (protégée)
   - Peut envoyer des messages à n'importe quel utilisateur

3. **Voir les notifications**
   - Route API : `GET /api/notifications` (protégée)
   - Route Frontend : `/notifications`
   - Affiche toutes les notifications système

4. **Exporter l'historique des notifications**
   - Route API : `GET /api/notifications/export/:format` (protégée)
   - Formats : 'csv', 'json', 'excel'

#### 6.2.8 Statistiques et analytics

1. **Voir le dashboard admin**
   - Route API : `GET /api/dashboard/admin/dashboard` (protégée, admin)
   - Route Frontend : `/dashboard/admin`
   - Affiche :
     - Statistiques globales (utilisateurs, immeubles, unités, demandes, paiements)
     - Utilisateurs récents
     - Demandes récentes
     - Paiements récents
     - Messages récents
     - Utilisateurs par rôle
     - Paiements par statut
     - Revenus mensuels
     - Paiements en retard

2. **Voir les statistiques détaillées**
   - Route API : `GET /api/dashboard/admin/stats` (protégée, admin)
   - Retourne des statistiques détaillées

---

## 7. FLUX COMPLETS DE PROCESSUS

### 7.1 Flux de demande de location

1. **Visiteur explore les unités**
   - Accède à `/explorer` ou `/units/:id`
   - Voit les unités disponibles à louer
   - Clique sur "Faire une demande"

2. **Redirection vers login**
   - Si non connecté : Redirection vers `/login?redirect=/request?unitId=:id`
   - Connexion ou inscription

3. **Création de la demande**
   - Accès à `/request?unitId=:id` (si unité spécifiée) ou `/request`
   - Sélection du type : 'location'
   - Sélection de l'unité (si non spécifiée dans l'URL)
   - Rédaction du message/description
   - Soumission : `POST /api/requests`
   - **Redirection** : Vers `/dashboard/locataire` (ou dashboard selon rôle)

4. **Traitement par l'admin**
   - L'admin voit la demande dans `/admin/requests`
   - Peut voir les détails dans `/admin/requests/:id`
   - Actions possibles :
     - **Accepter** : `PUT /api/requests/:id/accept`
       - Génère automatiquement un document de bail (PDF)
       - Change le statut à 'accepte'
       - Envoie des notifications
     - **Refuser** : `PUT /api/requests/:id/reject`
       - Change le statut à 'refuse'
       - Peut ajouter une raison

5. **Si acceptée - Signature du bail**
   - Le locataire voit la demande acceptée dans son dashboard
   - Peut télécharger le bail : `GET /api/requests/:id/documents/:docId/download`
   - Peut signer le bail : `PUT /api/requests/:id/documents/:docId/sign`
   - Le propriétaire peut aussi signer

6. **Assignation de l'unité**
   - L'admin assigne l'unité au locataire : `PUT /api/units/:id/assign-tenant`
   - Change le statut de l'unité à 'loue'
   - Le locataire voit maintenant son unité dans son dashboard

7. **Création des paiements récurrents**
   - L'admin ou le système crée les paiements de loyer : `POST /api/payments`
   - Type : 'loyer'
   - Montant : `rentPrice` de l'unité
   - Dates d'échéance mensuelles

### 7.2 Flux de demande d'achat

1. **Visiteur explore les unités**
   - Accède à `/explorer` ou `/units/:id`
   - Voit les unités disponibles à vendre
   - Clique sur "Faire une demande"

2. **Redirection vers login**
   - Si non connecté : Redirection vers `/login?redirect=/request?unitId=:id`
   - Connexion ou inscription

3. **Création de la demande**
   - Accès à `/request?unitId=:id` (si unité spécifiée) ou `/request`
   - Sélection du type : 'achat'
   - Sélection de l'unité (si non spécifiée dans l'URL)
   - Rédaction du message/description
   - Soumission : `POST /api/requests`
   - **Redirection** : Vers `/dashboard` (selon rôle)

4. **Traitement par l'admin**
   - L'admin voit la demande dans `/admin/requests`
   - Peut voir les détails dans `/admin/requests/:id`
   - Actions possibles :
     - **Accepter** : `PUT /api/requests/:id/accept`
       - Génère automatiquement un contrat de vente (PDF)
       - Crée un paiement initial (acompte)
       - Change le statut à 'accepte'
       - Envoie des notifications

5. **Paiement initial**
   - Le propriétaire (ou l'admin) initie le paiement : `POST /api/requests/:id/payment/initiate`
   - Le locataire voit le paiement initial dans son dashboard
   - Le locataire effectue le paiement : `/payments/:id/pay`
   - Méthodes disponibles :
     - Stripe (carte de crédit)
     - Interac
     - Virement bancaire
   - **Redirection après paiement** : Vers `/payments/:id/success`

6. **Validation du paiement initial**
   - L'admin valide le paiement : `PUT /api/requests/:id/payment/validate`
   - Change le statut du paiement initial à 'paye'

7. **Signature du contrat**
   - Le locataire et le propriétaire signent le contrat : `PUT /api/requests/:id/documents/:docId/sign`

8. **Assignation de l'unité**
   - L'admin assigne l'unité au nouveau propriétaire : `PUT /api/units/:id/assign-owner`
   - Change le statut de l'unité à 'vendu'
   - Le nouveau propriétaire voit l'unité dans son dashboard

### 7.3 Flux de paiement de loyer

1. **Création du paiement**
   - L'admin ou le système crée un paiement : `POST /api/payments`
   - Type : 'loyer'
   - Montant : `rentPrice` de l'unité
   - Date d'échéance : Date du mois
   - Payeur : Locataire de l'unité
   - Bénéficiaire : Propriétaire de l'unité (automatique)

2. **Notification au locataire**
   - Le locataire reçoit une notification
   - Voit le paiement dans `/payments/locataire`
   - Voit le prochain paiement dû dans son dashboard

3. **Effectuer le paiement**
   - Le locataire accède à `/payments/:id/pay`
   - Sélectionne la méthode de paiement :
     - **Stripe** :
       - `POST /api/payments/:id/stripe/create-intent`
       - Saisie des informations de carte
       - `POST /api/payments/:id/stripe/confirm`
     - **Interac** :
       - `POST /api/payments/:id/interac/instructions`
       - Reçoit les instructions de paiement
     - **Virement bancaire** :
       - `POST /api/payments/:id/bank-transfer/instructions`
       - Reçoit les instructions de virement
   - **Redirection après paiement** : Vers `/payments/:id/success`

4. **Mise à jour du statut**
   - Le statut change à 'paye'
   - La date de paiement est enregistrée
   - Un reçu PDF est généré : `GET /api/payments/:id/receipt`

5. **Notification au propriétaire**
   - Le propriétaire reçoit une notification
   - Voit le paiement dans `/payments/proprietaire`
   - Le paiement apparaît dans ses revenus

### 7.4 Flux de demande de maintenance

1. **Création de la demande**
   - Le locataire accède à `/request` ou `/dashboard/locataire`
   - Sélectionne le type : 'maintenance' (ou 'service', 'reclamation')
   - Sélectionne son unité (automatique si assignée)
   - Rédaction de la description
   - Soumission : `POST /api/requests`

2. **Traitement par l'admin**
   - L'admin voit la demande dans `/admin/requests`
   - Peut assigner la demande : `PUT /api/requests/:id/assign`
   - Peut changer le statut : `PUT /api/requests/:id/status`
   - Peut ajouter des notes : `POST /api/requests/:id/notes`

3. **Suivi par le locataire**
   - Le locataire voit la demande dans son dashboard
   - Peut voir les mises à jour de statut
   - Peut voir les notes (si visibles)

4. **Résolution**
   - L'admin marque la demande comme terminée : `PUT /api/requests/:id/status` (statut: 'termine')
   - Le locataire est notifié

---

## 8. REDIRECTIONS ET NAVIGATION

### 8.1 Redirections automatiques

| Condition | Redirection | Fichier |
|-----------|-------------|---------|
| Visiteur non connecté accède à `/dashboard` | `/login` | `pages/dashboard/index.tsx` |
| Utilisateur connecté (admin) accède à `/dashboard` | `/dashboard/admin` | `pages/dashboard/index.tsx` |
| Utilisateur connecté (propriétaire) accède à `/dashboard` | `/dashboard/proprietaire` | `pages/dashboard/index.tsx` |
| Utilisateur connecté (locataire) accède à `/dashboard` | `/dashboard/locataire` | `pages/dashboard/index.tsx` |
| Utilisateur connecté (visiteur) accède à `/dashboard` | `/` | `pages/dashboard/index.tsx` |
| Propriétaire/locataire connecté accède à `/` | `/dashboard` | `pages/index.tsx` |
| Utilisateur non connecté accède à `/request` | `/login?redirect=/request` | `pages/request.tsx` |
| Utilisateur non connecté accède à `/payments/*` | `/login` | `pages/payments/*.tsx` |
| Utilisateur non connecté accède à `/messages` | `/login` | (via ProtectedRoute) |
| Utilisateur non connecté accède à `/notifications` | `/login` | (via ProtectedRoute) |
| Utilisateur non connecté accède à `/documents` | `/login` | (via ProtectedRoute) |
| Utilisateur non admin accède à `/admin/*` | `/unauthorized` | (via ProtectedRoute) |
| Utilisateur non propriétaire accède à `/proprietaire/*` | `/unauthorized` | (via ProtectedRoute) |
| Utilisateur non locataire accède à `/locataire/*` | `/unauthorized` | (via ProtectedRoute) |

### 8.2 Redirections après actions

| Action | Redirection | Fichier |
|--------|-------------|---------|
| Connexion réussie | `/dashboard` (puis redirection selon rôle) | `pages/login.tsx` |
| Inscription réussie | `/dashboard` (puis redirection selon rôle) | `pages/login.tsx` |
| Création de demande réussie | `/dashboard/locataire` (ou dashboard selon rôle) | `pages/request.tsx` |
| Paiement réussi | `/payments/:id/success` | `pages/payments/:id/pay.tsx` |
| Édition de demande (admin) | `/admin/requests/:id` | `pages/admin/requests/:id/edit.tsx` |
| Édition d'immeuble (admin) | `/admin/buildings` | `pages/buildings/:id/edit.tsx` |

### 8.3 Paramètres de redirection dans l'URL

- `/login?redirect=/request` : Après connexion, redirige vers `/request`
- `/login?redirect=/request?unitId=:id` : Après connexion, redirige vers `/request` avec l'unité présélectionnée
- `/request?unit=:id` : Page de demande avec unité présélectionnée

---

## 9. SCÉNARIOS MANQUANTS OU INCOMPLETS

### 9.1 Scénarios identifiés comme manquants

1. **Gestion des baux**
   - ❌ Pas de page dédiée pour gérer les baux actifs
   - ❌ Pas de renouvellement de bail automatique
   - ❌ Pas de résiliation de bail
   - ⚠️ Les baux sont générés mais pas gérés dans une interface dédiée

2. **Gestion des contrats de vente**
   - ❌ Pas de page dédiée pour gérer les contrats de vente
   - ⚠️ Les contrats sont générés mais pas gérés dans une interface dédiée

3. **Calendrier des paiements**
   - ❌ Pas de vue calendrier pour les paiements
   - ⚠️ Les paiements sont listés mais pas visualisés dans un calendrier

4. **Historique complet des transactions**
   - ⚠️ L'historique existe mais pas de page dédiée pour le consulter

5. **Gestion des événements communautaires**
   - ❌ La page `/community` existe mais pas de création/gestion d'événements
   - ⚠️ Pas de système de réservation d'espaces communs

6. **Système de notation/avis**
   - ❌ Pas de système pour noter les propriétaires/locataires
   - ❌ Pas d'avis sur les immeubles/unités

7. **Gestion des dépôts de garantie**
   - ❌ Pas de gestion spécifique des dépôts de garantie
   - ⚠️ Peut être géré via les paiements mais pas dédié

8. **Rapports financiers pour propriétaires**
   - ⚠️ Les statistiques existent mais pas de rapports détaillés exportables

9. **Système de tickets de support**
   - ⚠️ Les demandes peuvent servir de tickets mais pas de système dédié

10. **Gestion des documents par catégorie**
    - ⚠️ Les documents existent mais pas de catégorisation avancée

### 9.2 Fonctionnalités partiellement implémentées

1. **Upload d'images**
   - ✅ Drag-and-drop implémenté pour unités et immeubles
   - ⚠️ Pas de gestion avancée (redimensionnement, compression)
   - ⚠️ Pas de galerie d'images avec lightbox

2. **Recherche avancée**
   - ✅ Filtres basiques implémentés
   - ⚠️ Pas de recherche par mots-clés avancée
   - ⚠️ Pas de recherche par géolocalisation

3. **Notifications en temps réel**
   - ✅ Socket.io implémenté
   - ⚠️ Pas de notifications push (navigateur)
   - ⚠️ Pas de notifications email systématiques

4. **Export de données**
   - ✅ Export Excel/PDF pour unités et paiements
   - ⚠️ Pas d'export pour demandes
   - ⚠️ Pas d'export pour utilisateurs

---

## 10. SCÉNARIOS FUTURS RECOMMANDÉS

### 10.1 Améliorations UX

1. **Tableau de bord personnalisable**
   - Permettre aux utilisateurs de personnaliser leur dashboard
   - Widgets configurables

2. **Mode sombre**
   - Thème sombre pour l'interface

3. **Application mobile**
   - Application React Native ou PWA
   - Notifications push

4. **Multilingue**
   - Support de plusieurs langues (FR, EN)

### 10.2 Fonctionnalités métier

1. **Gestion des assurances**
   - Suivi des assurances des unités
   - Rappels de renouvellement

2. **Gestion des travaux**
   - Planification des travaux
   - Suivi des devis
   - Gestion des entrepreneurs

3. **Gestion des espaces communs**
   - Réservation de salles communes
   - Gestion des parkings
   - Gestion des espaces de stockage

4. **Système de votes**
   - Votes pour décisions de copropriété
   - Assemblées générales virtuelles

5. **Gestion des charges**
   - Répartition des charges
   - Facturation automatique

6. **Intégration comptable**
   - Export vers logiciels comptables
   - Génération de déclarations fiscales

### 10.3 Intégrations externes

1. **Intégration bancaire**
   - Connexion directe aux comptes bancaires
   - Prélèvements automatiques

2. **Intégration immobilière**
   - Synchronisation avec portails immobiliers
   - Publication automatique

3. **Intégration météo/maintenance**
   - Alertes météo pour maintenance préventive
   - Prédiction de pannes

---

## CONCLUSION

Ce document présente une analyse complète des scénarios utilisateur existants dans MonCondo+ basée sur l'analyse statique du code source. Tous les scénarios listés sont **réellement implémentés** dans le code actuel.

**Points clés** :
- ✅ 4 rôles distincts avec permissions spécifiques
- ✅ Système complet de gestion des immeubles, unités, demandes, paiements
- ✅ Flux de demande de location/achat entièrement fonctionnel
- ✅ Système de paiement avec plusieurs méthodes
- ✅ Gestion des documents avec génération automatique
- ✅ Notifications en temps réel via Socket.io
- ✅ Interface admin complète

**Améliorations possibles** :
- Gestion dédiée des baux et contrats
- Calendrier des paiements
- Rapports financiers avancés
- Système de notation/avis
- Application mobile

---

**Document généré automatiquement par analyse du code source**  
**Dernière mise à jour** : Analyse basée sur l'état actuel du code

