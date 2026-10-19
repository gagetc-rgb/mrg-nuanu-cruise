@echo off
cd /d "%~dp0site"
start "" http://localhost:5178/
python -m http.server 5178
