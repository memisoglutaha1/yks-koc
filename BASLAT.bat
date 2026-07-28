@echo off
title YKS Kocu
cd /d "%~dp0"
echo.
echo  ================================
echo   YKS Kocu baslatiliyor...
echo  ================================
echo.
echo  Bilgisayar : http://localhost:5173
echo  Tablet/Tel : http://192.168.7.6:5173
echo  (Ayni Wi-Fi aginda olmali)
echo.
start http://localhost:5173
npm run dev
pause
