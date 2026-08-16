@echo off
title CY9 Autonomous AI Command Center
color 0b
cls
echo ===============================================================
echo                 CY9 - AUTONOMOUS AI ASSISTANT
echo ===============================================================
echo [*] Starting CY9 Holographic Interface...
cd /d "%~dp0"
npx electron .
pause
