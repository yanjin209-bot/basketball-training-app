@echo off
rem COURT//RISE one-click setup: install deps, test, build installer, launch it
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-windows.ps1"
