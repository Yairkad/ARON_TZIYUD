@echo off
cd /d "%~dp0"
node vapid.js > keys.txt 2>&1
type keys.txt
pause
