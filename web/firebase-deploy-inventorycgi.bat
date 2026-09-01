@echo off
echo Deploying to Firebase Hosting...
cd /d "%~dp0"

call npm run build:firebase
firebase deploy --only hosting:inventorycgi

echo Done!
pause
