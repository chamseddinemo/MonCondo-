# MonCondo+ - Backend API

API backend complète pour la gestion de condominium développée avec Node.js, Express.js et MongoDB.

## 🚀 Technologies utilisées

- **Node.js** + **Express.js** - Framework web
- **MongoDB** + **Mongoose** - Base de données
- **JWT** - Authentification
- **Bcrypt** - Hash des mots de passe
- **CORS** - Gestion des requêtes cross-origin
- **Body-Parser** - Parsing des requêtes
- **Multer** - Upload de fichiers
- **dotenv** - Gestion des variables d'environnement

## 📁 Structure du projet

```
MonCondo+
├── backend/              # Application backend
│   ├── config/
│   │   ├── database.js      # Configuration MongoDB
│   │   └── jwt.js           # Configuration JWT
│   ├── models/
│   │   ├── User.js          # Modèle utilisateur
│   │   ├── Building.js       # Modèle immeuble
│   │   ├── Unit.js          # Modèle unité
│   │   ├── Request.js       # Modèle demande/incident
│   │   ├── Document.js      # Modèle document
│   │   ├── Message.js       # Modèle message
│   │   └── Payment.js       # Modèle paiement
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── buildingController.js
│   │   ├── unitController.js
│   │   ├── requestController.js
│   │   ├── documentController.js
│   │   ├── messageController.js
│   │   └── paymentController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── buildingRoutes.js
│   │   ├── unitRoutes.js
│   │   ├── requestRoutes.js
│   │   ├── documentRoutes.js
│   │   ├── messageRoutes.js
│   │   ├── paymentRoutes.js
│   │   └── index.js
│   ├── middlewares/
│   │   ├── auth.js          # Middleware JWT
│   │   ├── roleAuth.js      # Vérification des rôles
│   │   └── upload.js        # Upload de fichiers
│   ├── utils/
│   │   └── seed.js          # Script de seed
│   ├── uploads/              # Fichiers uploadés
│   ├── server.js             # Point d'entrée
│   ├── package.json
│   └── .env.example
│
└── frontend/             # Application frontend
    ├── dist/
    │   ├── index.html      # Page principale
    │   ├── styles.css      # Styles CSS
    │   └── app.js          # Logique JavaScript
    ├── package.json
    └── README.md
```

## 🛠️ Installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd MonCondo+
```

2. **Installer les dépendances**

Backend :
```bash
cd backend
npm install
```

Frontend :
```bash
cd frontend
npm install
```

3. **Configurer les variables d'environnement**
```bash
cd backend
cp .env.example .env
# Éditer .env avec vos configurations
```

4. **Démarrer MongoDB**
Assurez-vous que MongoDB est installé et en cours d'exécution.

5. **Lancer le seed (optionnel)**
```bash
cd backend
npm run seed
```

6. **Démarrer les serveurs**

Backend :
```bash
cd backend
npm start          # Mode production
# ou
npm run dev        # Mode développement avec nodemon
```

Frontend :
Le backend Express sert automatiquement le frontend depuis `frontend/dist/` quand vous accédez à `http://localhost:5000`

Alternativement, pour un serveur de développement séparé :
```bash
cd frontend
npm start          # Démarre sur http://localhost:3000
```

**Accès :**
- Backend API : `http://localhost:5000/api`
- Frontend : `http://localhost:5000` (servi par le backend)
- Frontend standalone : `http://localhost:3000` (si démarré séparément)

## 📚 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Utilisateur actuel
- `POST /api/auth/forgotpassword` - Mot de passe oublié
- `PUT /api/auth/resetpassword/:token` - Réinitialiser mot de passe
- `PUT /api/auth/updatepassword` - Modifier mot de passe

### Utilisateurs
- `GET /api/users` - Liste des utilisateurs (Admin)
- `GET /api/users/:id` - Détails utilisateur
- `POST /api/users` - Créer utilisateur (Admin)
- `PUT /api/users/:id` - Modifier utilisateur
- `DELETE /api/users/:id` - Supprimer utilisateur (Admin)
- `PUT /api/users/:id/promote` - Promouvoir locataire → propriétaire (Admin)

### Immeubles
- `GET /api/buildings` - Liste des immeubles
- `GET /api/buildings/:id` - Détails immeuble
- `POST /api/buildings` - Créer immeuble (Admin)
- `PUT /api/buildings/:id` - Modifier immeuble (Admin)
- `DELETE /api/buildings/:id` - Supprimer immeuble (Admin)
- `PUT /api/buildings/:id/assign-admin` - Assigner admin (Admin)

### Unités
- `GET /api/units` - Liste des unités
- `GET /api/units/available` - Unités disponibles
- `GET /api/units/:id` - Détails unité
- `POST /api/units` - Créer unité (Admin)
- `PUT /api/units/:id` - Modifier unité
- `DELETE /api/units/:id` - Supprimer unité (Admin)
- `PUT /api/units/:id/assign-owner` - Assigner propriétaire (Admin)
- `PUT /api/units/:id/assign-tenant` - Assigner locataire
- `PUT /api/units/:id/release` - Libérer unité

### Demandes / Incidents
- `GET /api/requests` - Liste des demandes
- `GET /api/requests/:id` - Détails demande
- `POST /api/requests` - Créer demande
- `POST /api/requests/visitor-request` - Demande visiteur
- `PUT /api/requests/:id` - Modifier demande
- `DELETE /api/requests/:id` - Supprimer demande
- `PUT /api/requests/:id/status` - Changer statut (Admin)
- `PUT /api/requests/:id/assign` - Assigner demande (Admin)

### Documents
- `GET /api/documents` - Liste des documents
- `GET /api/documents/:id` - Détails document
- `POST /api/documents` - Upload document
- `GET /api/documents/:id/download` - Télécharger document
- `PUT /api/documents/:id` - Modifier document
- `DELETE /api/documents/:id` - Supprimer document

### Messages
- `GET /api/messages` - Liste des messages
- `GET /api/messages/unread` - Messages non lus
- `GET /api/messages/conversation/:userId` - Conversation
- `GET /api/messages/:id` - Détails message
- `POST /api/messages` - Envoyer message
- `PUT /api/messages/:id` - Modifier message
- `DELETE /api/messages/:id` - Supprimer message
- `PUT /api/messages/:id/read` - Marquer comme lu

### Paiements
- `GET /api/payments` - Liste des paiements
- `GET /api/payments/overdue` - Paiements en retard (Admin)
- `GET /api/payments/:id` - Détails paiement
- `POST /api/payments` - Créer paiement
- `PUT /api/payments/:id` - Modifier paiement (Admin)
- `DELETE /api/payments/:id` - Supprimer paiement (Admin)
- `PUT /api/payments/:id/mark-paid` - Marquer comme payé
- `GET /api/payments/:id/receipt` - Générer reçu
- `POST /api/payments/:id/process-online` - Paiement en ligne

## 🔐 Rôles utilisateurs

- **admin** - Accès complet au système
- **proprietaire** - Gestion de ses unités
- **locataire** - Accès à ses informations et demandes
- **visiteur** - Consultation des unités disponibles et création de demandes

## 📝 Exemples de requêtes

### Inscription
```bash
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "Jean",
  "lastName": "Dupont",
  "email": "jean@example.com",
  "password": "password123",
  "phone": "514-123-4567",
  "role": "visiteur"
}
```

### Connexion
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@moncondo.com",
  "password": "admin123"
}
```

### Requête authentifiée
```bash
GET /api/buildings
Authorization: Bearer <token>
```

## 🧪 Données de test

Après avoir exécuté `npm run seed`, vous pouvez utiliser ces comptes :

- **Admin**: admin@moncondo.com / administrateur
- **Propriétaire 1**: jean.dupont@example.com / password123
- **Propriétaire 2**: marie.martin@example.com / password123
- **Locataire 1**: pierre.tremblay@example.com / password123
- **Locataire 2**: sophie.gagnon@example.com / password123
- **Visiteur**: paul.lavoie@example.com / password123

## 🔒 Sécurité

- Mots de passe hashés avec bcrypt
- Authentification JWT
- Vérification des rôles sur les routes sensibles
- Validation des données d'entrée
- Protection contre les injections MongoDB

## 📄 Licence

ISC

## 👨‍💻 Auteur

MonCondo+ Development Team

