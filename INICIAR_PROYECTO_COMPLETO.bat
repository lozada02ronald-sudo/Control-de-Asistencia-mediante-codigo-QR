@echo off
title AcadeQR — Iniciador Integral del Sistema
cd /d "%~dp0"

echo ==========================================================
echo           INICIANDO SISTEMA COMPLETO ACADEQR
echo ==========================================================
echo [1/3] Verificando / Iniciando MySQL en XAMPP...
sc query MySQL >nul 2>&1
if %errorlevel% neq 0 (
    start "" /B "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone >nul 2>&1
)

echo [2/3] Iniciando Backend REST API en Python (Puerto 8000)...
start "AcadeQR Backend Python" cmd /k "python backend/app.py"

echo [3/3] Iniciando Frontend Web React + Vite (Puerto 3000)...
start "AcadeQR Frontend Vite" cmd /k "npm run dev"

timeout /t 3 >nul

echo ==========================================================
echo [OK] Abriendo aplicacion web en tu navegador...
echo Frontend Web:    http://localhost:3000/
echo Swagger API Doc: http://localhost:8000/docs
echo ==========================================================
start http://localhost:3000/
exit
