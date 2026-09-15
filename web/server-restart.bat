@echo off
echo Merestart Aplikasi Inventory...
call pm2 restart inventory-app
echo.
echo Aplikasi berhasil direstart.
pause
