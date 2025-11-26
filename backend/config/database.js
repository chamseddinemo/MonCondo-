const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // URI MongoDB par défaut (MongoDB Atlas)
    const defaultMongoURI = 'mongodb+srv://db_user:dbuser@cluster0.kohukjc.mongodb.net/MonCondo+?retryWrites=true&w=majority';
    
    // Utiliser MONGODB_URI depuis .env ou la valeur par défaut
    const mongoURI = process.env.MONGODB_URI || defaultMongoURI;
    
    console.log('[DATABASE] 🔄 Tentative de connexion à MongoDB...');
    console.log('[DATABASE] URI:', mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Masquer les credentials
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000, // Timeout de 15 secondes
      socketTimeoutMS: 45000, // Timeout socket de 45 secondes
      connectTimeoutMS: 15000, // Timeout de connexion de 15 secondes
    });

    console.log(`[DATABASE] ✅ MongoDB connecté: ${conn.connection.host}`);
    console.log(`[DATABASE] 📊 Base de données: ${conn.connection.name}`);
    
    // Gérer les événements de connexion
    mongoose.connection.on('error', (err) => {
      console.error('[DATABASE] ❌ Erreur MongoDB:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('[DATABASE] ⚠️ MongoDB déconnecté');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('[DATABASE] ✅ MongoDB reconnecté');
    });
    
  } catch (error) {
    console.error(`[DATABASE] ❌ Erreur de connexion MongoDB: ${error.message}`);
    
    // Détecter le type d'erreur et fournir des solutions spécifiques
    if (error.message.includes('ECONNREFUSED') || error.message.includes('127.0.0.1') || error.message.includes('::1')) {
      console.warn('[DATABASE] ⚠️ MongoDB local non disponible.');
      console.warn('[DATABASE] 💡 Solutions:');
      console.warn('   1. Démarrer MongoDB local: mongod');
      console.warn('   2. Utiliser MongoDB Atlas (voir instructions ci-dessous)');
    } else if (error.message.includes('whitelist') || error.message.includes('IP')) {
      console.warn('[DATABASE] ⚠️ Votre IP n\'est pas autorisée dans MongoDB Atlas.');
      console.warn('[DATABASE] 💡 Solution: Ajoutez votre IP à la whitelist MongoDB Atlas');
      console.warn('   1. Allez sur https://cloud.mongodb.com');
      console.warn('   2. Sélectionnez votre cluster');
      console.warn('   3. Cliquez sur "Network Access" dans le menu de gauche');
      console.warn('   4. Cliquez sur "Add IP Address"');
      console.warn('   5. Ajoutez votre IP actuelle ou 0.0.0.0/0 pour autoriser toutes les IPs');
      console.warn('   6. Attendez 1-2 minutes que les changements prennent effet');
      console.warn('   7. Redémarrez le serveur backend');
      
      // Essayer de récupérer l'IP publique pour aider l'utilisateur
      try {
        const https = require('https');
        https.get('https://api.ipify.org', (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            console.warn(`[DATABASE] 💡 Votre IP publique semble être: ${data}`);
            console.warn(`[DATABASE] 💡 Ajoutez cette IP dans MongoDB Atlas Network Access`);
          });
        }).on('error', () => {
          // Ignorer l'erreur si on ne peut pas récupérer l'IP
        });
      } catch (e) {
        // Ignorer l'erreur
      }
    } else if (error.message.includes('authentication failed')) {
      console.warn('[DATABASE] ⚠️ Échec d\'authentification MongoDB.');
      console.warn('[DATABASE] 💡 Vérifiez les credentials dans MONGODB_URI');
    } else if (error.message.includes('timeout')) {
      console.warn('[DATABASE] ⚠️ Timeout de connexion.');
      console.warn('[DATABASE] 💡 Vérifiez votre connexion internet et les paramètres de réseau');
    }
    
    console.warn('[DATABASE] ⚠️  Le serveur continue sans MongoDB - Certaines fonctionnalités seront limitées');
    console.warn('[DATABASE] 💡 Pour activer MongoDB, configurez MONGODB_URI dans le fichier .env');
    console.warn('[DATABASE] 💡 Ou configurez MongoDB Atlas Network Access pour autoriser votre IP');
    
    // Ne pas arrêter le serveur - continuer en mode dégradé
    // process.exit(1);
  }
};

module.exports = connectDB;

