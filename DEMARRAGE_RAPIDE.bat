@echo off
REM Script de démarrage rapide - MonCondo+
REM Double-cliquez simplement sur ce fichier pour démarrer les serveurs

cd /d "%~dp0"

echo ========================================
echo   Demarrage Rapide MonCondo+
echo ========================================
echo.

REM Vérifier et démarrer les serveurs
powershell -ExecutionPolicy Bypass -File "%~dp0CHECK_SERVERS.ps1"

echo.
echo ========================================
echo   Serveurs demarres !
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000/api
echo.
echo Les fenetres de serveur sont ouvertes.
echo Fermez cette fenetre pour continuer.
echo.
timeout /t 5 /nobreak >nul


