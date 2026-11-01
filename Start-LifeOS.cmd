@echo off
setlocal
powershell.exe -NoProfile -File "%~dp0deploy\windows\Activate.ps1" -ProjectRoot "%~dp0."
if errorlevel 1 (
  echo.
  echo Activation failed. Review the error above. Existing data was not intentionally reset.
  pause
  exit /b 1
)
endlocal
