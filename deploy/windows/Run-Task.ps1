[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ConfigPath, [ValidateSet('Server','Backup')][string]$Mode='Server')
$ErrorActionPreference = 'Stop'
try {
    if ($Mode -eq 'Server') { & (Join-Path $PSScriptRoot 'Start-LifeOS.ps1') -ConfigPath $ConfigPath -OpenBrowser }
    else { & (Join-Path $PSScriptRoot 'Backup.ps1') -ConfigPath $ConfigPath }
} catch {
    $config = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $log = Join-Path $config.DataRoot 'Logs/task-errors.log'
    [IO.File]::AppendAllText($log, ('Node=' + $config.NodePath + '; exists=' + (Test-Path -LiteralPath $config.NodePath) + '; project=' + (Test-Path -LiteralPath $config.ProjectRoot) + '; identity=' + [Security.Principal.WindowsIdentity]::GetCurrent().Name + [Environment]::NewLine))
    [IO.File]::AppendAllText($log, ([DateTime]::UtcNow.ToString('O') + ' ' + $Mode + ': ' + $_.ToString() + [Environment]::NewLine + $_.ScriptStackTrace + [Environment]::NewLine))
    throw
}
