@echo off
echo ==============================================
echo   DEPLOYMENT GITHUB (VERCEL) ^& FIREBASE
echo ==============================================
cd /d "%~dp0"

echo.
echo [1/2] DEPLOYING TO GITHUB (VERCEL)...
git add .
set /p commitMsg="Masukkan pesan commit (Enter untuk default 'Update'): "
if "%commitMsg%"=="" set commitMsg=Update

git commit -m "%commitMsg%"
git push

echo.
echo [2/2] DEPLOYING TO FIREBASE HOSTING...
call npm run build:firebase
call firebase deploy --only hosting:inventorycgi

echo.
echo ==============================================
echo       SEMUA DEPLOYMENT TELAH SELESAI!
echo ==============================================
pause
