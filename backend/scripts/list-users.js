const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://db_user:dbuser@cluster0.kohukjc.mongodb.net/MonCondo+?retryWrites=true&w=majority';

async function listUsers() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000
    });

    const User = require('../models/User');
    const users = await User.find({}).select('email firstName lastName role isActive');

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  UTILISATEURS EXISTANTS DANS LA BASE DE DONNÉES');
    console.log('═══════════════════════════════════════════════════════════\n');

    if (users.length === 0) {
      console.log('❌ Aucun utilisateur trouvé dans la base de données.\n');
      console.log('💡 Pour créer des utilisateurs, exécutez:');
      console.log('   npm run seed\n');
    } else {
      console.log(`📊 Total: ${users.length} utilisateur(s)\n`);
      users.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   Nom: ${user.firstName} ${user.lastName}`);
        console.log(`   Rôle: ${user.role}`);
        console.log(`   Actif: ${user.isActive ? '✅' : '❌'}`);
        console.log('');
      });

      console.log('═══════════════════════════════════════════════════════════');
      console.log('  IDENTIFIANTS PAR DÉFAUT (si seed a été exécuté)');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log('👤 Admin:');
      console.log('   Email: admin@moncondo.com');
      console.log('   Mot de passe: administrateur\n');
      console.log('👤 Propriétaires:');
      console.log('   Email: proprietaire1@moncondo.com');
      console.log('   Mot de passe: password123\n');
      console.log('👤 Locataires:');
      console.log('   Email: locataire1@moncondo.com');
      console.log('   Mot de passe: password123\n');
      console.log('👤 Visiteurs:');
      console.log('   Email: visiteur1@moncondo.com');
      console.log('   Mot de passe: password123\n');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

listUsers();

