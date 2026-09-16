@echo off
title Cloudflare Tunnel - Inventory App
echo ===================================================
echo     MEMULAI CLOUDFLARE TUNNEL UNTUK INVENTORY
echo ===================================================
echo.
echo Pastikan aplikasi web sudah berjalan (npm run start)
echo di terminal terpisah pada port 9003!
echo.
echo Mencari URL publik (https://...trycloudflare.com)
echo Silakan tunggu beberapa detik...
echo.

npx --yes cloudflared tunnel --url http://localhost:9003

pause
