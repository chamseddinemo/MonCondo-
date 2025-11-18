#!/bin/bash
# Script pour démarrer Backend et Frontend ensemble (Linux/Mac)

echo "🚀 Démarrage de MonCondo+..."
echo ""

# Démarrer le backend
echo "📦 Démarrage du backend sur le port 5000..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Attendre 3 secondes
sleep 3

# Démarrer le frontend
echo "🎨 Démarrage du frontend sur le port 3001..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Les deux serveurs sont en cours de démarrage..."
echo ""
echo "📍 Backend:  http://localhost:5000"
echo "📍 Frontend: http://localhost:3001"
echo ""
echo "⏳ Attendez quelques secondes que les serveurs démarrent complètement."
echo ""
echo "Pour arrêter les serveurs, utilisez: kill $BACKEND_PID $FRONTEND_PID"



