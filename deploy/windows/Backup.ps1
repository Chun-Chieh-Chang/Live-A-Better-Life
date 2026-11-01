[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ConfigPath)
. (Join-Path $PSScriptRoot 'Common.ps1')
Assert-LifeOSWindows
$config = Get-LifeOSConfig $ConfigPath
$savedEnvironment = Save-LifeOSEnvironment
Set-LifeOSEnvironment $config
Push-Location $config.ProjectRoot
try {
    & $config.NodePath --import tsx scripts/scheduled-backup.ts
    if ($LASTEXITCODE -ne 0) { throw 'Scheduled backup failed.' }
} finally { Restore-LifeOSEnvironment $savedEnvironment; Pop-Location }
