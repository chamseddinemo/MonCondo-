# Guide de configuration MongoDB Atlas

## Problème
Votre IP n'est pas autorisée dans MongoDB Atlas Network Access.

## Solution rapide

### Option 1: Autoriser toutes les IPs (pour développement) ⚡ RECOMMANDÉ
1. Allez sur https://cloud.mongodb.com
2. Connectez-vous à votre compte
3. Sélectionnez votre projet/cluster
4. Cliquez sur **'Network Access'** dans le menu de gauche
5. Cliquez sur **'Add IP Address'**
6. Cliquez sur **'Allow Access from Anywhere'** (0.0.0.0/0)
7. Cliquez sur **'Confirm'**
8. ⏳ Attendez 1-2 minutes que les changements prennent effet
9. Redémarrez le serveur backend

### Option 2: Autoriser uniquement votre IP (plus sécurisé) 🔒
1. Allez sur https://cloud.mongodb.com
2. Connectez-vous à votre compte
3. Sélectionnez votre projet/cluster
4. Cliquez sur **'Network Access'** dans le menu de gauche
5. Cliquez sur **'Add IP Address'**
6. Entrez votre IP publique: **142.118.16.244**
7. Cliquez sur **'Confirm'**
8. ⏳ Attendez 1-2 minutes que les changements prennent effet
9. Redémarrez le serveur backend

## Trouver votre IP publique
Visitez: https://www.whatismyip.com/

## Alternative: Utiliser MongoDB local
Si vous avez MongoDB installé localement:
1. Démarrez MongoDB: `mongod`
2. Mettez à jour `.env`: `MONGODB_URI=mongodb://localhost:27017/moncondo`
3. Redémarrez le serveur backend

## Vérification
Après avoir configuré MongoDB Atlas, redémarrez le serveur backend et vérifiez les logs. Vous devriez voir:
```
[DATABASE] ✅ MongoDB connecté: cluster0.kohukjc.mongodb.net
[DATABASE] 📊 Base de données: MonCondo+
```

