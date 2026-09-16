@echo off
echo Menjalankan Aplikasi Inventory di Latar Belakang (Port 9003)...
call pm2 start node_modules\next\dist\bin\next --name "inventory-app" -- dev -p 9003
echo.
echo Menyimpan konfigurasi PM2...
call pm2 save
echo.
echo Selesai! Aplikasi Anda sekarang terkunci di latar belakang.
echo Terminal ini sudah bisa Anda tutup dengan aman.
pause
