@echo off
echo ==============================================
echo   DEPLOYMENT GITHUB (VERCEL) ^& FIREBASE
echo ==============================================
cd /d "%~dp0.."

echo.
echo [1/2] DEPLOYING TO GITHUB (VERCEL)...
git add .
set /p commitMsg="Masukkan pesan commit (Enter untuk default 'Update'): "
if "%commitMsg%"=="" set commitMsg=Update

git commit -m "%commitMsg%"
git push

echo.
echo [2/2] DEPLOYING TO FIREBASE HOSTING...
echo Menghentikan server lokal (PM2) sementara untuk mencegah folder terkunci...
call pm2 stop inventory-app >nul

echo Menyembunyikan folder API file-explorer sementara...
move "src\app\api\file-explorer" "src\app\api\_file-explorer_temp" >nul


echo Membersihkan cache build lama...
if exist ".next" rmdir /s /q ".next"

call npm run build:firebase

echo Mengembalikan folder API file-explorer...
move "src\app\api\_file-explorer_temp" "src\app\api\file-explorer" >nul

echo Mengaktifkan kembali server lokal (PM2)...
call pm2 start inventory-app >nul

call firebase deploy --only hosting:inventorycgi

echo.
echo ==============================================
echo       SEMUA DEPLOYMENT TELAH SELESAI!
echo ==============================================
pause
