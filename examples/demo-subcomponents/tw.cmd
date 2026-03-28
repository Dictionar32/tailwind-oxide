@echo off
REM Wrapper script for tailwind-styled CLI
REM Uses the dist from library root
cd /d "%~dp0"
node ..\..\dist\cli.js %*
