[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ConfigPath)
. (Join-Path $PSScriptRoot 'Common.ps1')
Assert-LifeOSWindows
$config = Get-LifeOSConfig $ConfigPath
$resolvedConfig = (Resolve-Path -LiteralPath $ConfigPath).ProviderPath
$user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$powerShell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$serverScript = Join-Path $PSScriptRoot 'Start-LifeOS.ps1'
$backupScript = Join-Path $PSScriptRoot 'Backup.ps1'
$serverArgs = '-NoProfile -WindowStyle Hidden -File "' + $serverScript + '" -ConfigPath "' + $resolvedConfig + '" -OpenBrowser'
$backupArgs = '-NoProfile -WindowStyle Hidden -File "' + $backupScript + '" -ConfigPath "' + $resolvedConfig + '"'
foreach ($name in @('LifeOS-Server','LifeOS-Backup')) {
    $existing = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
    if ($existing -and @($existing.Actions | Where-Object { $_.Arguments.IndexOf(('"' + $resolvedConfig + '"'), [StringComparison]::OrdinalIgnoreCase) -lt 0 }).Count -gt 0) {
        throw ('Refusing to overwrite an unrelated existing task: ' + $name)
    }
}
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$serverSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
$backupSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
$serverAction = New-ScheduledTaskAction -Execute $powerShell -Argument $serverArgs -WorkingDirectory $config.ProjectRoot
$backupAction = New-ScheduledTaskAction -Execute $powerShell -Argument $backupArgs -WorkingDirectory $config.ProjectRoot
$serverTrigger = New-ScheduledTaskTrigger -AtLogOn -User $user
$backupTrigger = New-ScheduledTaskTrigger -Daily -At '03:15'
$backupTrigger.StartBoundary = (Get-Date -Format 'yyyy-MM-dd') + 'T03:15:00+08:00'
Register-ScheduledTask -TaskName 'LifeOS-Server' -Action $serverAction -Trigger $serverTrigger -Settings $serverSettings -Principal $principal -Force | Out-Null
Register-ScheduledTask -TaskName 'LifeOS-Backup' -Action $backupAction -Trigger $backupTrigger -Settings $backupSettings -Principal $principal -Force | Out-Null
Write-Host 'Registered current-user tasks. Server starts at user logon; backup runs at 03:15 UTC+08:00 when the user session is available.'
Write-Host 'Run Start-ScheduledTask -TaskName LifeOS-Server, then Verify.ps1. No firewall rule was created.'
