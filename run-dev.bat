@echo off
cd /d "%~dp0"
set "ELECTRON_RUN_AS_NODE="
echo Starting Desktop_Pal (Tororo)...
npm run dev
