@echo off
echo Starting Next.js Dev Server...
cd /d "%~dp0"

REM Jalankan dev server di background
start cmd /k "npm run dev"

REM Delay sebentar agar server mulai
timeout /t 3 >nul

echo Opening browser at http://localhost:9001 ...
start http://localhost:9002

pause
