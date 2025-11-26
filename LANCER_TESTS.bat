@echo off
REM Script pour lancer tous les tests
echo ========================================
echo   TESTS COMPLETS - MonCondo+
echo ========================================
echo.

REM Vérifier que les serveurs sont démarrés
echo [1/3] Vérification des serveurs...
netstat -ano | findstr ":5000" >nul
if %errorlevel% neq 0 (
    echo ❌ Backend non démarré sur le port 5000
    echo    Démarrez le backend avant de continuer
    pause
    exit /b 1
)

netstat -ano | findstr ":3000" >nul
if %errorlevel% neq 0 (
    echo ❌ Frontend non démarré sur le port 3000
    echo    Démarrez le frontend avant de continuer
    pause
    exit /b 1
)

echo ✅ Serveurs actifs
echo.

REM Tests API
echo [2/3] Tests API Backend...
cd backend
node TEST_API_ROUTES.js
cd ..

echo.
echo [3/3] Tests Frontend
echo    Ouvrez http://localhost:3000 dans votre navigateur
echo    Suivez la checklist dans TEST_FRONTEND.md
echo.

pause

