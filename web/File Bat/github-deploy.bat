@echo off
echo Deploying to GitHub...
cd /d "%~dp0"

git add .
set /p commitMsg="Masukkan pesan commit (Enter untuk default 'Update'): "
if "%commitMsg%"=="" set commitMsg=Update

git commit -m "%commitMsg%"
git push

echo.
echo Deploy ke GitHub Selesai!
pause
