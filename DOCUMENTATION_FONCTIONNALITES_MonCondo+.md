# 📋 Documentation Complète des Fonctionnalités
## MonCondo+ - Plateforme de Gestion de Condominiums

---

**Version:** 1.0  
**Date:** Novembre 2025  
**Auteur:** Équipe de Développement MonCondo+

---

## 📑 Table des Matières

1. [Page de Garde](#page-de-garde)
2. [Introduction](#introduction)
3. [Module 1 : Authentification et Gestion des Utilisateurs](#module-1--authentification-et-gestion-des-utilisateurs)
4. [Module 2 : Messages et Communication](#module-2--messages-et-communication)
5. [Module 3 : Paiements](#module-3--paiements)
6. [Module 4 : Demandes et Services](#module-4--demandes-et-services)
7. [Module 5 : Tableaux de Bord](#module-5--tableaux-de-bord)
8. [Module 6 : Gestion des Unités](#module-6--gestion-des-unités)
9. [Module 7 : Gestion des Immeubles](#module-7--gestion-des-immeubles)
10. [Module 8 : Documents](#module-8--documents)
11. [Module 9 : Notifications](#module-9--notifications)
12. [Module 10 : Profils et Paramètres](#module-10--profils-et-paramètres)
13. [Annexes](#annexes)

---

## Page de Garde

**MonCondo+**  
*Plateforme Moderne de Gestion de Condominiums*

---

## Introduction

MonCondo+ est une plateforme web complète développée pour la gestion moderne de condominiums. Elle permet aux administrateurs, propriétaires et locataires de gérer efficacement leurs interactions, paiements, demandes et communications.

### Technologies Utilisées

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express.js, MongoDB, Mongoose
- **Authentification:** JWT (JSON Web Tokens)
- **Paiements:** Stripe, Interac e-Transfer, Virements bancaires
- **Communication:** Socket.io (messages en temps réel)

### Rôles Utilisateurs

- **Admin:** Accès complet au système, gestion de tous les utilisateurs, unités, immeubles, demandes et paiements
- **Propriétaire:** Gestion de ses unités, visualisation des paiements reçus, gestion des demandes liées à ses unités
- **Locataire:** Accès à ses informations, paiement de ses factures, création de demandes, communication avec propriétaires et admin

---

## Module 1 : Authentification et Gestion des Utilisateurs

### 1.1 Inscription (Visiteurs)

**Description:** Permet aux nouveaux utilisateurs de créer un compte sur la plateforme.

**Fonctionnalités:**
- Formulaire d'inscription avec validation
- Champs requis : prénom, nom, email, mot de passe, téléphone
- Sélection du rôle (visiteur par défaut)
- Validation des emails et mots de passe
- Hash sécurisé des mots de passe avec bcrypt

**Étapes pour tester:**
1. Accéder à `/login`
2. Cliquer sur "Créer un compte" ou "S'inscrire"
3. Remplir le formulaire :
   - Prénom : Jean
   - Nom : Dupont
   - Email : jean.dupont@example.com
   - Mot de passe : password123 (minimum 6 caractères)
   - Téléphone : 514-123-4567
   - Rôle : Visiteur
4. Cliquer sur "S'inscrire"
5. Vérifier le message de succès

**Résultat attendu:**
- Compte créé avec succès
- Redirection vers la page de connexion
- Message de confirmation affiché
- Email de bienvenue envoyé (si configuré)

**Statut par rôle:**
- ✅ **Visiteur:** Peut s'inscrire
- ✅ **Locataire/Propriétaire:** Peut s'inscrire (rôle visiteur)
- ✅ **Admin:** Peut créer des comptes via le panneau admin

**Remarques:**
- Les mots de passe sont hashés avant stockage
- L'email doit être unique dans la base de données
- Le rôle peut être modifié par un admin après inscription

---

### 1.2 Connexion

**Description:** Permet aux utilisateurs de se connecter à leur compte.

**Fonctionnalités:**
- Formulaire de connexion avec email et mot de passe
- Validation des identifiants
- Génération de token JWT
- Stockage du token dans localStorage
- Redirection automatique selon le rôle

**Étapes pour tester:**
1. Accéder à `/login`
2. Entrer l'email : `admin@moncondo.com`
3. Entrer le mot de passe : `administrateur`
4. Cliquer sur "Se connecter"
5. Observer la redirection

**Résultat attendu:**
- Connexion réussie
- Token JWT stocké dans localStorage
- Redirection vers le dashboard approprié :
  - Admin → `/dashboard/admin`
  - Propriétaire → `/dashboard/proprietaire`
  - Locataire → `/dashboard/locataire`
  - Visiteur → Page d'accueil

**Statut par rôle:**
- ✅ **Tous les rôles:** Peuvent se connecter avec leurs identifiants

**Remarques:**
- Le token expire après 7 jours (configurable)
- En cas d'erreur, un message clair est affiché
- Possibilité de "Se souvenir de moi" (optionnel)

---

### 1.3 Gestion des Utilisateurs (Admin)

**Description:** Permet à l'administrateur de gérer tous les utilisateurs du système.

**Fonctionnalités:**
- Liste de tous les utilisateurs avec pagination
- Filtres par rôle, statut (actif/inactif)
- Recherche par nom, email
- Création de nouveaux utilisateurs
- Modification des informations utilisateur
- Promotion locataire → propriétaire
- Désactivation/Activation de comptes
- Suppression d'utilisateurs (avec confirmation)

**Étapes pour tester:**
1. Se connecter en tant qu'admin
2. Accéder à `/admin/users`
3. Observer la liste des utilisateurs
4. Utiliser les filtres (rôle, statut)
5. Rechercher un utilisateur par nom
6. Cliquer sur "Créer un utilisateur"
7. Remplir le formulaire et valider
8. Cliquer sur "Modifier" sur un utilisateur existant
9. Modifier les informations et sauvegarder
10. Tester la promotion d'un locataire en propriétaire

**Résultat attendu:**
- Liste complète des utilisateurs affichée
- Filtres fonctionnels
- Recherche instantanée
- Création/modification réussie
- Changements reflétés immédiatement

**Statut par rôle:**
- ✅ **Admin:** Accès complet
- ❌ **Propriétaire/Locataire:** Accès refusé (redirection)

**Remarques:**
- Les modifications sont sauvegardées en temps réel
- Les suppressions nécessitent une confirmation
- L'historique des modifications est tracé (optionnel)

---

## Module 2 : Messages et Communication

### 2.1 Système de Messagerie

**Description:** Système de communication en temps réel entre tous les utilisateurs.

**Fonctionnalités:**
- Envoi de messages texte
- Messages en temps réel (Socket.io)
- Liste unique par expéditeur (regroupement)
- Compteur de messages non lus dans la navbar
- Marquer comme lu/non lu
- Suppression de messages
- Historique complet des conversations
- Support des pièces jointes (optionnel)
- Indicateur de frappe en cours (typing indicator)

**Étapes pour tester:**
1. Se connecter en tant que locataire
2. Accéder à `/messages`
3. Observer la liste des conversations/expéditeurs
4. Cliquer sur une conversation
5. Envoyer un message
6. Ouvrir la même page dans un autre navigateur (autre utilisateur)
7. Vérifier la réception en temps réel
8. Vérifier le compteur dans la navbar
9. Marquer un message comme lu
10. Vérifier la mise à jour du compteur

**Résultat attendu:**
- Messages envoyés instantanément
- Réception en temps réel sans rechargement
- Compteur mis à jour automatiquement
- Liste unique par expéditeur (pas de doublons)
- Historique complet conservé

**Statut par rôle:**
- ✅ **Admin:** Peut voir tous les messages
- ✅ **Propriétaire:** Peut voir messages avec ses locataires et admin
- ✅ **Locataire:** Peut voir messages avec son propriétaire et admin

**Remarques:**
- La synchronisation est automatique via Socket.io
- Les messages sont stockés dans MongoDB
- Le compteur reflète uniquement les messages non lus
- Les messages sont filtrés selon les permissions de chaque rôle

---

### 2.2 Liste Unique par Expéditeur

**Description:** Regroupement intelligent des messages par expéditeur pour une meilleure organisation.

**Fonctionnalités:**
- Regroupement automatique par utilisateur
- Affichage du dernier message reçu
- Badge avec nombre de messages non lus
- Tri par date (plus récent en premier)
- Tri par nombre de messages non lus (priorité)

**Étapes pour tester:**
1. Envoyer plusieurs messages depuis différents comptes
2. Accéder à `/messages`
3. Basculer en mode "Messages" (si disponible)
4. Observer le regroupement par expéditeur
5. Vérifier le badge de messages non lus
6. Cliquer sur un expéditeur
7. Voir tous les messages de cette conversation

**Résultat attendu:**
- Chaque expéditeur apparaît une seule fois
- Badge affichant le nombre de messages non lus
- Dernier message visible dans la liste
- Tri correct (non lus en premier, puis par date)

**Statut par rôle:**
- ✅ **Tous les rôles:** Fonctionne de la même manière

**Remarques:**
- Le regroupement se fait automatiquement côté backend
- Les messages sont accessibles via un clic
- Le compteur est synchronisé en temps réel

---

### 2.3 Compteur de Messages dans la Navbar

**Description:** Affichage du nombre de messages non lus dans la barre de navigation.

**Fonctionnalités:**
- Compteur en temps réel
- Badge rouge avec le nombre
- Mise à jour automatique lors de la réception
- Mise à jour lors de la lecture
- Lien direct vers la messagerie

**Étapes pour tester:**
1. Se connecter avec un compte ayant des messages non lus
2. Observer le compteur dans la navbar (en haut à droite)
3. Recevoir un nouveau message (depuis un autre compte)
4. Vérifier la mise à jour automatique du compteur
5. Ouvrir la messagerie et lire un message
6. Vérifier la diminution du compteur
7. Cliquer sur le compteur
8. Vérifier la redirection vers `/messages`

**Résultat attendu:**
- Compteur visible et à jour
- Mise à jour instantanée
- Redirection fonctionnelle
- Compteur disparaît quand tous les messages sont lus

**Statut par rôle:**
- ✅ **Tous les rôles:** Compteur fonctionnel

**Remarques:**
- Le compteur utilise l'endpoint `/api/messages/unread/count`
- La synchronisation est automatique via Socket.io
- Le compteur est mis à jour toutes les 30 secondes (polling de secours)

---

## Module 3 : Paiements

### 3.1 Visualisation des Paiements

**Description:** Affichage de tous les paiements selon le rôle de l'utilisateur.

**Fonctionnalités:**
- Liste des paiements avec filtres
- Filtres par statut (payé, en attente, en retard)
- Filtres par type (loyer, paiement initial, commission, autre)
- Filtres par date (mois, année)
- Recherche par montant, unité
- Statistiques globales (total payé, en attente, en retard)
- Tri par date, montant, statut
- Pagination

**Étapes pour tester (Locataire):**
1. Se connecter en tant que locataire
2. Accéder à `/payments/locataire`
3. Observer la liste de ses paiements
4. Utiliser les filtres (statut, type, date)
5. Rechercher un paiement spécifique
6. Vérifier les statistiques affichées
7. Trier par date d'échéance
8. Cliquer sur "Voir détails" d'un paiement

**Étapes pour tester (Propriétaire):**
1. Se connecter en tant que propriétaire
2. Accéder à `/payments/proprietaire`
3. Observer les paiements reçus de ses locataires
4. Vérifier les filtres disponibles
5. Vérifier les statistiques (revenus mensuels, reçus ce mois)

**Étapes pour tester (Admin):**
1. Se connecter en tant qu'admin
2. Accéder à `/payments/admin`
3. Observer tous les paiements du système
4. Vérifier les filtres et statistiques globales

**Résultat attendu:**
- Liste complète et filtrée des paiements
- Filtres fonctionnels
- Statistiques exactes
- Tri correct
- Détails accessibles

**Statut par rôle:**
- ✅ **Locataire:** Voit uniquement ses paiements
- ✅ **Propriétaire:** Voit les paiements de ses unités
- ✅ **Admin:** Voit tous les paiements

**Remarques:**
- Les données sont synchronisées en temps réel
- Les totaux sont calculés automatiquement
- Les paiements en retard sont mis en évidence

---

### 3.2 Effectuer un Paiement

**Description:** Permet aux locataires et propriétaires d'effectuer un paiement.

**Fonctionnalités:**
- Sélection de la méthode de paiement :
  - Carte de crédit (Stripe)
  - Interac e-Transfer
  - Virement bancaire
- Affichage des détails de la facture
- Génération de reçu PDF après paiement
- Confirmation par email
- Mise à jour automatique du statut

**Étapes pour tester:**
1. Se connecter en tant que locataire
2. Accéder à `/payments/locataire`
3. Cliquer sur "Payer maintenant" sur un paiement en attente
4. Observer les détails de la facture
5. Choisir une méthode de paiement
6. Suivre les instructions selon la méthode :
   - **Stripe:** Remplir les informations de carte (mode test)
   - **Interac:** Copier les instructions et le numéro de référence
   - **Virement:** Copier les informations bancaires
7. Confirmer le paiement
8. Vérifier la mise à jour du statut
9. Télécharger le reçu (si généré)

**Résultat attendu:**
- Page de paiement accessible
- Détails de la facture corrects
- Instructions claires pour chaque méthode
- Statut mis à jour à "payé" après confirmation
- Reçu généré et téléchargeable
- Email de confirmation envoyé
- Synchronisation sur tous les dashboards

**Statut par rôle:**
- ✅ **Locataire:** Peut payer ses factures
- ✅ **Propriétaire:** Peut payer les paiements initiaux pour ses unités
- ❌ **Admin:** Peut marquer manuellement comme payé

**Remarques:**
- Les paiements Stripe utilisent le mode test (clés de test)
- Les paiements Interac nécessitent une confirmation manuelle
- Les virements bancaires nécessitent une confirmation manuelle
- Le statut se synchronise automatiquement partout

---

### 3.3 Synchronisation des Paiements

**Description:** Synchronisation automatique des paiements sur tous les dashboards et pages.

**Fonctionnalités:**
- Mise à jour automatique du statut
- Synchronisation en temps réel via Socket.io
- Mise à jour des statistiques
- Mise à jour des listes de paiements
- Mise à jour des alertes (paiements en retard)
- Prévention des doublons

**Étapes pour tester:**
1. Effectuer un paiement (comme locataire)
2. Ouvrir le dashboard propriétaire (autre onglet)
3. Vérifier la mise à jour automatique
4. Vérifier les statistiques mises à jour
5. Vérifier que le paiement apparaît dans "Paiements reçus"
6. Vérifier que le paiement disparaît de "Paiements en attente"
7. Vérifier que les alertes sont mises à jour
8. Ouvrir le dashboard admin
9. Vérifier la synchronisation complète

**Résultat attendu:**
- Synchronisation instantanée
- Toutes les pages reflètent le même statut
- Statistiques cohérentes
- Pas de doublons
- Alertes mises à jour

**Statut par rôle:**
- ✅ **Tous les rôles:** Synchronisation automatique

**Remarques:**
- La synchronisation utilise un service centralisé (`paymentSyncService`)
- Les événements sont émis via Socket.io
- Les hooks React (`usePaymentSync`) gèrent la mise à jour frontend

---

### 3.4 Gestion des Paiements en Retard

**Description:** Identification et gestion automatique des paiements en retard.

**Fonctionnalités:**
- Détection automatique des paiements en retard
- Mise à jour automatique du statut (en_attente → en_retard)
- Alertes visuelles (badges rouges)
- Section dédiée "Paiements en retard"
- Filtres pour voir uniquement les paiements en retard
- Notifications automatiques

**Étapes pour tester:**
1. Créer un paiement avec une date d'échéance passée
2. Attendre la mise à jour automatique (ou forcer via backend)
3. Se connecter en tant que propriétaire
4. Observer l'alerte "Paiements en retard" sur le dashboard
5. Cliquer sur "Voir les paiements"
6. Vérifier le filtre automatique sur "en_retard"
7. Vérifier la liste des paiements en retard
8. Vérifier les statistiques mises à jour

**Résultat attendu:**
- Détection automatique des retards
- Alertes visibles
- Filtres fonctionnels
- Liste complète des paiements en retard
- Statistiques exactes

**Statut par rôle:**
- ✅ **Propriétaire:** Voit les paiements en retard de ses locataires
- ✅ **Locataire:** Voit ses propres paiements en retard
- ✅ **Admin:** Voit tous les paiements en retard

**Remarques:**
- La mise à jour se fait automatiquement via un cron job (optionnel)
- Les paiements sont marqués en retard si `dueDate < now` et `status = en_attente`

---

## Module 4 : Demandes et Services

### 4.1 Création de Demandes

**Description:** Permet aux utilisateurs de créer des demandes (location, achat, maintenance, réclamation, services, autre).

**Fonctionnalités:**
- Formulaire de création avec validation
- Types de demandes :
  - Location
  - Achat
  - Maintenance
  - Réclamation
  - Services
  - Autre
- Sélection d'unité (si applicable)
- Priorité (faible, moyenne, haute, urgente)
- Description détaillée
- Upload de pièces jointes (optionnel)
- Notification automatique à l'admin

**Étapes pour tester (Locataire):**
1. Se connecter en tant que locataire
2. Accéder à `/locataire/services`
3. Cliquer sur "➕ Nouvelle demande"
4. Remplir le formulaire :
   - Type : Maintenance
   - Titre : Réparation de la climatisation
   - Description : La climatisation ne fonctionne plus
   - Priorité : Haute
   - Unité : Sélectionner son unité
5. Cliquer sur "Créer la demande"
6. Vérifier le message de succès
7. Vérifier l'apparition dans la liste

**Étapes pour tester (Visiteur):**
1. Accéder à `/request` (sans être connecté)
2. Remplir le formulaire de demande de location/achat
3. Soumettre la demande
4. Vérifier la création du compte visiteur automatique

**Résultat attendu:**
- Demande créée avec succès
- Statut initial : "en_attente"
- Notification envoyée à l'admin
- Demande visible dans la liste
- Détails accessibles

**Statut par rôle:**
- ✅ **Locataire:** Peut créer des demandes de maintenance, réclamation, services
- ✅ **Visiteur:** Peut créer des demandes de location/achat
- ✅ **Propriétaire:** Peut créer des demandes liées à ses unités
- ✅ **Admin:** Peut créer n'importe quel type de demande

**Remarques:**
- Les demandes sont automatiquement assignées selon le type
- Les notifications sont envoyées en temps réel
- L'historique est conservé

---

### 4.2 Gestion des Demandes (Admin)

**Description:** Permet à l'admin de gérer toutes les demandes du système.

**Fonctionnalités:**
- Liste complète de toutes les demandes
- Filtres par type, statut, priorité, unité
- Recherche par titre, description
- Modification du statut (en_attente → en_cours → terminée)
- Modification de la priorité
- Assignation à un utilisateur
- Ajout de commentaires
- Génération de documents (contrats, baux)
- Acceptation/Refus de demandes
- Historique complet des modifications

**Étapes pour tester:**
1. Se connecter en tant qu'admin
2. Accéder à `/admin/requests`
3. Observer la liste complète des demandes
4. Utiliser les filtres (type, statut, priorité)
5. Rechercher une demande spécifique
6. Cliquer sur "Voir détails" d'une demande
7. Modifier le statut (ex: en_attente → en_cours)
8. Modifier la priorité
9. Ajouter un commentaire
10. Accepter une demande de location
11. Vérifier la génération automatique des documents
12. Vérifier l'historique des modifications

**Résultat attendu:**
- Liste complète et filtrée
- Modifications sauvegardées
- Documents générés automatiquement
- Historique visible
- Notifications envoyées aux utilisateurs concernés

**Statut par rôle:**
- ✅ **Admin:** Accès complet
- ❌ **Propriétaire/Locataire:** Accès limité à leurs propres demandes

**Remarques:**
- Les changements de statut déclenchent des notifications
- Les documents sont générés automatiquement lors de l'acceptation
- L'historique est tracé pour audit

---

### 4.3 Suivi des Demandes (Locataire/Propriétaire)

**Description:** Permet aux utilisateurs de suivre l'état de leurs demandes.

**Fonctionnalités:**
- Liste de toutes les demandes créées
- Filtres par type, statut, priorité
- Détails complets de chaque demande
- Statut en temps réel
- Documents générés (si applicable)
- Historique des modifications
- Actions disponibles selon le statut

**Étapes pour tester (Locataire):**
1. Se connecter en tant que locataire
2. Accéder à `/locataire/services`
3. Observer la liste de ses demandes
4. Utiliser les filtres
5. Cliquer sur "Voir détails" d'une demande
6. Observer les détails complets :
   - Statut actuel
   - Priorité
   - Description
   - Documents générés (si acceptée)
   - Historique
7. Signer un document (si demande acceptée)
8. Vérifier la mise à jour du statut

**Résultat attendu:**
- Liste complète de ses demandes
- Détails accessibles
- Statut à jour
- Actions disponibles selon le statut
- Documents signables (si applicable)

**Statut par rôle:**
- ✅ **Locataire:** Voit uniquement ses demandes
- ✅ **Propriétaire:** Voit les demandes liées à ses unités
- ✅ **Admin:** Voit toutes les demandes

**Remarques:**
- Les demandes sont synchronisées en temps réel
- Les notifications sont envoyées lors des changements de statut
- Les documents peuvent être signés électroniquement

---

### 4.4 Synchronisation des Demandes

**Description:** Synchronisation automatique des demandes sur tous les dashboards et pages.

**Fonctionnalités:**
- Mise à jour automatique du statut
- Synchronisation en temps réel
- Mise à jour des compteurs
- Mise à jour des listes
- Prévention des doublons
- Historique complet

**Étapes pour tester:**
1. Créer une demande (comme locataire)
2. Ouvrir le dashboard admin (autre onglet)
3. Vérifier l'apparition automatique
4. Modifier le statut (comme admin)
5. Ouvrir le dashboard locataire
6. Vérifier la mise à jour automatique
7. Vérifier les compteurs mis à jour
8. Vérifier les notifications

**Résultat attendu:**
- Synchronisation instantanée
- Toutes les pages reflètent le même statut
- Compteurs cohérents
- Pas de doublons
- Notifications envoyées

**Statut par rôle:**
- ✅ **Tous les rôles:** Synchronisation automatique

**Remarques:**
- La synchronisation utilise un service centralisé (`requestSyncService`)
- Les événements sont émis via Socket.io
- Les hooks React (`useRequestSync`) gèrent la mise à jour frontend

---

## Module 5 : Tableaux de Bord

### 5.1 Tableau de Bord Admin

**Description:** Vue d'ensemble complète du système pour l'administrateur.

**Fonctionnalités:**
- Statistiques globales :
  - Total utilisateurs (actifs/inactifs)
  - Total immeubles
  - Total unités (disponibles/occupées)
  - Total demandes (en attente/en cours/terminées)
  - Total paiements (payés/en attente/en retard)
  - Revenus mensuels
- Liste des utilisateurs récents
- Liste des demandes récentes
- Liste des paiements récents
- Liste des messages récents
- Graphiques et visualisations (optionnel)
- Liens rapides vers les sections principales

**Étapes pour tester:**
1. Se connecter en tant qu'admin
2. Accéder à `/dashboard/admin`
3. Observer toutes les statistiques
4. Vérifier les listes récentes
5. Cliquer sur les liens rapides
6. Vérifier la navigation vers les sections
7. Observer les graphiques (si disponibles)
8. Vérifier la mise à jour en temps réel

**Résultat attendu:**
- Toutes les statistiques affichées
- Listes complètes et à jour
- Navigation fonctionnelle
- Mise à jour automatique
- Données cohérentes

**Statut par rôle:**
- ✅ **Admin:** Accès complet
- ❌ **Propriétaire/Locataire:** Accès refusé

**Remarques:**
- Les données sont chargées depuis des services centralisés
- La synchronisation est automatique
- Les erreurs sont gérées gracieusement

---

### 5.2 Tableau de Bord Propriétaire

**Description:** Vue d'ensemble pour les propriétaires de leurs unités et activités.

**Fonctionnalités:**
- Statistiques personnelles :
  - Total unités en gestion
  - Taux d'occupation
  - Revenus mensuels
  - Paiements reçus ce mois
  - Paiements en retard
  - Demandes en attente
  - Documents à signer
- Liste des unités avec détails
- Liste des paiements reçus
- Liste des paiements en retard (avec alertes)
- Liste des demandes de maintenance
- Liste des candidatures (demandes de location)
- Demandes acceptées avec documents à signer
- Paiements initiaux en attente

**Étapes pour tester:**
1. Se connecter en tant que propriétaire
2. Accéder à `/dashboard/proprietaire`
3. Observer toutes les statistiques
4. Vérifier les alertes (paiements en retard)
5. Cliquer sur "Voir les paiements" depuis une alerte
6. Vérifier la navigation avec filtre automatique
7. Observer les listes (unités, paiements, demandes)
8. Vérifier la mise à jour en temps réel

**Résultat attendu:**
- Statistiques exactes
- Alertes visibles
- Navigation fonctionnelle
- Listes complètes
- Mise à jour automatique

**Statut par rôle:**
- ✅ **Propriétaire:** Accès complet à ses données
- ❌ **Admin/Locataire:** Accès refusé

**Remarques:**
- Les données sont filtrées automatiquement par propriétaire
- Les alertes sont mises à jour en temps réel
- Les liens de navigation incluent les filtres appropriés

---

### 5.3 Tableau de Bord Locataire

**Description:** Vue d'ensemble pour les locataires de leurs informations et activités.

**Fonctionnalités:**
- Informations personnelles :
  - Unité assignée (si applicable)
  - Statut (actif/en attente)
- Statistiques :
  - Total demandes
  - Demandes en attente/en cours/terminées
  - Total paiements
  - Paiements en attente/en retard/payés
  - Messages non lus
- Prochain paiement dû
- Liste des demandes récentes
- Liste des paiements récents
- Notifications
- Documents accessibles
- Actions rapides :
  - Payer le loyer
  - Contacter le propriétaire
  - Créer une demande

**Étapes pour tester:**
1. Se connecter en tant que locataire
2. Accéder à `/dashboard/locataire`
3. Observer toutes les informations
4. Vérifier les statistiques
5. Observer le prochain paiement dû
6. Cliquer sur "Payer maintenant"
7. Vérifier la navigation vers la page de paiement
8. Observer les listes (demandes, paiements, notifications)
9. Vérifier la mise à jour en temps réel

**Résultat attendu:**
- Informations complètes
- Statistiques exactes
- Actions fonctionnelles
- Navigation correcte
- Mise à jour automatique

**Statut par rôle:**
- ✅ **Locataire:** Accès complet à ses données
- ❌ **Admin/Propriétaire:** Accès refusé

**Remarques:**
- Les données sont filtrées automatiquement par locataire
- Les actions rapides facilitent les tâches courantes
- La synchronisation est automatique

---

### 5.4 Synchronisation des Tableaux de Bord

**Description:** Synchronisation automatique de tous les tableaux de bord en temps réel.

**Fonctionnalités:**
- Mise à jour automatique des statistiques
- Mise à jour des listes
- Mise à jour des compteurs
- Synchronisation via Socket.io
- Hooks React pour la mise à jour
- Gestion du loading state

**Étapes pour tester:**
1. Ouvrir plusieurs onglets avec différents dashboards
2. Effectuer une action (paiement, demande, message)
3. Observer la mise à jour automatique sur tous les dashboards
4. Vérifier la cohérence des données
5. Vérifier les compteurs
6. Vérifier les alertes

**Résultat attendu:**
- Synchronisation instantanée
- Données cohérentes partout
- Compteurs exacts
- Alertes mises à jour

**Statut par rôle:**
- ✅ **Tous les rôles:** Synchronisation automatique

**Remarques:**
- La synchronisation utilise des services centralisés
- Les événements sont émis via Socket.io
- Les hooks React gèrent la mise à jour frontend
- Le loading state est géré correctement

---

## Module 6 : Gestion des Unités

### 6.1 Liste des Unités (Admin)

**Description:** Gestion complète de toutes les unités du système.

**Fonctionnalités:**
- Liste complète avec pagination
- Filtres par immeuble, statut, type, propriétaire
- Recherche par numéro d'unité, adresse
- Création de nouvelles unités
- Modification des unités
- Assignation de propriétaire
- Assignation de locataire
- Libération d'unité
- Suppression d'unité
- Vue en tableau ou en cartes

**Étapes pour tester:**
1. Se connecter en tant qu'admin
2. Accéder à `/admin/units` ou `/units`
3. Observer la liste complète
4. Utiliser les filtres
5. Rechercher une unité
6. Cliquer sur "Créer une unité"
7. Remplir le formulaire :
   - Numéro d'unité
   - Immeuble
   - Type (studio, 1br, 2br, etc.)
   - Superficie
   - Prix de location
   - Prix de vente
   - Statut
8. Sauvegarder
9. Modifier une unité existante
10. Assigner un propriétaire
11. Assigner un locataire
12. Libérer une unité

**Résultat attendu:**
- Liste complète et filtrée
- Création/modification réussie
- Assignations fonctionnelles
- Données mises à jour

**Statut par rôle:**
- ✅ **Admin:** Accès complet
- ✅ **Propriétaire:** Voit uniquement ses unités
- ❌ **Locataire:** Accès limité (voit uniquement son unité)

**Remarques:**
- Les modifications sont sauvegardées immédiatement
- Les assignations déclenchent des notifications
- L'historique est conservé

---

### 6.2 Mes Unités (Propriétaire)

**Description:** Gestion des unités par le propriétaire.

**Fonctionnalités:**
- Liste de toutes les unités du propriétaire
- Détails de chaque unité :
  - Informations générales
  - Locataire actuel (si applicable)
  - Historique des paiements
  - Demandes liées
  - Documents
- Actions disponibles :
  - Modifier les informations
  - Gérer le locataire
  - Voir les paiements
  - Voir les demandes

**Étapes pour tester:**
1. Se connecter en tant que propriétaire
2. Accéder à `/proprietaire/mes-unites`
3. Observer la liste de ses unités
4. Cliquer sur "Voir détails" d'une unité
5. Observer les détails complets
6. Modifier les informations
7. Voir les paiements de l'unité
8. Voir les demandes liées

**Résultat attendu:**
- Liste complète de ses unités
- Détails accessibles
- Modifications possibles
- Informations à jour

**Statut par rôle:**
- ✅ **Propriétaire:** Accès complet à ses unités
- ❌ **Admin/Locataire:** Accès refusé

**Remarques:**
- Les données sont filtrées automatiquement
- Les modifications sont limitées aux informations non critiques
- Les actions importantes nécessitent parfois l'approbation admin

---

### 6.3 Consultation des Unités Disponibles

**Description:** Consultation des unités disponibles pour location/achat.

**Fonctionnalités:**
- Liste des unités disponibles
- Filtres avancés :
  - Type (studio, 1br, 2br, etc.)
  - Prix (min/max)
  - Superficie (min/max)
  - Immeuble
  - Ville
- Recherche par mots-clés
- Tri par prix, superficie, date
- Vue en liste ou en cartes
- Détails complets de chaque unité
- Galerie de photos (optionnel)
- Formulaire de demande depuis la page

**Étapes pour tester:**
1. Accéder à `/units` (sans être connecté ou en tant que visiteur)
2. Observer la liste des unités disponibles
3. Utiliser les filtres
4. Rechercher une unité
5. Trier les résultats
6. Cliquer sur "Voir détails" d'une unité
7. Observer les détails complets
8. Cliquer sur "Faire une demande" (si connecté)
9. Remplir le formulaire de demande
10. Soumettre

**Résultat attendu:**
- Liste complète des unités disponibles
- Filtres fonctionnels
- Recherche efficace
- Détails accessibles
- Formulaire de demande fonctionnel

**Statut par rôle:**
- ✅ **Tous (y compris non connectés):** Peuvent consulter
- ✅ **Visiteurs/Locataires:** Peuvent faire des demandes
- ❌ **Propriétaires:** Peuvent voir mais ne peuvent pas faire de demandes

**Remarques:**
- Les unités non disponibles ne sont pas affichées
- Les prix sont affichés clairement
- Les photos améliorent l'expérience utilisateur

---

## Module 7 : Gestion des Immeubles

### 7.1 Liste des Immeubles (Admin)

**Description:** Gestion complète de tous les immeubles.

**Fonctionnalités:**
- Liste complète avec pagination
- Filtres par ville, province
- Recherche par nom, adresse
- Création de nouveaux immeubles
- Modification des immeubles
- Assignation d'administrateur
- Suppression d'immeubles
- Détails complets :
  - Adresse complète
  - Nombre d'unités
  - Année de construction
  - Informations de contact

**Étapes pour tester:**
1. Se connecter en tant qu'admin
2. Accéder à `/buildings`
3. Observer la liste complète
4. Utiliser les filtres
5. Rechercher un immeuble
6. Cliquer sur "Créer un immeuble"
7. Remplir le formulaire :
   - Nom
   - Adresse (rue, ville, province, code postal)
   - Année de construction
   - Nombre d'étages
8. Sauvegarder
9. Modifier un immeuble existant
10. Assigner un administrateur

**Résultat attendu:**
- Liste complète et filtrée
- Création/modification réussie
- Assignations fonctionnelles
- Données mises à jour

**Statut par rôle:**
- ✅ **Admin:** Accès complet
- ❌ **Propriétaire/Locataire:** Accès refusé

**Remarques:**
- Les immeubles sont nécessaires avant de créer des unités
- Les assignations d'admin sont importantes pour la gestion

---

## Module 8 : Documents

### 8.1 Gestion des Documents

**Description:** Gestion complète des documents (contrats, baux, factures, reçus).

**Fonctionnalités:**
- Liste de tous les documents accessibles
- Filtres par type, date, unité
- Recherche par nom, type
- Upload de documents
- Téléchargement de documents
- Signature électronique (pour contrats/baux)
- Génération automatique (contrats, baux, reçus)
- Partage sécurisé
- Historique des versions

**Étapes pour tester:**
1. Se connecter en tant que locataire
2. Accéder à `/documents`
3. Observer la liste de ses documents
4. Utiliser les filtres
5. Rechercher un document
6. Télécharger un document
7. Signer un document (si applicable)
8. Vérifier l'historique

**Étapes pour tester (Admin):**
1. Se connecter en tant qu'admin
2. Accéder à `/documents`
3. Uploader un document
4. Assigner des permissions
5. Générer un contrat automatiquement
6. Vérifier la génération

**Résultat attendu:**
- Liste complète des documents
- Filtres fonctionnels
- Upload/téléchargement fonctionnel
- Signature électronique fonctionnelle
- Génération automatique réussie

**Statut par rôle:**
- ✅ **Admin:** Accès à tous les documents
- ✅ **Propriétaire:** Accès aux documents de ses unités
- ✅ **Locataire:** Accès à ses propres documents

**Remarques:**
- Les documents sont stockés de manière sécurisée
- Les signatures électroniques sont légales (selon la juridiction)
- La génération automatique utilise des templates

---

### 8.2 Signature Électronique

**Description:** Signature électronique de documents (contrats, baux).

**Fonctionnalités:**
- Affichage du document à signer
- Formulaire de signature
- Validation de l'identité
- Enregistrement de la signature
- Horodatage
- Notification aux parties concernées
- Génération du document signé

**Étapes pour tester:**
1. Se connecter en tant que locataire
2. Accéder à une demande acceptée avec documents
3. Cliquer sur "Signer" un document
4. Lire le document
5. Confirmer la signature
6. Vérifier la confirmation
7. Vérifier la notification envoyée
8. Vérifier le document signé disponible

**Résultat attendu:**
- Document affiché correctement
- Signature enregistrée
- Horodatage correct
- Notification envoyée
- Document signé disponible

**Statut par rôle:**
- ✅ **Locataire:** Peut signer les documents qui lui sont assignés
- ✅ **Propriétaire:** Peut signer les documents de ses unités
- ✅ **Admin:** Peut signer tous les documents

**Remarques:**
- Les signatures sont horodatées
- Les notifications sont envoyées automatiquement
- Les documents signés sont conservés de manière sécurisée

---

## Module 9 : Notifications

### 9.1 Système de Notifications

**Description:** Système complet de notifications pour tous les événements importants.

**Fonctionnalités:**
- Notifications en temps réel
- Types de notifications :
  - Messages non lus
  - Paiements en retard
  - Paiements reçus
  - Demandes acceptées/refusées
  - Documents à signer
  - Unités attribuées
  - Maintenance urgente
- Compteur dans la navbar
- Page dédiée `/notifications`
- Filtres par type, date
- Marquer comme lu/non lu
- Suppression de notifications
- Historique complet

**Étapes pour tester:**
1. Se connecter avec un compte ayant des notifications
2. Observer le compteur dans la navbar
3. Cliquer sur le compteur ou accéder à `/notifications`
4. Observer la liste des notifications
5. Utiliser les filtres
6. Marquer une notification comme lue
7. Vérifier la mise à jour du compteur
8. Supprimer une notification
9. Vérifier l'historique

**Résultat attendu:**
- Compteur visible et à jour
- Liste complète des notifications
- Filtres fonctionnels
- Actions (lu, supprimer) fonctionnelles
- Synchronisation en temps réel

**Statut par rôle:**
- ✅ **Tous les rôles:** Notifications fonctionnelles

**Remarques:**
- Les notifications sont générées automatiquement
- La synchronisation est en temps réel
- Le compteur reflète uniquement les notifications non lues

---

### 9.2 Notifications dans les Dashboards

**Description:** Affichage des notifications pertinentes dans les tableaux de bord.

**Fonctionnalités:**
- Section notifications dans chaque dashboard
- Notifications récentes (10 dernières)
- Badge avec nombre de non lus
- Lien vers la page complète
- Mise à jour automatique

**Étapes pour tester:**
1. Se connecter et accéder au dashboard
2. Observer la section notifications
3. Vérifier le badge de non lus
4. Cliquer sur "Voir tout"
5. Vérifier la redirection vers `/notifications`
6. Recevoir une nouvelle notification
7. Vérifier la mise à jour automatique

**Résultat attendu:**
- Section visible
- Badge à jour
- Redirection fonctionnelle
- Mise à jour automatique

**Statut par rôle:**
- ✅ **Tous les rôles:** Notifications dans leurs dashboards

**Remarques:**
- Les notifications sont filtrées selon le rôle
- La mise à jour est automatique
- Les notifications importantes sont mises en évidence

---

## Module 10 : Profils et Paramètres

### 10.1 Gestion du Profil

**Description:** Permet aux utilisateurs de gérer leurs informations personnelles.

**Fonctionnalités:**
- Affichage des informations actuelles
- Modification des informations :
  - Prénom, nom
  - Email
  - Téléphone
  - Adresse
  - Photo de profil (optionnel)
- Changement de mot de passe
- Préférences de notification
- Historique des activités

**Étapes pour tester:**
1. Se connecter
2. Accéder au profil (`/locataire/profile` ou équivalent)
3. Observer les informations actuelles
4. Cliquer sur "Modifier"
5. Modifier les informations
6. Sauvegarder
7. Vérifier la mise à jour
8. Changer le mot de passe
9. Vérifier la confirmation

**Résultat attendu:**
- Informations affichées correctement
- Modifications sauvegardées
- Mot de passe changé avec succès
- Mise à jour visible partout

**Statut par rôle:**
- ✅ **Tous les rôles:** Peuvent modifier leur profil

**Remarques:**
- Les modifications sont sauvegardées immédiatement
- Le changement de mot de passe nécessite une confirmation
- L'historique est conservé pour audit

---

### 10.2 Paramètres

**Description:** Configuration des paramètres de l'application.

**Fonctionnalités:**
- Préférences de notification
- Préférences d'affichage
- Langue (si multilingue)
- Thème (clair/sombre) (optionnel)
- Paramètres de sécurité
- Export des données (RGPD)

**Étapes pour tester:**
1. Se connecter
2. Accéder aux paramètres (`/locataire/settings` ou équivalent)
3. Modifier les préférences de notification
4. Modifier les préférences d'affichage
5. Sauvegarder
6. Vérifier l'application des changements

**Résultat attendu:**
- Paramètres modifiables
- Sauvegarde réussie
- Changements appliqués

**Statut par rôle:**
- ✅ **Tous les rôles:** Accès à leurs paramètres

**Remarques:**
- Les paramètres sont sauvegardés par utilisateur
- Les préférences sont appliquées immédiatement
- L'export des données respecte le RGPD

---

## Annexes

### A. Architecture Technique

**Frontend:**
- Framework: Next.js 14.2.33
- Langage: TypeScript
- Styling: Tailwind CSS
- State Management: React Context API, Hooks
- Communication: Axios, Socket.io Client
- Authentification: JWT (localStorage)

**Backend:**
- Framework: Node.js + Express.js
- Base de données: MongoDB avec Mongoose
- Authentification: JWT
- Communication: Socket.io
- Paiements: Stripe API
- Génération PDF: PDFKit
- Upload fichiers: Multer

**Services Centralisés:**
- `paymentSyncService.js` - Synchronisation des paiements
- `requestSyncService.js` - Synchronisation des demandes
- `messageSyncService.js` - Synchronisation des messages
- `globalSyncService.js` - Orchestration globale
- `notificationService.js` - Gestion des notifications

---

### B. Sécurité

**Mesures de sécurité implémentées:**
- Hash des mots de passe avec bcrypt
- Authentification JWT avec expiration
- Validation des données d'entrée
- Protection contre les injections MongoDB
- Vérification des rôles sur les routes sensibles
- CORS configuré
- Variables d'environnement pour les secrets

---

### C. Données de Test

**Comptes de test disponibles:**
- **Admin:** admin@moncondo.com / administrateur
- **Propriétaire:** jean.dupont@example.com / password123
- **Locataire:** pierre.tremblay@example.com / password123
- **Visiteur:** paul.lavoie@example.com / password123

---

### D. Points Importants à Vérifier

**Synchronisation:**
- ✅ Tous les modules sont synchronisés en temps réel
- ✅ Les compteurs sont exacts
- ✅ Les listes sont à jour
- ✅ Pas de doublons

**Permissions:**
- ✅ Chaque rôle voit uniquement ses données
- ✅ Les actions sont restreintes selon le rôle
- ✅ Les routes sont protégées

**Performance:**
- ✅ Chargement rapide des pages
- ✅ Pagination pour les grandes listes
- ✅ Optimisation des requêtes

**UX:**
- ✅ Messages d'erreur clairs
- ✅ Confirmations pour les actions importantes
- ✅ Navigation intuitive
- ✅ Responsive design

---

### E. Contact et Support

Pour toute question ou problème :
- Consulter la documentation technique
- Vérifier les logs du serveur
- Contacter l'équipe de développement

---

**Fin du Document**

*Document généré automatiquement - Version 1.0 - Novembre 2025*

