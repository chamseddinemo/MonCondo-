@echo off
REM Script de démarrage automatique des serveurs MonCondo+
REM Ce script peut être ajouté au démarrage de Windows

cd /d "%~dp0"

echo ========================================
echo   Demarrage automatique MonCondo+
echo ========================================
echo.

REM Vérifier et démarrer les serveurs
powershell -ExecutionPolicy Bypass -File "%~dp0CHECK_SERVERS.ps1" -AutoStart

echo.
echo Les serveurs sont en cours de demarrage...
echo Attendez quelques secondes avant d'ouvrir http://localhost:3000
echo.
pause


