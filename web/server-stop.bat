@echo off
echo Mematikan Aplikasi Inventory Sementara...
call pm2 stop inventory-app
echo.
echo Aplikasi dimatikan.
pause
