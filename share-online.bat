@echo off
title UHV Assignment Portal - Online Public Tunnel
echo ===================================================
echo Starting Cloudflare Tunnel for UHV Portal...
echo ===================================================
echo.
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:80
pause
