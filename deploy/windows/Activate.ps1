[CmdletBinding()]
param([string]$ProjectRoot, [switch]$ShowErrors)
if (-not $ProjectRoot) { $ProjectRoot = Join-Path $PSScriptRoot '..\..' }
. (Join-Path $PSScriptRoot 'Common.ps1')
. (Join-Path $PSScriptRoot 'Runtime.ps1')
. (Join-Path $PSScriptRoot 'Obsidian.ps1')
. (Join-Path $PSScriptRoot 'LocalFolders.ps1')
Assert-LifeOSWindows
$project = (Resolve-Path -LiteralPath $ProjectRoot).ProviderPath.TrimEnd('\')
$data = Join-Path $project 'Live-A-Better-Life-Data'
$configPath = Join-Path $data 'config.json'
$savedPath = $env:PATH
$mutex = New-Object Threading.Mutex($false, 'Local\LifeOS-Activation')
$locked = $false
try {
    $locked = $mutex.WaitOne(0)
    if (-not $locked) { throw 'Life OS activation is already running. Wait for that window.' }
    Move-LifeOSLocalFolders -ProjectRoot $project
    $preferred = ''
    $port = 3000
    if (Test-Path -LiteralPath $configPath) { $previous = Get-LifeOSConfig $configPath; $preferred = $previous.NodePath; $port = [int]$previous.Port }
    Write-Host '[1/6] Preparing private Node 24 / Bun 1.4.4 runtimes...'
    $tools = Ensure-LifeOSRuntime -ToolsRoot (Join-Path $project 'Live-A-Better-Life-Tools') -PreferredNode $preferred
    $null = Ensure-LifeOSObsidian
    Write-Host '[2/6] Preparing application and protected data...'
    if ((Test-Path -LiteralPath (Join-Path $data 'server-process.json'))) {
        $record = Get-Content -LiteralPath (Join-Path $data 'server-process.json') -Raw | ConvertFrom-Json
        $running = Get-Process -Id $record.Pid -ErrorAction SilentlyContinue
        if ($running -and (Test-LifeOSProcessRecord -Record $record -Process $running -ProjectRoot $project)) {
            & (Join-Path $PSScriptRoot 'Backup.ps1') -ConfigPath $configPath
            $task = Get-ScheduledTask -TaskName 'LifeOS-Server' -ErrorAction SilentlyContinue
            if ($task -and @($task.Actions | Where-Object { $_.Arguments.IndexOf(('"' + $configPath + '"'), [StringComparison]::OrdinalIgnoreCase) -ge 0 }).Count -gt 0) { Stop-ScheduledTask -TaskName 'LifeOS-Server' }
            $running.Refresh()
            if (-not $running.HasExited) { Stop-Process -Id $record.Pid -ErrorAction Stop }
            $running.WaitForExit(10000) | Out-Null
        }
    }
    & (Join-Path $PSScriptRoot 'Setup.ps1') -ProjectRoot $project -Port $port -Unattended
    Write-Host '[3/6] Registering current-user startup and backup tasks...'
    & (Join-Path $PSScriptRoot 'Install-Tasks.ps1') -ConfigPath $configPath
    Write-Host '[4/6] Starting and opening personal workspace...'
    $config = Get-LifeOSConfig $configPath
    $task = Get-ScheduledTask -TaskName 'LifeOS-Server'
    if ($task.State -eq 'Running') {
        Wait-LifeOSDesktopReady $config
        Open-LifeOSBrowser $config
    } else {
        Start-ScheduledTask -TaskName 'LifeOS-Server'
        Wait-LifeOSDesktopReady $config
        # The supervised server task opens the browser after readiness on each user logon/start.
    }
    Write-Host '[5/6] Verifying readiness and private API protection...'
    & (Join-Path $PSScriptRoot 'Verify.ps1') -ConfigPath $configPath
    Write-Host '[6/6] Creating a recovery backup...'
    & (Join-Path $PSScriptRoot 'Backup.ps1') -ConfigPath $configPath
    Write-Host 'Activation completed. Startup, login handoff and backup require no manual commands.'
} catch {
    if (Test-Path -LiteralPath (Join-Path $data 'config.json')) {
        $logPath = Join-Path $data 'Logs/activation-errors.log'
        [IO.File]::AppendAllText($logPath, ([DateTime]::UtcNow.ToString('O') + ': ' + $_.ToString() + [Environment]::NewLine + $_.ScriptStackTrace + [Environment]::NewLine))
    }
    if ($ShowErrors) {
        Add-Type -AssemblyName System.Windows.Forms
        [void][Windows.Forms.MessageBox]::Show('暫時無法準備你的日記。請確認網路連線後再試一次。已儲存的記錄不會被重設。', '把日子過好', 'OK', 'Warning')
    }
    throw
} finally {
    $env:PATH = $savedPath
    if ($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
