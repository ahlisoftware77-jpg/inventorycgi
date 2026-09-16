@echo off
echo =======================================
echo Deploying to Vercel (Preview / Viewer)
echo =======================================
cd /d "%~dp0"

echo.
echo Menjalankan perintah 'vercel' untuk mode Preview...
npx vercel

echo.
echo =======================================
echo Deploy Preview Selesai!
echo Silakan buka URL yang diberikan di browser.
echo =======================================
pause
