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

echo Memastikan tidak ada proses yang mengunci port 9003...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :9003') do taskkill /f /pid %%a >nul 2>&1

echo Menyembunyikan folder API sementara...
move "src\app\api" "src\app\_api_temp" >nul

if exist "src\app\api" (
    echo [ERROR] Gagal menyembunyikan folder API. Kemungkinan ada terminal (misalnya npm run dev) atau VS Code yang sedang mengunci folder tersebut.
    echo Harap tutup terminal dev server atau tutup file di dalam folder API, lalu coba lagi.
    pause
    exit /b 1
)

echo Membersihkan cache build lama...
if exist ".next" rmdir /s /q ".next"

call npm run build:firebase

echo Mengembalikan folder API...
move "src\app\_api_temp" "src\app\api" >nul

echo Mengaktifkan kembali server lokal (PM2)...
call pm2 start inventory-app >nul

call firebase deploy --only hosting:inventorycgi

echo.
echo ==============================================
echo       SEMUA DEPLOYMENT TELAH SELESAI!
echo ==============================================
pause
