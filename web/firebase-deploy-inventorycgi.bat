@echo off
echo Deploying to Firebase Hosting...
cd /d "%~dp0"

firebase deploy --only hosting:inventorycgi

echo Done!
pause
