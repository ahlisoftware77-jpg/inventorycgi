@echo off
echo =======================================
echo Deploying directly to Vercel (Production)
echo =======================================
cd /d "%~dp0"

echo.
echo Menjalankan perintah 'vercel --prod'...
npx vercel --prod

echo.
echo =======================================
echo Deploy ke Vercel Selesai!
echo =======================================
pause
