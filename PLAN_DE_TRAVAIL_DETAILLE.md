# 📋 Plan de Travail Détaillé - MonCondo+

**Date de création** : 2025-01-27  
**Version** : 1.0  
**Objectif** : Résoudre toutes les tâches techniques identifiées par ordre de priorité

---

## 📊 Vue d'Ensemble

| Priorité | Tâche | Fichiers | Durée | Statut |
|---------|--------|-----------|--------|--------|
| 🔴 Haute | Vérification admin + seed | `backend/TEST_API_ROUTES.js`, `backend/utils/seed.js` | 30 min | ⏳ À faire |
| 🔴 Haute | Validation images | `frontend/utils/imageUtils.ts`, `frontend/pages/explorer.tsx`, `frontend/pages/dashboard/visiteur.tsx` | 1 h | ⏳ À faire |
| 🔴 Haute | Tests E2E | `frontend/e2e/` (nouveau) | 4-6 h | ⏳ À faire |
| 🟡 Moyenne | MAJ Next.js | `frontend/package.json`, `frontend/next.config.js` | 2-3 h | ⏳ À faire |
| 🟡 Moyenne | Optimisation build | `frontend/next.config.js` | 2 h | ⏳ À faire |
| 🟡 Moyenne | Documentation API | `backend/API_DOCUMENTATION.md` (nouveau) | 3-4 h | ⏳ À faire |
| 🟢 Basse | Amélioration Socket.io | `frontend/contexts/SocketContext.tsx` | 1-2 h | ⏳ À faire |
| 🟢 Basse | Tests unitaires | `frontend/__tests__/` (nouveau) | 6-8 h | ⏳ À faire |

**Durée totale estimée** : 19-26 heures

---

## 🔴 PRIORITÉ HAUTE

### Tâche 1 : Vérification de l'Existence des Utilisateurs de Test

**Fichiers à modifier** :
- `backend/TEST_API_ROUTES.js`
- `backend/utils/seed.js` (optionnel - amélioration)

**Actions à réaliser** :
1. Créer fonction `checkOrCreateAdmin()` dans `TEST_API_ROUTES.js`
2. Vérifier si l'utilisateur admin existe avant les tests
3. Créer automatiquement l'utilisateur si absent
4. Améliorer messages d'erreur

**Extrait de code à ajouter** :

```javascript
// backend/TEST_API_ROUTES.js

const mongoose = require('mongoose');
const User = require('./models/User'); // Ajuster le chemin selon votre structure

/**
 * Vérifie si l'utilisateur admin existe, sinon le crée
 * @returns {Promise<boolean>} true si admin existe ou créé avec succès
 */
async function checkOrCreateAdmin() {
  try {
    // Vérifier si admin existe
    const existingAdmin = await User.findOne({ email: 'admin@moncondo.com' });
    
    if (existingAdmin) {
      console.log('✅ Utilisateur admin trouvé dans la base de données');
      return true;
    }

    // Créer l'admin si absent
    console.log('⚠️ Utilisateur admin non trouvé. Création en cours...');
    
    // S'assurer que la connexion DB est établie
    if (mongoose.connection.readyState === 0) {
      const connectDB = require('./config/database');
      await connectDB();
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('administrateur', 10);

    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'Système',
      email: 'admin@moncondo.com',
      password: hashedPassword,
      phone: '514-123-4567',
      role: 'admin',
      isActive: true
    });

    console.log('✅ Utilisateur admin créé avec succès');
    console.log('   Email: admin@moncondo.com');
    console.log('   Mot de passe: administrateur');
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification/création de l\'admin:', error.message);
    console.error('\n💡 Solution:');
    console.error('   1. Vérifiez que MongoDB est démarré');
    console.error('   2. Exécutez: cd backend && npm run seed');
    console.error('   3. Vérifiez les variables d\'environnement (.env)');
    return false;
  }
}

// Modifier la fonction runTests() pour inclure la vérification
async function runTests() {
  console.log('🧪 Démarrage des tests API...\n');

  // Vérifier/créer admin avant les tests
  console.log('🔍 Vérification de l\'utilisateur admin...');
  const adminReady = await checkOrCreateAdmin();
  
  if (!adminReady) {
    console.error('\n❌ Impossible de continuer sans utilisateur admin');
    console.error('   Veuillez exécuter: cd backend && npm run seed');
    process.exit(1);
  }
  console.log('');

  // Continuer avec les tests existants...
  // ... reste du code existant
}
```

**Commandes à exécuter** :

```bash
# 1. Vérifier que MongoDB est démarré
mongod --version

# 2. Vérifier la connexion à la base de données
cd backend
node -e "require('dotenv').config(); const connectDB = require('./config/database'); connectDB().then(() => { console.log('✅ DB connectée'); process.exit(0); }).catch(err => { console.error('❌ Erreur:', err); process.exit(1); });"

# 3. Exécuter les tests
node TEST_API_ROUTES.js
```

**Script à créer** : `backend/check-admin.js`

```javascript
// backend/check-admin.js
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const User = require('./models/User');

async function checkAdmin() {
  try {
    await connectDB();
    const admin = await User.findOne({ email: 'admin@moncondo.com' });
    
    if (admin) {
      console.log('✅ Admin existe:', admin.email);
      process.exit(0);
    } else {
      console.log('❌ Admin non trouvé');
      console.log('💡 Exécutez: npm run seed');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

checkAdmin();
```

**Ajouter dans `backend/package.json`** :

```json
{
  "scripts": {
    "check-admin": "node check-admin.js",
    "test-api": "node TEST_API_ROUTES.js"
  }
}
```

---

### Tâche 2 : Validation des Chemins d'Images

**Fichiers à modifier** :
- `frontend/utils/imageUtils.ts`
- `frontend/pages/explorer.tsx`
- `frontend/pages/dashboard/visiteur.tsx`

**Actions à réaliser** :
1. Créer fonction `validateImagePath()` avec vérification null/undefined
2. Logger automatiquement les chemins invalides
3. Retourner placeholder en fallback si image n'existe pas
4. Améliorer gestion d'erreur dans les composants

**Extrait de code à ajouter** :

```typescript
// frontend/utils/imageUtils.ts

/**
 * Valide qu'un chemin d'image est valide et existe
 * @param imagePath - Chemin de l'image à valider
 * @param fallback - Chemin de fallback si invalide
 * @returns Chemin validé ou fallback
 */
export function validateImagePath(
  imagePath: string | null | undefined,
  fallback: string = '/images/default/placeholder.jpg'
): string {
  // Vérifier null/undefined
  if (!imagePath || imagePath === 'null' || imagePath === 'undefined') {
    console.warn('[IMAGE UTILS] ⚠️ Chemin d\'image null/undefined, utilisation du fallback');
    return fallback;
  }

  // Vérifier chaîne vide
  if (typeof imagePath !== 'string' || imagePath.trim() === '') {
    console.warn('[IMAGE UTILS] ⚠️ Chemin d\'image vide, utilisation du fallback');
    return fallback;
  }

  // Vérifier si c'est une URL externe (http/https)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath; // URLs externes sont toujours valides
  }

  // Vérifier si le chemin commence par / (chemin absolu)
  if (!imagePath.startsWith('/')) {
    const correctedPath = `/${imagePath}`;
    console.warn(`[IMAGE UTILS] ⚠️ Chemin relatif corrigé: "${imagePath}" → "${correctedPath}"`);
    return correctedPath;
  }

  // Vérifier les patterns connus de chemins invalides
  const invalidPatterns = [
    '/placeholder-building.jpg',
    '/placeholder-unit.jpg',
    'placeholder-building.jpg',
    'placeholder-unit.jpg'
  ];

  if (invalidPatterns.includes(imagePath)) {
    console.warn(`[IMAGE UTILS] ⚠️ Chemin placeholder invalide détecté: "${imagePath}", utilisation du fallback`);
    return fallback;
  }

  return imagePath;
}

/**
 * Vérifie si une image existe côté client (approximation)
 * Note: Cette fonction ne peut pas vraiment vérifier l'existence du fichier,
 * mais peut détecter les patterns invalides connus
 */
export function checkImageExists(imagePath: string): boolean {
  // Pour les URLs externes, toujours considérer comme valides
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return true;
  }

  // Vérifier les patterns invalides
  const invalidPatterns = [
    '/placeholder-building.jpg',
    '/placeholder-unit.jpg',
    'placeholder-building.jpg',
    'placeholder-unit.jpg',
    'null',
    'undefined'
  ];

  return !invalidPatterns.some(pattern => imagePath.includes(pattern));
}

// Modifier getBuildingImagePath() pour utiliser validateImagePath
export function getBuildingImagePath(building: {
  _id?: string
  image?: string
  imageUrl?: string
}): string {
  // Priorité à imageUrl si elle existe et n'est pas vide
  if (building.imageUrl && typeof building.imageUrl === 'string' && building.imageUrl.trim() !== '') {
    const validatedPath = validateImagePath(building.imageUrl);
    
    if (validatedPath.startsWith('http')) {
      return validatedPath;
    }
    
    if (validatedPath.includes('uploads/') || validatedPath.startsWith('uploads/')) {
      return `/${validatedPath.startsWith('/') ? validatedPath.substring(1) : validatedPath}`;
    }
    
    if (validatedPath.includes('immeubles/') || validatedPath.startsWith('immeubles/')) {
      const filename = validatedPath.split('/').pop() || validatedPath;
      return `/images/immeubles/${filename}`;
    }
    
    if (validatedPath.includes('/')) {
      return `/${validatedPath}`;
    }
    
    return `/images/immeubles/${validatedPath}`;
  }

  // Ensuite, vérifier le champ 'image'
  if (building.image && typeof building.image === 'string' && building.image.trim() !== '') {
    const validatedPath = validateImagePath(building.image);
    
    if (validatedPath.startsWith('http')) {
      return validatedPath;
    }
    
    if (validatedPath.includes('uploads/') || validatedPath.startsWith('uploads/')) {
      return `/${validatedPath.startsWith('/') ? validatedPath.substring(1) : validatedPath}`;
    }
    
    if (validatedPath.includes('immeubles/') || validatedPath.startsWith('immeubles/')) {
      const filename = validatedPath.split('/').pop() || validatedPath;
      return `/images/immeubles/${filename}`;
    }
    
    if (validatedPath.includes('/')) {
      return `/${validatedPath}`;
    }
    
    return `/images/immeubles/${validatedPath}`;
  }

  // Si on a un _id mais pas d'image locale, essayer de mapper avec les images disponibles
  if (building._id) {
    const buildingId = building._id.toString();
    const hash = buildingId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const imageIndex = hash % AVAILABLE_BUILDING_IMAGES.length;
    const selectedImage = AVAILABLE_BUILDING_IMAGES[imageIndex];
    
    if (selectedImage) {
      return `/images/immeubles/${selectedImage}`;
    }
  }

  // Fallback : utiliser la première image disponible ou placeholder
  if (AVAILABLE_BUILDING_IMAGES.length > 0) {
    return `/images/immeubles/${AVAILABLE_BUILDING_IMAGES[0]}`;
  }

  return '/images/default/placeholder.jpg';
}

// Modifier getUnitImagePath() de la même manière
export function getUnitImagePath(unit: {
  _id?: string
  imageUrl?: string
  images?: string[]
  unitNumber?: string
}): string {
  // Même logique avec validateImagePath()
  // ... (code similaire à getBuildingImagePath)
  
  return '/images/default/placeholder.jpg';
}
```

**Modification dans `frontend/pages/explorer.tsx`** :

```typescript
// Ajouter import
import { getBuildingImagePath, getUnitImagePath, validateImagePath } from '../utils/imageUtils'

// Dans le composant, améliorer la gestion d'erreur
<Image
  src={validateImagePath(getBuildingImagePath(building))}
  alt={building.name.replace('[EXEMPLE]', '').trim()}
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  unoptimized={true}
  priority={false}
  onError={(e) => {
    const target = e.target as HTMLImageElement
    const fallback = '/images/default/placeholder.jpg'
    console.warn(`[EXPLORER] ⚠️ Erreur chargement image: ${target.src}, utilisation fallback`)
    if (!target.src.includes('placeholder.jpg')) {
      target.src = fallback
    }
  }}
/>
```

**Commandes à exécuter** :

```bash
# Vérifier que les images existent
cd frontend
ls -la public/images/default/placeholder.jpg
ls -la public/images/immeubles/
ls -la public/images/unites/

# Si placeholder manquant, créer le dossier
mkdir -p public/images/default
# Copier une image placeholder ou créer un fichier vide
```

---

### Tâche 3 : Tests E2E Automatisés

**Fichiers à créer** :
- `frontend/e2e/playwright.config.ts` (ou `cypress.config.js`)
- `frontend/e2e/tests/explorer.spec.ts`
- `frontend/e2e/tests/auth.spec.ts`
- `frontend/e2e/tests/buildings.spec.ts`

**Actions à réaliser** :
1. Installer Playwright ou Cypress
2. Configurer les tests E2E
3. Créer tests pour flux critiques
4. Intégrer dans CI/CD (optionnel)

**Option 1 : Playwright (Recommandé)**

**Commandes à exécuter** :

```bash
cd frontend
npm install --save-dev @playwright/test
npx playwright install
```

**Configuration** : `frontend/e2e/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Test Explorer** : `frontend/e2e/tests/explorer.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Page Explorer', () => {
  test('devrait charger la page Explorer', async ({ page }) => {
    await page.goto('/explorer');
    await expect(page.locator('h1')).toContainText('Explorer');
  });

  test('devrait afficher les immeubles', async ({ page }) => {
    await page.goto('/explorer');
    // Attendre que les immeubles se chargent
    await page.waitForSelector('[data-testid="building-card"]', { timeout: 10000 });
    const buildings = await page.locator('[data-testid="building-card"]').count();
    expect(buildings).toBeGreaterThan(0);
  });

  test('devrait naviguer vers les détails d\'un immeuble', async ({ page }) => {
    await page.goto('/explorer');
    await page.waitForSelector('[data-testid="building-card"]');
    
    // Cliquer sur "Voir les détails"
    const firstBuilding = page.locator('[data-testid="building-card"]').first();
    await firstBuilding.locator('text=Voir les détails').click();
    
    // Vérifier qu'on est sur la page de détails
    await expect(page).toHaveURL(/\/buildings\/[a-f0-9]+/);
  });

  test('devrait filtrer les unités', async ({ page }) => {
    await page.goto('/explorer');
    await page.waitForSelector('[data-testid="units-section"]');
    
    // Cliquer sur l'onglet Unités
    await page.click('text=Unités');
    
    // Vérifier que les unités s'affichent
    await page.waitForSelector('[data-testid="unit-card"]', { timeout: 5000 });
    const units = await page.locator('[data-testid="unit-card"]').count();
    expect(units).toBeGreaterThan(0);
  });
});
```

**Test Auth** : `frontend/e2e/tests/auth.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentification', () => {
  test('devrait se connecter avec des identifiants valides', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'admin@moncondo.com');
    await page.fill('input[type="password"]', 'administrateur');
    await page.click('button[type="submit"]');
    
    // Attendre la redirection
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('devrait afficher une erreur avec des identifiants invalides', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Attendre le message d'erreur
    await page.waitForSelector('.error-message, [role="alert"]', { timeout: 3000 });
    const errorMessage = await page.locator('.error-message, [role="alert"]').textContent();
    expect(errorMessage).toBeTruthy();
  });
});
```

**Ajouter dans `frontend/package.json`** :

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

**Option 2 : Cypress**

**Commandes à exécuter** :

```bash
cd frontend
npm install --save-dev cypress
npx cypress open
```

**Configuration** : `frontend/cypress.config.js`

```javascript
const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
})
```

---

## 🟡 PRIORITÉ MOYENNE

### Tâche 4 : Mise à Jour Next.js

**Fichiers à modifier** :
- `frontend/package.json`
- `frontend/next.config.js`

**Actions à réaliser** :
1. Mettre à jour Next.js vers 15+
2. Mettre à jour React et React-DOM
3. Tester toutes les fonctionnalités
4. Ajuster configuration si nécessaire

**Commandes à exécuter** :

```bash
cd frontend

# Vérifier les versions actuelles
npm list next react react-dom

# Mettre à jour vers Next.js 15
npm install next@latest react@latest react-dom@latest

# Vérifier les breaking changes
npm outdated

# Tester le build
npm run build

# Tester en développement
npm run dev
```

**Modifications dans `frontend/next.config.js`** :

```javascript
const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 15+ utilise Turbopack par défaut en dev (expérimental)
  // swcMinify est toujours activé par défaut
  
  // Optimisations de performance
  compress: true,
  poweredByHeader: false,
  
  // Configuration webpack (identique)
  webpack: (config, { isServer }) => {
    // ... (code existant)
  },
  
  // Images configuration (identique)
  images: {
    // ... (code existant)
  },
  
  // Rewrites (identique)
  async rewrites() {
    // ... (code existant)
  },
}

module.exports = nextConfig
```

**Checklist de test après mise à jour** :

- [ ] Page d'accueil charge
- [ ] Page Explorer fonctionne
- [ ] Authentification fonctionne
- [ ] Google Maps s'affiche
- [ ] Upload d'images fonctionne
- [ ] Socket.io fonctionne
- [ ] Navigation entre pages fonctionne
- [ ] Build production réussit

---

### Tâche 5 : Optimisation Performance Build

**Fichiers à modifier** :
- `frontend/next.config.js`
- `frontend/package.json` (scripts)

**Actions à réaliser** :
1. Augmenter mémoire Node.js si nécessaire
2. Optimiser code splitting
3. Activer Turbopack si compatible (Next.js 15+)

**Modifications dans `frontend/next.config.js`** :

```javascript
const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Optimisations expérimentales
  experimental: {
    optimizeCss: false, // Désactivé pour éviter OOM
    // Turbopack (Next.js 15+)
    // turbo: {
    //   rules: {
    //     '*.svg': {
    //       loaders: ['@svgr/webpack'],
    //       as: '*.js',
    //     },
    //   },
    // },
  },
  
  // Optimisations de performance
  compress: true,
  poweredByHeader: false,
  
  // Webpack optimizations améliorées
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Google Maps chunk
            googleMaps: {
              name: 'google-maps',
              test: /[\\/]node_modules[\\/]@react-google-maps[\\/]/,
              priority: 20,
              reuseExistingChunk: true,
            },
            // Socket.io chunk
            socketio: {
              name: 'socketio',
              test: /[\\/]node_modules[\\/]socket\.io-client[\\/]/,
              priority: 19,
              reuseExistingChunk: true,
            },
            // Composants lourds
            heavyComponents: {
              name: 'heavy-components',
              test: /[\\/]components[\\/](maps|documents|payments|chat)[\\/]/,
              priority: 15,
              reuseExistingChunk: true,
            },
            // React et React-DOM
            react: {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              priority: 18,
              reuseExistingChunk: true,
            },
            // Librairies communes
            common: {
              name: 'common',
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      }
    }
    
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    }
    
    return config
  },
  
  // ... reste de la config
}

module.exports = nextConfig
```

**Modifications dans `frontend/package.json`** :

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:turbo": "next dev --turbo",
    "build": "NODE_OPTIONS='--max-old-space-size=4096' next build",
    "build:analyze": "ANALYZE=true next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

**Script PowerShell pour build optimisé** : `frontend/build-optimized.ps1`

```powershell
# frontend/build-optimized.ps1
$env:NODE_OPTIONS = "--max-old-space-size=4096"
Write-Host "🔨 Build optimisé avec 4GB de mémoire..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build réussi !" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur lors du build" -ForegroundColor Red
    exit 1
}
```

**Commandes à exécuter** :

```bash
# Windows PowerShell
cd frontend
.\build-optimized.ps1

# Linux/Mac
cd frontend
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Analyser le bundle
npm install --save-dev @next/bundle-analyzer
# Ajouter dans next.config.js:
# const withBundleAnalyzer = require('@next/bundle-analyzer')({
#   enabled: process.env.ANALYZE === 'true',
# })
```

---

### Tâche 6 : Documentation API Complète

**Fichiers à créer** :
- `backend/API_DOCUMENTATION.md`

**Actions à réaliser** :
1. Documenter toutes les routes API
2. Ajouter exemples de requêtes/réponses
3. Documenter codes d'erreur
4. Optionnel : Swagger UI

**Structure du document** : `backend/API_DOCUMENTATION.md`

```markdown
# 📚 Documentation API - MonCondo+

**Version** : 1.0  
**Base URL** : `http://localhost:5000/api`

---

## Table des Matières

1. [Authentification](#authentification)
2. [Immeubles](#immeubles)
3. [Unités](#unités)
4. [Demandes](#demandes)
5. [Paiements](#paiements)
6. [Messages](#messages)
7. [Documents](#documents)
8. [Utilisateurs](#utilisateurs)

---

## Authentification

### POST /auth/register

Créer un nouveau compte utilisateur.

**Body** :
```json
{
  "firstName": "Jean",
  "lastName": "Dupont",
  "email": "jean.dupont@example.com",
  "password": "password123",
  "phone": "514-123-4567",
  "role": "visiteur"
}
```

**Réponse 201** :
```json
{
  "success": true,
  "message": "Utilisateur créé avec succès",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "firstName": "Jean",
      "lastName": "Dupont",
      "email": "jean.dupont@example.com",
      "role": "visiteur"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Erreurs** :
- `400` : Données invalides
- `409` : Email déjà utilisé

---

### POST /auth/login

Se connecter avec email et mot de passe.

**Body** :
```json
{
  "email": "admin@moncondo.com",
  "password": "administrateur"
}
```

**Réponse 200** :
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "firstName": "Admin",
      "lastName": "Système",
      "email": "admin@moncondo.com",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Erreurs** :
- `401` : Identifiants invalides
- `400` : Données manquantes

---

## Immeubles

### GET /public/buildings

Récupérer la liste publique des immeubles (sans authentification).

**Réponse 200** :
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Résidence Les Jardins",
      "address": {
        "street": "123 Rue Principale",
        "city": "Montréal",
        "province": "QC",
        "postalCode": "H1A 1A1"
      },
      "yearBuilt": 2015,
      "totalUnits": 4,
      "description": "Immeuble moderne avec vue sur le fleuve"
    }
  ]
}
```

---

### GET /buildings

Récupérer la liste des immeubles (authentification requise).

**Headers** :
```
Authorization: Bearer <token>
```

**Réponse 200** : Identique à `/public/buildings`

**Erreurs** :
- `401` : Non authentifié
- `403` : Accès refusé

---

### GET /buildings/:id

Récupérer les détails d'un immeuble.

**Headers** :
```
Authorization: Bearer <token>
```

**Réponse 200** :
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Résidence Les Jardins",
    "address": {
      "street": "123 Rue Principale",
      "city": "Montréal",
      "province": "QC",
      "postalCode": "H1A 1A1"
    },
    "admin": {
      "_id": "507f1f77bcf86cd799439012",
      "firstName": "Admin",
      "lastName": "Système",
      "email": "admin@moncondo.com"
    },
    "yearBuilt": 2015,
    "totalUnits": 4,
    "units": [...]
  }
}
```

**Erreurs** :
- `404` : Immeuble non trouvé
- `401` : Non authentifié

---

### POST /buildings

Créer un nouvel immeuble (admin uniquement).

**Headers** :
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body** (FormData) :
```
name: Résidence Les Jardins
address.street: 123 Rue Principale
address.city: Montréal
address.province: QC
address.postalCode: H1A 1A1
yearBuilt: 2015
description: Immeuble moderne
image: <file>
```

**Réponse 201** :
```json
{
  "success": true,
  "message": "Immeuble créé avec succès",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Résidence Les Jardins",
    ...
  }
}
```

**Erreurs** :
- `400` : Données invalides
- `401` : Non authentifié
- `403` : Accès refusé (pas admin)

---

## Codes d'Erreur Généraux

- `200` : Succès
- `201` : Créé avec succès
- `400` : Requête invalide
- `401` : Non authentifié
- `403` : Accès refusé
- `404` : Ressource non trouvée
- `500` : Erreur serveur

---

## Authentification

Toutes les routes protégées nécessitent un header `Authorization` :

```
Authorization: Bearer <token>
```

Le token est obtenu via `/auth/login` ou `/auth/register`.

---

## Rate Limiting

- **Publique** : 100 requêtes/heure
- **Authentifiée** : 1000 requêtes/heure
- **Admin** : Illimité

---

## Support

Pour toute question, contactez : support@moncondo.com
```

**Optionnel : Swagger UI**

**Installation** :

```bash
cd backend
npm install swagger-ui-express swagger-jsdoc
```

**Configuration** : `backend/config/swagger.js`

```javascript
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MonCondo+ API',
      version: '1.0.0',
      description: 'API documentation for MonCondo+',
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server',
      },
    ],
  },
  apis: ['./routes/*.js'], // Paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };
```

**Intégration dans `backend/server.js`** :

```javascript
const { swaggerUi, specs } = require('./config/swagger');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
```

---

## 🟢 PRIORITÉ BASSE

### Tâche 7 : Amélioration Gestion Erreurs Socket.io

**Fichiers à modifier** :
- `frontend/contexts/SocketContext.tsx`

**Actions à réaliser** :
1. Ajouter reconnexion automatique avec backoff exponentiel
2. Améliorer gestion des erreurs `connect_error` et `disconnect`
3. Ajouter retry logic

**Modifications dans `frontend/contexts/SocketContext.tsx`** :

```typescript
import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
const SOCKET_URL = API_URL

// Configuration de reconnexion avec backoff exponentiel
const RECONNECTION_CONFIG = {
  initialDelay: 1000,      // 1 seconde
  maxDelay: 30000,          // 30 secondes max
  multiplier: 2,            // Double à chaque tentative
  maxAttempts: 10           // 10 tentatives max
}

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
  onlineUsers: Map<string, any>
  reconnectAttempts: number
  connect: () => void
  disconnect: () => void
  sendMessage: (data: {
    receiver: string
    content: string
    conversationId?: string
    unit?: string
    building?: string
    attachments?: any[]
  }) => void
  joinConversation: (conversationId: string) => void
  leaveConversation: (conversationId: string) => void
  markAsRead: (conversationId: string) => void
  sendTyping: (conversationId: string, isTyping: boolean) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Map<string, any>>(new Map())
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const socketRef = useRef<Socket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)

  // Calculer le délai de reconnexion avec backoff exponentiel
  const getReconnectDelay = useCallback((attempt: number): number => {
    const delay = RECONNECTION_CONFIG.initialDelay * Math.pow(RECONNECTION_CONFIG.multiplier, attempt)
    return Math.min(delay, RECONNECTION_CONFIG.maxDelay)
  }, [])

  // Fonction de reconnexion avec backoff exponentiel
  const attemptReconnect = useCallback(() => {
    if (!isAuthenticated || !user) {
      console.log('[SOCKET] Reconnexion annulée - utilisateur non authentifié')
      return
    }

    if (reconnectAttemptsRef.current >= RECONNECTION_CONFIG.maxAttempts) {
      console.error('[SOCKET] ❌ Nombre maximum de tentatives de reconnexion atteint')
      setReconnectAttempts(RECONNECTION_CONFIG.maxAttempts)
      return
    }

    const delay = getReconnectDelay(reconnectAttemptsRef.current)
    console.log(`[SOCKET] 🔄 Tentative de reconnexion ${reconnectAttemptsRef.current + 1}/${RECONNECTION_CONFIG.maxAttempts} dans ${delay}ms`)

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++
      setReconnectAttempts(reconnectAttemptsRef.current)
      connect()
    }, delay)
  }, [isAuthenticated, user, getReconnectDelay])

  const connect = useCallback(() => {
    if (!isAuthenticated || !user) {
      console.log('[SOCKET] Non authentifié, connexion annulée')
      return
    }

    if (socketRef.current?.connected) {
      console.log('[SOCKET] Déjà connecté')
      return
    }

    const token = localStorage.getItem('authToken')
    if (!token) {
      console.error('[SOCKET] Token manquant')
      return
    }

    // Nettoyer la reconnexion précédente
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    console.log('[SOCKET] Connexion en cours...')

    const newSocket = io(SOCKET_URL, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: RECONNECTION_CONFIG.initialDelay,
      reconnectionDelayMax: RECONNECTION_CONFIG.maxDelay,
      reconnectionAttempts: RECONNECTION_CONFIG.maxAttempts,
      timeout: 20000,
    })

    newSocket.on('connect', () => {
      console.log('[SOCKET] ✅ Connecté:', newSocket.id)
      setIsConnected(true)
      setSocket(newSocket)
      socketRef.current = newSocket
      reconnectAttemptsRef.current = 0
      setReconnectAttempts(0)
    })

    newSocket.on('disconnect', (reason) => {
      console.log('[SOCKET] ❌ Déconnecté:', reason)
      setIsConnected(false)

      // Reconnexion automatique seulement si ce n'est pas une déconnexion manuelle
      if (reason === 'io server disconnect') {
        // Le serveur a déconnecté, reconnecter manuellement
        console.log('[SOCKET] 🔄 Tentative de reconnexion après déconnexion serveur')
        attemptReconnect()
      } else if (reason === 'io client disconnect') {
        // Déconnexion manuelle, ne pas reconnecter
        console.log('[SOCKET] Déconnexion manuelle, pas de reconnexion')
      } else {
        // Autres raisons (transport close, etc.), reconnecter automatiquement
        console.log('[SOCKET] 🔄 Tentative de reconnexion automatique')
        attemptReconnect()
      }
    })

    newSocket.on('connect_error', (error) => {
      // Ignorer l'erreur "Invalid namespace" si l'utilisateur n'est pas authentifié
      if (error.message.includes('Invalid namespace') || error.message.includes('Authentication')) {
        console.log('[SOCKET] Connexion requiert authentification')
        setIsConnected(false)
        return
      }

      console.error('[SOCKET] Erreur de connexion:', error.message)
      setIsConnected(false)

      // Tentative de reconnexion avec backoff exponentiel
      if (reconnectAttemptsRef.current < RECONNECTION_CONFIG.maxAttempts) {
        attemptReconnect()
      }
    })

    // Écouter les événements de messages pour debug
    newSocket.on('message:received', (data) => {
      console.log('[SOCKET] 📨 Message reçu:', data.message?.content?.substring(0, 50))
    })

    newSocket.on('message:sent', (data) => {
      console.log('[SOCKET] ✅ Message confirmé envoyé:', data.message?.content?.substring(0, 50))
    })

    newSocket.on('message:error', (error) => {
      console.error('[SOCKET] ❌ Erreur message:', error.error)
    })

    newSocket.on('conversation:joined', (data) => {
      console.log('[SOCKET] ✅ Conversation jointe:', data.conversationId)
    })

    newSocket.on('user:online', (data: { userId: string; firstName?: string; lastName?: string; role?: string }) => {
      setOnlineUsers(prev => {
        const newMap = new Map(prev)
        newMap.set(data.userId, data)
        return newMap
      })
    })

    newSocket.on('user:offline', (data: { userId: string }) => {
      setOnlineUsers(prev => {
        const newMap = new Map(prev)
        newMap.delete(data.userId)
        return newMap
      })
    })

    setSocket(newSocket)
    socketRef.current = newSocket
  }, [isAuthenticated, user, attemptReconnect])

  const disconnect = useCallback(() => {
    // Nettoyer les timeouts de reconnexion
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      setSocket(null)
      setIsConnected(false)
      reconnectAttemptsRef.current = 0
      setReconnectAttempts(0)
      console.log('[SOCKET] Déconnexion manuelle')
    }
  }, [])

  // ... reste du code (sendMessage, joinConversation, etc.) identique

  useEffect(() => {
    if (isAuthenticated && user) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [isAuthenticated, user, connect, disconnect])

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        reconnectAttempts,
        connect,
        disconnect,
        sendMessage,
        joinConversation,
        leaveConversation,
        markAsRead,
        sendTyping
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}
```

---

### Tâche 8 : Tests Unitaires Composants

**Fichiers à créer** :
- `frontend/__tests__/`
- `frontend/jest.config.js`
- `frontend/setupTests.ts`

**Actions à réaliser** :
1. Installer Jest + React Testing Library
2. Configurer Jest
3. Créer tests unitaires pour composants critiques
4. Objectif : 70%+ coverage

**Commandes à exécuter** :

```bash
cd frontend
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom @types/jest
```

**Configuration** : `frontend/jest.config.js`

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'pages/**/*.{js,jsx,ts,tsx}',
    'utils/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
```

**Setup** : `frontend/setupTests.ts`

```typescript
import '@testing-library/jest-dom'
```

**Test exemple** : `frontend/__tests__/utils/imageUtils.test.ts`

```typescript
import { validateImagePath, getBuildingImagePath, getUnitImagePath } from '../../utils/imageUtils'

describe('imageUtils', () => {
  describe('validateImagePath', () => {
    it('devrait retourner le fallback pour null', () => {
      const result = validateImagePath(null)
      expect(result).toBe('/images/default/placeholder.jpg')
    })

    it('devrait retourner le fallback pour undefined', () => {
      const result = validateImagePath(undefined)
      expect(result).toBe('/images/default/placeholder.jpg')
    })

    it('devrait retourner le chemin corrigé pour un chemin relatif', () => {
      const result = validateImagePath('images/test.jpg')
      expect(result).toBe('/images/test.jpg')
    })

    it('devrait retourner le chemin tel quel pour une URL externe', () => {
      const result = validateImagePath('https://example.com/image.jpg')
      expect(result).toBe('https://example.com/image.jpg')
    })
  })

  describe('getBuildingImagePath', () => {
    it('devrait retourner le placeholder pour un building sans image', () => {
      const building = { _id: '123' }
      const result = getBuildingImagePath(building)
      expect(result).toContain('placeholder.jpg')
    })

    it('devrait retourner le chemin imageUrl si présent', () => {
      const building = {
        _id: '123',
        imageUrl: '/images/immeubles/test.jpg'
      }
      const result = getBuildingImagePath(building)
      expect(result).toBe('/images/immeubles/test.jpg')
    })
  })
})
```

**Test composant** : `frontend/__tests__/components/Toast.test.tsx`

```typescript
import { render, screen } from '@testing-library/react'
import Toast from '../../components/Toast'

describe('Toast', () => {
  it('devrait afficher le message', () => {
    render(<Toast message="Test message" type="success" />)
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('devrait afficher l\'icône de succès', () => {
    render(<Toast message="Success" type="success" />)
    expect(screen.getByText('✅')).toBeInTheDocument()
  })
})
```

**Ajouter dans `frontend/package.json`** :

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

## 📋 Ordre de Résolution Optimisé

1. **Tâche 1** : Vérification admin (30 min) - **CRITIQUE** pour les tests
2. **Tâche 2** : Validation images (1 h) - **CRITIQUE** pour l'affichage
3. **Tâche 4** : MAJ Next.js (2-3 h) - **RECOMMANDÉ** avant autres optimisations
4. **Tâche 5** : Optimisation build (2 h) - Après MAJ Next.js
5. **Tâche 3** : Tests E2E (4-6 h) - Après stabilisation
6. **Tâche 6** : Documentation API (3-4 h) - Peut être fait en parallèle
7. **Tâche 7** : Socket.io (1-2 h) - Amélioration non critique
8. **Tâche 8** : Tests unitaires (6-8 h) - Long terme

---

## 🚀 Scripts d'Exécution

### Script PowerShell : `EXECUTER_PLAN_TRAVAIL.ps1`

```powershell
# EXECUTER_PLAN_TRAVAIL.ps1
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PLAN DE TRAVAIL MONCONDO+" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

$tasks = @(
    @{ Name = "1. Vérification admin"; Script = "cd backend; node check-admin.js"; Duration = "30 min" },
    @{ Name = "2. Validation images"; Script = "cd frontend; npm run test"; Duration = "1 h" },
    @{ Name = "3. Tests E2E"; Script = "cd frontend; npm run test:e2e"; Duration = "4-6 h" },
    @{ Name = "4. MAJ Next.js"; Script = "cd frontend; npm install next@latest"; Duration = "2-3 h" },
    @{ Name = "5. Optimisation build"; Script = "cd frontend; npm run build"; Duration = "2 h" },
    @{ Name = "6. Documentation API"; Script = "echo 'Voir API_DOCUMENTATION.md'"; Duration = "3-4 h" },
    @{ Name = "7. Socket.io"; Script = "cd frontend; npm run test"; Duration = "1-2 h" },
    @{ Name = "8. Tests unitaires"; Script = "cd frontend; npm run test:coverage"; Duration = "6-8 h" }
)

foreach ($task in $tasks) {
    Write-Host "`n📋 $($task.Name) ($($task.Duration))" -ForegroundColor Yellow
    Write-Host "   Commande: $($task.Script)" -ForegroundColor Gray
    $response = Read-Host "   Exécuter maintenant? (o/n)"
    if ($response -eq "o") {
        Invoke-Expression $task.Script
    }
}

Write-Host "`n✅ Plan de travail terminé !" -ForegroundColor Green
```

---

## 📊 Tableau Récapitulatif Final

| # | Priorité | Tâche | Fichiers | Durée | Commandes Principales |
|---|----------|-------|-----------|-------|----------------------|
| 1 | 🔴 | Vérification admin | `backend/TEST_API_ROUTES.js`, `backend/utils/seed.js` | 30 min | `cd backend && node check-admin.js` |
| 2 | 🔴 | Validation images | `frontend/utils/imageUtils.ts`, `frontend/pages/explorer.tsx` | 1 h | `cd frontend && npm run test` |
| 3 | 🔴 | Tests E2E | `frontend/e2e/` | 4-6 h | `cd frontend && npm run test:e2e` |
| 4 | 🟡 | MAJ Next.js | `frontend/package.json`, `frontend/next.config.js` | 2-3 h | `cd frontend && npm install next@latest` |
| 5 | 🟡 | Optimisation build | `frontend/next.config.js` | 2 h | `cd frontend && npm run build` |
| 6 | 🟡 | Documentation API | `backend/API_DOCUMENTATION.md` | 3-4 h | Création manuelle |
| 7 | 🟢 | Socket.io | `frontend/contexts/SocketContext.tsx` | 1-2 h | `cd frontend && npm run test` |
| 8 | 🟢 | Tests unitaires | `frontend/__tests__/` | 6-8 h | `cd frontend && npm run test:coverage` |

**Durée totale** : 19-26 heures

---

## ✅ Checklist de Validation

Après chaque tâche, vérifier :

- [ ] Code compilé sans erreurs
- [ ] Tests passent (si applicable)
- [ ] Fonctionnalités existantes toujours opérationnelles
- [ ] Pas de régressions
- [ ] Documentation mise à jour

---

**Document créé le** : 2025-01-27  
**Dernière mise à jour** : 2025-01-27  
**Statut** : ✅ Prêt pour exécution

