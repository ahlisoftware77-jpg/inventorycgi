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
echo Menyembunyikan folder API file-explorer sementara...
move "src\app\api\file-explorer" "src\app\api\_file-explorer_temp" >nul

call npm run build:firebase

echo Mengembalikan folder API file-explorer...
move "src\app\api\_file-explorer_temp" "src\app\api\file-explorer" >nul

call firebase deploy --only hosting:inventorycgi

echo.
echo ==============================================
echo       SEMUA DEPLOYMENT TELAH SELESAI!
echo ==============================================
pause
