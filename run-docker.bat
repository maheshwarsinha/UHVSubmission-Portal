@echo off
title UHV Assignment Portal - Docker Runner
echo ========================================================
echo  Universal Human Values (UHV) Portal - Docker Launcher
echo ========================================================
echo.
echo 1. Checking if Docker Desktop engine is active...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Desktop is not currently running.
    echo Please open Docker Desktop from your Windows Start Menu or Desktop.
    echo Wait 15-20 seconds for the engine to initialize, then run this file again.
    echo.
    pause
    exit /b 1
)

echo [OK] Docker engine detected!
echo.
echo 2. Building and starting all containers (Postgres, Redis, Backend, Celery, Frontend, Nginx)...
docker compose up --build -d

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  All containers are up and running!
    echo ========================================================
    echo  * Student Portal:      http://localhost
    echo  * Admin Dashboard:     http://localhost/admin/login
    echo  * Swagger API Docs:    http://localhost/docs
    echo ========================================================
    echo.
    echo To view live logs:    docker compose logs -f
    echo To stop containers:   docker compose down
    echo.
) else (
    echo [ERROR] Failed to start Docker containers. Check the errors above.
)

pause
