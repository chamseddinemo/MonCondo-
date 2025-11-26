const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/database');
const path = require('path');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

// Charger les variables d'environnement
dotenv.config();

// Connexion à la base de données
connectDB();

const app = express();
const server = http.createServer(app);

// Stocker io dans app.locals pour accès dans les routes
app.set('io', null); // Sera défini après création de io

// Configuration Socket.io avec CORS
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Stocker io dans app.set pour accès dans les routes
app.set('io', io);

// Stocker aussi dans global pour accès dans les contrôleurs
global.io = io;

// Middleware pour authentifier les connexions Socket.io
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Token d\'authentification manquant'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('Utilisateur non trouvé'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Token invalide'));
  }
});

// Stocker les utilisateurs en ligne
const onlineUsers = new Map();

// Fonction centralisée pour gérer les nouveaux messages (DÉFINIE AVANT le gestionnaire de connexion)
async function handleNewMessage(socket, data, io, onlineUsers) {
    try {
      const Message = require('./models/Message');
      const Conversation = require('./models/Conversation');

      if (!data.content || !data.content.trim()) {
        socket.emit('message:error', { error: 'Le contenu du message est requis' });
        return;
      }

      // Créer ou récupérer la conversation
      let conversation = null;
      if (data.conversationId) {
        conversation = await Conversation.findById(data.conversationId);
        if (!conversation) {
          socket.emit('message:error', { error: 'Conversation non trouvée' });
          return;
        }
        // S'assurer que l'utilisateur est dans les participants
        const isParticipant = conversation.participants.some(p => 
          p.toString() === socket.userId.toString()
        );
        if (!isParticipant) {
          socket.emit('message:error', { error: 'Vous n\'êtes pas autorisé à envoyer des messages dans cette conversation' });
          return;
        }
      } else if (data.receiver) {
        // Créer une nouvelle conversation si nécessaire
        const participants = [socket.userId.toString(), data.receiver.toString()].sort();
        conversation = await Conversation.findOne({
          participants: { $all: participants },
          type: 'direct'
        }).populate('participants');

        if (!conversation) {
          conversation = await Conversation.create({
            participants,
            type: 'direct'
          });
          console.log(`[SOCKET] Nouvelle conversation créée: ${conversation._id}`);
        }
      } else {
        socket.emit('message:error', { error: 'Destinataire ou conversation requis' });
        return;
      }

      // Déterminer le destinataire
      let receiverId = data.receiver;
      if (!receiverId && conversation.participants) {
        // Trouver l'autre participant (pas l'expéditeur)
        const otherParticipant = conversation.participants.find(p => 
          p.toString() !== socket.userId.toString()
        );
        receiverId = otherParticipant ? otherParticipant.toString() : null;
      }

      if (!receiverId) {
        socket.emit('message:error', { error: 'Destinataire non trouvé' });
        return;
      }

      // Créer le message
      const message = await Message.create({
        sender: socket.userId,
        receiver: receiverId,
        conversation: conversation._id,
        content: data.content.trim(),
        unit: data.unit || null,
        building: data.building || null,
        attachments: data.attachments || [],
        status: 'sent',
        isRead: false
      });

      // Synchroniser toutes les vues après la création du message
      try {
        const { syncAllMessageViews } = require('./services/messageSyncService');
        await syncAllMessageViews(message._id);
        console.log('[SOCKET] ✅ Synchronisation message terminée');
      } catch (syncError) {
        console.error('[SOCKET] ⚠️  Erreur synchronisation (non bloquante):', syncError);
      }

      // Populate le message avec toutes les données nécessaires
      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'firstName lastName email role _id')
        .populate('receiver', 'firstName lastName email role _id')
        .populate('unit', 'unitNumber')
        .populate('building', 'name')
        .lean();

      // Convertir _id en string pour le frontend
      if (populatedMessage) {
        populatedMessage._id = populatedMessage._id.toString();
        populatedMessage.sender._id = populatedMessage.sender._id.toString();
        populatedMessage.receiver._id = populatedMessage.receiver._id.toString();
        populatedMessage.conversation = conversation._id.toString();
        populatedMessage.createdAt = populatedMessage.createdAt.toISOString();
      }

      // Mettre à jour la conversation
      conversation.lastMessage = message._id;
      conversation.lastMessageAt = new Date();
      
      // Mettre à jour le compteur de messages non lus
      if (!conversation.unreadCount) {
        conversation.unreadCount = new Map();
      }
      
      // Incrémenter le compteur pour tous les participants sauf l'expéditeur
      conversation.participants.forEach(participantId => {
        const participantIdStr = participantId.toString();
        const senderIdStr = socket.userId.toString();
        if (participantIdStr !== senderIdStr) {
          const currentCount = conversation.unreadCount.get(participantIdStr) || 0;
          conversation.unreadCount.set(participantIdStr, currentCount + 1);
        }
      });
      
      await conversation.save();

      // Convertir la conversation pour l'envoi
      const conversationData = {
        _id: conversation._id.toString(),
        participants: conversation.participants.map(p => p.toString()),
        type: conversation.type,
        lastMessage: conversation.lastMessage.toString(),
        lastMessageAt: conversation.lastMessageAt.toISOString(),
        unreadCount: Object.fromEntries(conversation.unreadCount)
      };

      // S'assurer que tous les participants sont dans la room (AMÉLIORATION)
      const participantIds = conversation.participants.map(p => p.toString());
      participantIds.forEach(participantId => {
        // Trouver tous les sockets de cet utilisateur
        io.sockets.sockets.forEach((clientSocket) => {
          if (clientSocket.userId && clientSocket.userId.toString() === participantId) {
            clientSocket.join(`conversation:${conversation._id}`);
            console.log(`[SOCKET] ✅ Participant ${participantId} ajouté à la room conversation:${conversation._id}`);
          }
        });
      });

      // Émettre le message à tous les participants de la conversation (INSTANTANÉ)
      io.to(`conversation:${conversation._id}`).emit('message:received', {
        message: populatedMessage,
        conversation: conversationData
      });

      // Confirmation à l'expéditeur que le message a été envoyé
      socket.emit('message:sent', {
        message: populatedMessage,
        conversation: conversationData
      });

      console.log(`[SOCKET] ✅ Message envoyé instantanément de ${socket.userId} dans conversation ${conversation._id}`);
    } catch (error) {
      console.error('[SOCKET] ❌ Erreur lors de l\'envoi du message:', error);
      socket.emit('message:error', { 
        error: error.message || 'Erreur lors de l\'envoi du message',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

// Gestion des connexions Socket.io
io.on('connection', (socket) => {
  console.log(`[SOCKET] ✅ Utilisateur connecté: ${socket.userId} (${socket.user.firstName} ${socket.user.lastName}) - Socket ID: ${socket.id}`);
  
  // Ajouter l'utilisateur à la liste des utilisateurs en ligne
  onlineUsers.set(socket.userId, {
    socketId: socket.id,
    user: socket.user,
    connectedAt: new Date()
  });

  // Rejoindre automatiquement la room de l'utilisateur pour recevoir les notifications personnalisées
  // Cette room est utilisée pour envoyer des événements spécifiques à un utilisateur (ex: paymentCreated)
  socket.join(`user_${socket.userId}`);
  console.log(`[SOCKET] ✅ ${socket.userId} a rejoint la room user_${socket.userId} pour recevoir les notifications personnalisées`);

  // Notifier les autres utilisateurs de la connexion
  socket.broadcast.emit('user:online', {
    userId: socket.userId,
    user: {
      _id: socket.user._id,
      firstName: socket.user.firstName,
      lastName: socket.user.lastName,
      role: socket.user.role
    }
  });
  
  // Confirmer la connexion au client
  socket.emit('socket:connected', {
    userId: socket.userId,
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });

  // Joindre les rooms pour les conversations de l'utilisateur
  socket.on('join:conversations', async (conversationIds) => {
    if (Array.isArray(conversationIds)) {
      conversationIds.forEach(convId => {
        socket.join(`conversation:${convId}`);
      });
      console.log(`[SOCKET] ✅ ${socket.userId} a rejoint ${conversationIds.length} conversation(s)`);
    }
  });

  // Rejoindre une conversation spécifique (CRITIQUE pour recevoir les messages)
  socket.on('join:conversation', (conversationId) => {
    if (conversationId) {
      socket.join(`conversation:${conversationId}`);
      console.log(`[SOCKET] ✅ ${socket.userId} a rejoint la conversation ${conversationId}`);
      
      // Confirmer que la room a été jointe
      socket.emit('conversation:joined', { conversationId });
    }
  });

  // Quitter une conversation
  socket.on('leave:conversation', (conversationId) => {
    socket.leave(`conversation:${conversationId}`);
    console.log(`[SOCKET] ${socket.userId} a quitté la conversation ${conversationId}`);
  });

  // Écouter les nouveaux messages (supporte message:new et message:send pour compatibilité)
  socket.on('message:new', async (data) => {
    await handleNewMessage(socket, data, io, onlineUsers);
  });

  socket.on('message:send', async (data) => {
    await handleNewMessage(socket, {
      receiver: data.receiverId || data.receiver,
      conversationId: data.conversationId,
      content: data.content,
      unit: data.unit,
      building: data.building,
      attachments: data.attachments || []
    }, io, onlineUsers);
  });

  // Indicateur de frappe
  socket.on('message:typing', (data) => {
    socket.to(`conversation:${data.conversationId}`).emit('message:typing', {
      userId: socket.userId,
      userName: `${socket.user.firstName} ${socket.user.lastName}`,
      isTyping: data.isTyping
    });
  });

  // Marquer les messages comme lus
  socket.on('message:read', async (data) => {
    try {
      const Message = require('./models/Message');
      const Conversation = require('./models/Conversation');
      const { markMessagesAsRead, syncAllMessageViews } = require('./services/messageSyncService');

      // Récupérer les IDs des messages à marquer comme lus
      const messagesToRead = await Message.find({
        conversation: data.conversationId,
        receiver: socket.userId,
        isRead: false
      }).select('_id');

      if (messagesToRead.length > 0) {
        const messageIds = messagesToRead.map(m => m._id);
        
        // Utiliser le service centralisé pour marquer comme lus
        await markMessagesAsRead(messageIds, socket.userId);
        
        // Synchroniser toutes les vues
        for (const messageId of messageIds) {
          await syncAllMessageViews(messageId);
        }
        
        console.log(`[SOCKET] ✅ ${messagesToRead.length} message(s) marqué(s) comme lu(s)`);
      }

      // Mettre à jour le compteur de la conversation
      const conversation = await Conversation.findById(data.conversationId);
      if (conversation && conversation.unreadCount) {
        conversation.unreadCount.set(socket.userId, 0);
        await conversation.save();
      }

      // Notifier les autres participants
      socket.to(`conversation:${data.conversationId}`).emit('message:read', {
        conversationId: data.conversationId,
        userId: socket.userId
      });

      console.log(`[SOCKET] Messages marqués comme lus par ${socket.userId} dans la conversation ${data.conversationId}`);
    } catch (error) {
      console.error('[SOCKET] Erreur lors de la lecture des messages:', error);
    }
  });

  // Gestion de la déconnexion
  socket.on('disconnect', () => {
    console.log(`[SOCKET] Utilisateur déconnecté: ${socket.userId}`);
    onlineUsers.delete(socket.userId);
    
    // Notifier les autres utilisateurs de la déconnexion
    socket.broadcast.emit('user:offline', {
      userId: socket.userId
    });
  });
});

// Middlewares Express
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware de logging pour toutes les requêtes API - À placer AVANT les routes
app.use('/api', (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[SERVER] 📥 [${timestamp}] ${req.method} ${req.originalUrl}`);
  console.log(`[SERVER]    Path: ${req.path}`);
  console.log(`[SERVER]    Base URL: ${req.baseUrl}`);
  console.log(`[SERVER]    URL: ${req.url}`);
  console.log(`[SERVER]    Headers Authorization: ${req.headers.authorization ? 'Présent (' + req.headers.authorization.substring(0, 20) + '...)' : 'Manquant'}`);
  console.log(`[SERVER]    IP: ${req.ip || req.connection.remoteAddress}`);
  
  // Log spécial pour les routes publiques
  if (req.originalUrl && req.originalUrl.startsWith('/api/units/available')) {
    console.log(`[SERVER]    🔓 Route PUBLIQUE détectée: ${req.method} ${req.originalUrl}`);
    console.log(`[SERVER]    🔓 Cette requête devrait être matchée par unitRoutes avec optionalAuth`);
  }
  
  // Log spécial pour les routes requests
  if (req.originalUrl && req.originalUrl.startsWith('/api/requests')) {
    console.log(`[SERVER]    ⚠️ Route requests détectée: ${req.method} ${req.originalUrl}`);
    console.log(`[SERVER]    ⚠️ Cette requête devrait être matchée par requestRoutes`);
  }
  
  next();
});

// Servir les fichiers statiques (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes API - À placer AVANT le middleware statique pour éviter les conflits
// IMPORTANT: Les routes spécifiques doivent être montées AVANT les routes génériques

// IMPORTANT: L'ordre des routes est critique
// Les routes spécifiques (/api/requests, /api/users, etc.) doivent être montées
// AVANT les routes génériques (/api) pour éviter les conflits

// Route de santé - À placer EN PREMIER pour vérification rapide
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend MonCondo+ est opérationnel',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000
  });
});

// Routes spécifiques - Montées EN PREMIER pour éviter les conflits
// IMPORTANT: L'ordre est critique - les routes publiques doivent être montées AVANT dashboardRoutes

// Routes PUBLIQUES - À placer EN PREMIER (aucune authentification requise)
console.log('[SERVER] 🔓 Chargement des routes publiques...');
app.use('/api/public', require('./routes/publicRoutes'));
console.log('[SERVER] ✅ Routes publiques montées sur /api/public');

// Route de contact (publique)
app.use('/api/contact', require('./routes/contactRoutes'));
console.log('[SERVER] ✅ Routes de contact montées sur /api/contact');

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// Routes buildings - IMPORTANT: Doit être montée AVANT dashboardRoutes
console.log('[SERVER] 🔄 Chargement des routes buildings...');
try {
  const buildingRoutes = require('./routes/buildingRoutes');
  
  // Vérifier que buildingRoutes est bien chargé
  if (!buildingRoutes) {
    throw new Error('buildingRoutes est undefined');
  }
  
  // Vérifier que buildingRoutes a une stack
  if (!buildingRoutes.stack || buildingRoutes.stack.length === 0) {
    console.error('[SERVER] ❌ buildingRoutes.stack est vide ou undefined!');
    console.error('[SERVER]    buildingRoutes:', typeof buildingRoutes);
    console.error('[SERVER]    buildingRoutes.stack:', buildingRoutes.stack);
  } else {
    console.log('[SERVER] ✅ buildingRoutes.stack contient', buildingRoutes.stack.length, 'layers');
    
    // Afficher toutes les routes dans buildingRoutes
    buildingRoutes.stack.forEach((layer, index) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        console.log(`[SERVER]   [${index}] ${methods} ${layer.route.path}`);
      } else if (layer.name) {
        console.log(`[SERVER]   [${index}] Middleware: ${layer.name}`);
      } else {
        console.log(`[SERVER]   [${index}] Layer:`, layer.regexp?.toString() || 'unknown');
      }
    });
  }
  
  // Monter la route
  app.use('/api/buildings', buildingRoutes);
  console.log('[SERVER] ✅ Routes buildings montées sur /api/buildings');
  
  // Vérifier que la route GET / existe bien
  if (buildingRoutes && buildingRoutes.stack) {
    const getRoute = buildingRoutes.stack.find(layer => 
      layer.route && 
      layer.route.path === '/' && 
      layer.route.methods.get
    );
    if (getRoute) {
      console.log('[SERVER] ✅✅ Route GET /api/buildings confirmée dans la stack!');
    } else {
      console.error('[SERVER] ❌❌ Route GET /api/buildings NON TROUVÉE dans la stack!');
      console.error('[SERVER]    Routes disponibles dans buildingRoutes:');
      buildingRoutes.stack.forEach((layer, index) => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
          console.error(`[SERVER]      [${index}] ${methods} ${layer.route.path}`);
        }
      });
    }
  }
} catch (error) {
  console.error('[SERVER] ❌ ERREUR lors du chargement des routes buildings:', error);
  console.error('[SERVER]    Message:', error.message);
  console.error('[SERVER]    Stack:', error.stack);
  // Ne pas arrêter le serveur, mais logguer l'erreur
}

// Routes PUBLIQUES - Doivent être montées AVANT dashboardRoutes pour éviter les conflits
console.log('[SERVER] 📍 Montage des routes publiques: /api/units/available');
app.use('/api/units', require('./routes/unitRoutes'));

// Routes requests - IMPORTANT: Doit être montée AVANT dashboardRoutes pour éviter les conflits
const requestRoutes = require('./routes/requestRoutes');
app.use('/api/requests', requestRoutes);
console.log('[SERVER] ✅ Routes requests chargées: /api/requests');

// Vérification immédiate que les routes importantes existent
if (requestRoutes && requestRoutes.stack) {
  const acceptRoute = requestRoutes.stack.find(layer => 
    layer.route && 
    layer.route.path === '/:id/accept' && 
    layer.route.methods.put
  );
  if (acceptRoute) {
    console.log('[SERVER] ✅✅ Route PUT /api/requests/:id/accept CONFIRMÉE et enregistrée!');
  } else {
    console.error('[SERVER] ❌❌ Route PUT /api/requests/:id/accept NON TROUVÉE dans la stack!');
  }

} else {
  console.error('[SERVER] ❌ requestRoutes.stack est undefined!');
}

app.use('/api/documents', require('./routes/documentRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/conversations', require('./routes/conversationRoutes'));
app.use('/api/exports', require('./routes/exportRoutes'));
console.log('[SERVER] ✅ Routes d\'export montées sur /api/exports');
app.use('/api/loans', require('./routes/loanRoutes'));
console.log('[SERVER] ✅ Routes de calculatrice de prêt montées sur /api/loans');
// Routes de paiement
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payments', paymentRoutes);
console.log('[SERVER] ✅ Routes de paiement enregistrées: POST /api/payments (tous utilisateurs authentifiés)');
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/upload', require('./routes/uploadRoutes'));
console.log('[SERVER] ✅ Routes d\'upload montées sur /upload');

// Routes protégées par rôle (dashboards) - À placer APRÈS les routes spécifiques
// pour éviter que dashboardRoutes n'intercepte les routes requests
try {
  const dashboardRoutes = require('./routes/dashboardRoutes');
  app.use('/api', dashboardRoutes);
  console.log('[SERVER] ✅ Routes dashboard chargées avec succès');
  console.log('[SERVER] 📍 Routes disponibles: /api/admin/dashboard, /api/proprietaire/dashboard, /api/locataire/dashboard');
  
  // Log des routes pour debug
  if (process.env.NODE_ENV === 'development') {
    dashboardRoutes.stack.forEach((route) => {
      if (route.route) {
        console.log(`[SERVER]   - ${Object.keys(route.route.methods).join(', ').toUpperCase()} ${route.route.path}`);
      }
    });
  }
} catch (error) {
  console.error('[SERVER] ❌ Erreur lors du chargement des routes dashboard:', error);
  console.error('[SERVER] Stack:', error.stack);
  process.exit(1); // Arrêter le serveur si les routes dashboard ne peuvent pas être chargées
}

// Route générique /api - À placer EN DERNIER pour éviter les conflits
app.use('/api', require('./routes/index'));

// Debug: Log toutes les routes API
if (process.env.NODE_ENV === 'development') {
  console.log('[SERVER] Routes API chargées:');
  console.log('  - /api');
  console.log('  - /api/auth');
  console.log('  - /api/users');
  console.log('  - /api/buildings');
  console.log('  - /api/units');
  console.log('  - /api/requests');
  console.log('  - /api/documents');
  console.log('  - /api/messages');
  console.log('  - /api/payments');
  console.log('  - /api/admin/dashboard');
  console.log('  - /api/proprietaire/dashboard');
  console.log('  - /api/locataire/dashboard');
  console.log('  - /api/dashboard');
  console.log('  - /api/me');
}

// Servir les fichiers frontend (depuis le dossier frontend) - Après les routes API
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// Gestion des erreurs 404 - À placer APRÈS toutes les routes
app.use((req, res) => {
  // Si c'est une route API requests qui n'a pas été matchée, c'est un problème sérieux
  if (req.originalUrl && req.originalUrl.startsWith('/api/requests')) {
    console.error(`[404] ❌❌ Route requests non trouvée: ${req.method} ${req.originalUrl}`);
    console.error(`[404]    Path: ${req.path}`);
    console.error(`[404]    Base URL: ${req.baseUrl}`);
    console.error(`[404]    URL: ${req.url}`);
    console.error(`[404]    Route stack:`, req.route ? 'Route trouvée' : 'Aucune route');
    
    // Vérifier si la route existe dans requestRoutes
    try {
      const requestRoutes = require('./routes/requestRoutes');
      if (requestRoutes && requestRoutes.stack) {
        console.error(`[404]    Routes disponibles dans requestRoutes:`);
        requestRoutes.stack.forEach((layer, index) => {
          if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
            console.error(`[404]      [${index}] ${methods} ${layer.route.path}`);
          } else if (layer.name) {
            console.error(`[404]      [${index}] Middleware: ${layer.name}`);
          }
        });
        
        // Vérifier spécifiquement la route accept
        const acceptRoute = requestRoutes.stack.find(layer => 
          layer.route && 
          layer.route.path === '/:id/accept' && 
          layer.route.methods.put
        );
        if (!acceptRoute) {
          console.error(`[404]    ❌ Route PUT /:id/accept NON TROUVÉE dans requestRoutes!`);
          console.error(`[404]    ⚠️ Le serveur doit être redémarré après les modifications.`);
        } else {
          console.error(`[404]    ⚠️ Route PUT /:id/accept existe mais n'a pas été matchée`);
          console.error(`[404]    ⚠️ Vérifiez l'ordre des routes dans server.js`);
          console.error(`[404]    ⚠️ Vérifiez que le middleware d'authentification n'a pas bloqué la requête`);
        }
        
        // Vérifier spécifiquement la route generate-documents
        if (req.originalUrl && req.originalUrl.includes('generate-documents')) {
          const generateDocsRoute = requestRoutes.stack.find(layer => 
            layer.route && 
            layer.route.path === '/:id/generate-documents' && 
            layer.route.methods.post
          );
          if (!generateDocsRoute) {
            console.error(`[404]    ❌❌ Route POST /:id/generate-documents NON TROUVÉE dans requestRoutes!`);
            console.error(`[404]    ⚠️ Le serveur doit être redémarré après les modifications.`);
          } else {
            console.error(`[404]    ⚠️ Route POST /:id/generate-documents existe mais n'a pas été matchée`);
            console.error(`[404]    ⚠️ Vérifiez l'ordre des routes dans requestRoutes.js`);
            console.error(`[404]    ⚠️ Vérifiez que le middleware d'authentification n'a pas bloqué la requête`);
            console.error(`[404]    ⚠️ Vérifiez que l'URL est correcte: ${req.originalUrl}`);
          }
        }
      } else {
        console.error(`[404]    ❌ requestRoutes.stack est undefined ou null!`);
      }
    } catch (error) {
      console.error(`[404]    Erreur lors de la vérification des routes:`, error.message);
    }
  } else {
    // Log normal pour les autres routes
    console.log(`[404] ⚠️ Route non trouvée: ${req.method} ${req.originalUrl}`);
  }
  
  // Si c'est une route API, retourner un JSON
  if (req.originalUrl && req.originalUrl.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: 'Route non trouvée',
      requestedUrl: req.originalUrl,
      path: req.path,
      method: req.method,
      suggestion: req.originalUrl.startsWith('/api/requests') 
        ? 'Vérifiez que la route existe dans requestRoutes.js et que le serveur backend a été redémarré après les modifications.'
        : 'Vérifiez que la route existe et que le serveur backend est démarré. Vérifiez également que la méthode HTTP (GET, POST, PUT, DELETE) est correcte.'
    });
  }
  
  // Sinon, retourner une page 404
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    requestedUrl: req.originalUrl
  });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('[ERROR] ❌ Erreur globale capturée:');
  console.error('[ERROR]    Message:', err.message);
  console.error('[ERROR]    Status Code:', err.statusCode || 500);
  console.error('[ERROR]    URL:', req.originalUrl);
  console.error('[ERROR]    Method:', req.method);
  console.error('[ERROR]    Stack:', err.stack);
  
  // Si c'est une erreur de validation Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message).join(', ');
    return res.status(400).json({
      success: false,
      message: `Erreur de validation: ${messages}`,
      errors: err.errors
    });
  }
  
  // Si c'est une erreur de cast Mongoose (ID invalide)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `ID invalide: ${err.message}`,
      path: err.path
    });
  }
  
  // Si c'est une erreur JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token invalide. Veuillez vous reconnecter.'
    });
  }
  
  // Si c'est une erreur JWT expiré
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expiré. Veuillez vous reconnecter.'
    });
  }
  
  // Erreur générique
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Erreur serveur. Le serveur est en cours d\'exécution mais n\'a pas pu traiter votre demande.',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err.name,
      details: {
        url: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      }
    })
  });
});

const PORT = process.env.PORT || 5000;

// Démarrer le cron job pour vérifier les baux expirés (toutes les 24h à minuit)
// Chargé après l'initialisation du serveur pour éviter les références circulaires
let cronJobInitialized = false;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] ✅ Serveur démarré sur le port ${PORT}`);
  console.log(`[SERVER] Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[SERVER] Socket.io activé et prêt`);
  console.log(`[SERVER] Testez la route: http://localhost:${PORT}/api/admin/dashboard`);
  console.log(`[SERVER] API disponible sur: http://0.0.0.0:${PORT}/api`);
  
  // Log des routes requests disponibles - Vérification détaillée
  try {
    const requestRoutes = require('./routes/requestRoutes');
    console.log('[SERVER] ✅ Routes requests enregistrées:');
    console.log('[SERVER]    Nombre de layers:', requestRoutes.stack ? requestRoutes.stack.length : 0);
    
    if (requestRoutes.stack) {
      let routeCount = 0;
      requestRoutes.stack.forEach((layer, index) => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase()).join(', ');
          const path = layer.route.path;
          console.log(`[SERVER]   [${index}] ${methods} /api/requests${path}`);
          routeCount++;
          
          // Vérifier spécifiquement la route accept
          if (path === '/:id/accept' && layer.route.methods.put) {
            console.log(`[SERVER]   ✅ Route PUT /api/requests/:id/accept trouvée et enregistrée!`);
          }
        } else if (layer.name === 'router') {
          console.log(`[SERVER]   [${index}] Router middleware: ${layer.name}`);
        } else if (layer.name) {
          console.log(`[SERVER]   [${index}] Middleware: ${layer.name}`);
        } else {
          console.log(`[SERVER]   [${index}] Layer anonyme`);
        }
      });
      console.log(`[SERVER]    Total routes: ${routeCount}`);
      
      // Vérifier si la route accept est présente
      const acceptRoute = requestRoutes.stack.find(layer => 
        layer.route && 
        layer.route.path === '/:id/accept' && 
        layer.route.methods.put
      );
      
      if (acceptRoute) {
        console.log('[SERVER]   ✅ Route PUT /api/requests/:id/accept confirmée dans la stack!');
      } else {
        console.log('[SERVER]   ⚠️ Route PUT /api/requests/:id/accept NON trouvée dans la stack!');
        console.log('[SERVER]   ⚠️ Vérifiez que la route est bien définie dans requestRoutes.js');
      }
    } else {
      console.log('[SERVER]   ⚠️ requestRoutes.stack est undefined!');
    }
  } catch (error) {
    console.error('[SERVER] ❌ Erreur lors du listing des routes requests:', error);
    console.error('[SERVER] Stack:', error.stack);
  }
  
  // Initialiser le cron job après le démarrage du serveur
  if (!cronJobInitialized) {
    try {
      const cron = require('node-cron');
      const { checkExpiredLeases } = require('./services/messagingSync');
      
      // Vérifier les baux expirés tous les jours à minuit
      cron.schedule('0 0 * * *', () => {
        console.log('[CRON] Vérification des baux expirés...');
        checkExpiredLeases().catch(err => {
          console.error('[CRON] Erreur lors de la vérification des baux expirés:', err);
        });
      });
      
      console.log('[SERVER] ✅ Cron job configuré pour vérifier les baux expirés quotidiennement');
      cronJobInitialized = true;
    } catch (error) {
      console.warn('[SERVER] ⚠️  Impossible de charger le cron job:', error.message);
      console.warn('[SERVER] Le serveur continue sans le cron job');
    }
  }
});

// Exporter io pour utilisation dans d'autres fichiers
module.exports = { app, server, io };
