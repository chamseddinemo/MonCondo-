// Script pour vérifier si l'utilisateur admin existe, sinon le créer
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const User = require('./models/User');

async function checkAdmin() {
  try {
    console.log('🔍 Vérification de l\'utilisateur admin...\n');
    
    // Connexion à la base de données
    await connectDB();
    
    // Attendre que la connexion soit établie
    if (mongoose.connection.readyState !== 1) {
      console.log('⏳ Attente de la connexion à MongoDB...');
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
        setTimeout(() => {
          if (mongoose.connection.readyState !== 1) {
            console.error('❌ Timeout de connexion à MongoDB');
            process.exit(1);
          }
        }, 10000);
      });
    }

    // Vérifier si admin existe
    const existingAdmin = await User.findOne({ email: 'admin@moncondo.com' });
    
    if (existingAdmin) {
      console.log('✅ Utilisateur admin trouvé dans la base de données');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Nom: ${existingAdmin.firstName} ${existingAdmin.lastName}`);
      console.log(`   Rôle: ${existingAdmin.role}`);
      console.log(`   Actif: ${existingAdmin.isActive ? 'Oui' : 'Non'}\n`);
      process.exit(0);
    }

    // Créer l'admin si absent
    console.log('⚠️ Utilisateur admin non trouvé. Création en cours...\n');
    
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'Système',
      email: 'admin@moncondo.com',
      password: 'administrateur', // Sera hashé automatiquement par le pre-save hook
      phone: '514-123-4567',
      role: 'admin',
      isActive: true
    });

    console.log('✅ Utilisateur admin créé avec succès !');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Mot de passe: administrateur`);
    console.log(`   Nom: ${admin.firstName} ${admin.lastName}`);
    console.log(`   Rôle: ${admin.role}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la vérification/création de l\'admin:', error.message);
    console.error('\n💡 Solutions possibles:');
    console.error('   1. Vérifiez que MongoDB est démarré');
    console.error('   2. Vérifiez les variables d\'environnement (.env)');
    console.error('   3. Exécutez: npm run seed (pour créer tous les utilisateurs de test)');
    console.error('   4. Vérifiez la connexion internet si vous utilisez MongoDB Atlas\n');
    
    if (error.code === 11000) {
      console.error('   ⚠️ Erreur: Email déjà utilisé (peut-être créé entre-temps)');
    }
    
    process.exit(1);
  }
}

// Exécuter la vérification
checkAdmin();

