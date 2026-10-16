@echo off
title UHV Assignment Portal - Local Dev Runner
echo ========================================================
echo  Universal Human Values (UHV) Portal - Local Dev
echo ========================================================
echo.
echo Starting FastAPI Backend (Port 8000)...
start "UHV Backend" cmd /k "set PYTHONPATH=backend&& python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo Starting React + Vite Frontend (Port 5173)...
start "UHV Frontend" cmd /k "cd frontend&& npm run dev"

echo.
echo ========================================================
echo  Services started in separate windows!
echo  * Student Portal:   http://localhost:5173
echo  * Admin Dashboard:  http://localhost:5173/admin/login
echo  * Swagger API Docs: http://localhost:8000/docs
echo ========================================================
echo.
timeout /t 5
start http://localhost:5173
