@echo off
echo Menampilkan Log (Riwayat) Aplikasi Inventory...
echo Tekan CTRL+C untuk keluar dari mode log.
call pm2 logs inventory-app
pause
