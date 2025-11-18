module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'votre_secret_jwt_super_securise_changez_en_production',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '30d'
};

