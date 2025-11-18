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

## 📁 Structure

```
backend/
├── config/
│   ├── database.js      # Configuration MongoDB
│   └── jwt.js           # Configuration JWT
├── models/              # Modèles Mongoose
├── controllers/         # Controllers (logique métier)
├── routes/              # Routes Express
├── middlewares/         # Middlewares (auth, upload, etc.)
├── utils/               # Utilitaires (seed, etc.)
├── uploads/             # Fichiers uploadés
├── server.js            # Point d'entrée
└── package.json
```

## 🛠️ Installation

1. **Installer les dépendances**
```bash
npm install
```

2. **Configurer les variables d'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos configurations
```

3. **Démarrer MongoDB**
Assurez-vous que MongoDB est installé et en cours d'exécution.

4. **Lancer le seed (optionnel)**
```bash
npm run seed
```

5. **Démarrer le serveur**
```bash
npm start          # Mode production
# ou
npm run dev        # Mode développement avec nodemon
```

Le serveur sera accessible sur `http://localhost:5000`

## 📚 API Endpoints

Voir le README principal dans le dossier racine pour la documentation complète des endpoints.

## 🔒 Sécurité

- Mots de passe hashés avec bcrypt
- Authentification JWT
- Vérification des rôles sur les routes sensibles
- Validation des données d'entrée
- Protection contre les injections MongoDB

## 📄 Licence

ISC

