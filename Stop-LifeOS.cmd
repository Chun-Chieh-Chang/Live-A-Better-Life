@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy\windows\Stop-LifeOS.ps1" -CloseObsidian -KillServerProcess
if errorlevel 1 (
  echo.
  echo Failed to stop Life OS completely.
  pause
  exit /b 1
)
echo Life OS has been safely shut down.
endlocal
