# 🔐 IDENTIFIANTS DE CONNEXION - MONCONDO+

## ✅ Utilisateurs Disponibles

Après l'exécution du script `npm run seed`, les utilisateurs suivants sont créés :

### 👤 ADMINISTRATEUR
- **Email:** `admin@moncondo.com`
- **Mot de passe:** `administrateur`
- **Rôle:** Admin
- **Accès:** Toutes les fonctionnalités

### 👤 PROPRIÉTAIRES

#### Propriétaire 1
- **Email:** `jean.dupont@example.com`
- **Mot de passe:** `password123`
- **Rôle:** Propriétaire

#### Propriétaire 2
- **Email:** `marie.martin@example.com`
- **Mot de passe:** `password123`
- **Rôle:** Propriétaire

#### Propriétaire 3
- **Email:** `robert.beaulieu@example.com`
- **Mot de passe:** `password123`
- **Rôle:** Propriétaire

### 👤 LOCATAIRES

#### Locataire 1
- **Email:** `pierre.tremblay@example.com`
- **Mot de passe:** `password123`
- **Rôle:** Locataire

#### Locataire 2
- **Email:** `sophie.gagnon@example.com`
- **Mot de passe:** `password123`
- **Rôle:** Locataire

#### Locataire 3
- **Email:** `marc.lavoie@example.com`
- **Mot de passe:** `password123`
- **Rôle:** Locataire

### 👤 VISITEURS

#### Visiteur 1
- **Email:** `paul.lavoie@example.com`
- **Mot de passe:** `password123`
- **Rôle:** Visiteur

#### Visiteur 2
- **Email:** `lucie.roy@example.com`
- **Mot de passe:** `password123`
- **Rôle:** Visiteur

---

## 🚀 Pour Créer Ces Utilisateurs

Si les utilisateurs n'existent pas encore, exécutez :

```powershell
cd backend
npm run seed
```

---

## 📝 Notes Importantes

1. **Sécurité:** Changez ces mots de passe en production!
2. **Admin:** Utilisez `admin@moncondo.com` pour accéder au tableau de bord admin
3. **Test:** Tous les utilisateurs ont le mot de passe `password123` sauf l'admin qui a `administrateur`

---

## 🔍 Vérifier les Utilisateurs Existants

Pour voir tous les utilisateurs dans la base de données :

```powershell
cd backend
node scripts/list-users.js
```

