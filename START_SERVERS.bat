@echo off
echo ========================================
echo   Demarrage des serveurs MonCondo+
echo ========================================
echo.

echo [1/2] Demarrage du serveur Backend (port 5000)...
start "Backend Server" cmd /k "cd backend && node server.js"

timeout /t 3 /nobreak >nul

echo [2/2] Demarrage du serveur Frontend (port 3000)...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   Serveurs demarres!
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000/api
echo.
echo Les fenetres de serveur sont ouvertes.
echo Fermez cette fenetre pour arreter les serveurs.
echo.
pause

