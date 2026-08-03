@echo off
echo ========================================
echo   小鸡快跑 - 游戏服务器启动中...
echo ========================================
cd /d "%~dp0"
node server/index.js
pause
