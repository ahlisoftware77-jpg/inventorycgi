@echo off
echo Deploying to Firebase Hosting...
cd /d "%~dp0"

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

firebase deploy --only hosting:inventorycgi

echo Done!
pause
