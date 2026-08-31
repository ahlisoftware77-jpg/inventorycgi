@echo off
echo Deploying to Firebase Hosting...
cd /d "%~dp0"

set BUILD_TARGET=firebase
call npm run build
firebase deploy --only hosting:inventorycgi

echo Done!
pause
