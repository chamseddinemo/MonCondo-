# MonCondo+ Frontend - Next.js

## Installation

```bash
cd frontend
npm install
```

## Développement

```bash
npm run dev
```

Accédez à http://localhost:3000

## Build Production

```bash
npm run build
npm start
```

## Structure des composants

- **Header** - Navigation avec menu responsive
- **Hero** - Section hero avec carrousel
- **AvailableUnits** - Liste des unités avec filtres
- **Features** - Grille des fonctionnalités
- **Testimonials** - Témoignages clients
- **Community** - Section communauté
- **Footer** - Pied de page avec formulaire

## Pages

- `/` - Page d'accueil
- `/login` - Connexion/Inscription
- `/request` - Formulaire de demande

## Configuration API

L'API backend est configurée sur `http://localhost:5000/api`

Modifiez les appels axios dans les composants pour changer l'URL de l'API.
