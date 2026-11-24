@echo off
title AcadeQR — Backend REST API en Python
cd /d "%~dp0"
echo ==========================================================
echo Iniciando AcadeQR Backend REST API en Python...
echo Conectando a MySQL en XAMPP (puerto 3306)
echo Documentacion Swagger: http://localhost:8000/docs
echo Documentacion ReDoc:   http://localhost:8000/redoc
echo ==========================================================
python backend/app.py
pause
