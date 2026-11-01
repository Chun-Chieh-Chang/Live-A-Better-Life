[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ConfigPath)
. (Join-Path $PSScriptRoot 'Common.ps1')
Assert-LifeOSWindows
$config = Get-LifeOSConfig $ConfigPath
if (-not (Test-LifeOSDesktopReady $config)) {
    $powerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $startScript = Join-Path $PSScriptRoot 'Start-LifeOS.ps1'
    $resolvedConfig = (Resolve-Path -LiteralPath $ConfigPath).ProviderPath
    $arguments = '-NoProfile -File "' + $startScript + '" -ConfigPath "' + $resolvedConfig + '"'
    $process = Start-Process -FilePath $powerShell -ArgumentList $arguments -WorkingDirectory $config.ProjectRoot -WindowStyle Hidden -PassThru
    Wait-LifeOSDesktopReady -Config $config -Process $process
}
Open-LifeOSBrowser $config
Write-Host 'Personal server is ready; requested one-time sign-in in the default browser.'
