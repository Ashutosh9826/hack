@echo off
title SCTRE - Spatial Cyber Threat Reconstruction Engine
echo Starting Spatial Cyber Threat Reconstruction Engine (SCTRE)...

:: Start Python HTTP server in a new window
echo Starting local HTTP server on port 8080...
start "SCTRE Server" cmd /c "python -m http.server 8080 & pause"

:: Wait a couple of seconds for the server to start
timeout /t 2 /nobreak > nul

:: Open the default web browser
echo Opening browser...
start http://localhost:8080

echo.
echo =========================================================
echo SCTRE is now running!
echo The server is running in the other command prompt window.
echo Close that window when you are done to stop the server.
echo =========================================================
pause
