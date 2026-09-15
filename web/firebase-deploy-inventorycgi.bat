@echo off
echo Deploying to Firebase Hosting...
cd /d "%~dp0"

echo Menyembunyikan folder API file-explorer sementara...
move "src\app\api\file-explorer" "src\app\api\_file-explorer_temp" >nul

call npm run build:firebase

echo Mengembalikan folder API file-explorer...
move "src\app\api\_file-explorer_temp" "src\app\api\file-explorer" >nul

firebase deploy --only hosting:inventorycgi

echo Done!
pause
