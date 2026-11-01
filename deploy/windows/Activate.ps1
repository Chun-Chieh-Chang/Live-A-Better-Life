[CmdletBinding()]
param([string]$ProjectRoot = (Join-Path $PSScriptRoot '..\..'))
. (Join-Path $PSScriptRoot 'Common.ps1')
. (Join-Path $PSScriptRoot 'Runtime.ps1')
Assert-LifeOSWindows
$project = (Resolve-Path -LiteralPath $ProjectRoot).ProviderPath.TrimEnd('\')
$data = Join-Path (Split-Path -Parent $project) 'Live-A-Better-Life-Data'
$configPath = Join-Path $data 'config.json'
$savedPath = $env:PATH
$mutex = New-Object Threading.Mutex($false, 'Local\LifeOS-Activation')
$locked = $false
try {
    $locked = $mutex.WaitOne(0)
    if (-not $locked) { throw 'Life OS activation is already running. Wait for that window.' }
    $preferred = ''
    $port = 3000
    if (Test-Path -LiteralPath $configPath) { $previous = Get-LifeOSConfig $configPath; $preferred = $previous.NodePath; $port = [int]$previous.Port }
    Write-Host '[1/6] Preparing private Node 24 / Bun 1.4.4 runtimes...'
    $tools = Ensure-LifeOSRuntime -ToolsRoot (Join-Path $env:LOCALAPPDATA 'LifeOS\Tools') -PreferredNode $preferred
    $sourceHash = Get-LifeOSSourceHash $project
    $stampPath = Join-Path $data 'build-state.json'
    $skipBuild = $false
    if ((Test-Path -LiteralPath $stampPath) -and (Test-Path -LiteralPath (Join-Path $project 'dist\index.html')) -and (Test-Path -LiteralPath (Join-Path $project 'node_modules\.bin\tsx.cmd'))) {
        $stamp = Get-Content -LiteralPath $stampPath -Raw | ConvertFrom-Json
        $skipBuild = ($stamp.SourceHash -eq $sourceHash -and $stamp.NodePath -eq $tools.NodePath)
    }
    Write-Host '[2/6] Preparing application and protected data...'
    if (-not $skipBuild -and (Test-Path -LiteralPath (Join-Path $data 'server-process.json'))) {
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
    & (Join-Path $PSScriptRoot 'Setup.ps1') -ProjectRoot $project -Port $port -Unattended -SkipBuild:$skipBuild
    @{SourceHash=$sourceHash; NodePath=$tools.NodePath} | ConvertTo-Json | Set-Content -LiteralPath $stampPath -Encoding UTF8
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
} finally {
    $env:PATH = $savedPath
    if ($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
