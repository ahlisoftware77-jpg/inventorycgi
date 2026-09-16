@echo off
echo ========================================================
echo Membersihkan Sesi / Koneksi File Sharing (SMB) Windows
echo ========================================================
echo.
echo Perintah ini akan memutus semua koneksi folder jaringan
echo (network drives) yang sedang aktif di komputer ini.
echo.
pause

echo.
echo Menghapus semua koneksi SMB...
net use * /delete /y

echo.
echo Restarting Workstation service untuk menghapus cache kredensial (opsional)...
:: Perintah di bawah butuh Run as Administrator, bisa diabaikan jika gagal
net stop Workstation /y
net start Workstation

echo.
echo Sesi file sharing berhasil dibersihkan!
pause
