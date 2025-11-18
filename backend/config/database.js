const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://db_user:dbuser@cluster0.kohukjc.mongodb.net/MonCondo+', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB connecté: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Erreur de connexion MongoDB: ${error.message}`);
    console.warn('⚠️  Le serveur continue sans MongoDB - Certaines fonctionnalités seront limitées');
    console.warn('💡 Pour activer MongoDB, configurez MONGODB_URI dans le fichier .env');
    // Ne pas arrêter le serveur - continuer en mode dégradé
    // process.exit(1);
  }
};

module.exports = connectDB;

