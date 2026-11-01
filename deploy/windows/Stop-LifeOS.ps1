[CmdletBinding()]
param(
    [string]$ConfigPath,
    [switch]$CloseObsidian,
    [switch]$KillServerProcess
)
. (Join-Path $PSScriptRoot 'Common.ps1')
Assert-LifeOSWindows

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).ProviderPath
if (-not $ConfigPath) {
    $ConfigPath = Join-Path $projectRoot 'Live-A-Better-Life-Data\config.json'
}

# 1. 停止 Windows 排程任務
try {
    $task = Get-ScheduledTask -TaskName 'LifeOS-Server' -ErrorAction SilentlyContinue
    if ($task) {
        Stop-ScheduledTask -TaskName 'LifeOS-Server' -ErrorAction SilentlyContinue
        Write-Host 'Stopped scheduled task: LifeOS-Server'
    }
} catch {
    Write-Warning ('Failed to stop scheduled task: ' + $_.Exception.Message)
}

# 2. 平穩關閉 Obsidian 視窗
if ($CloseObsidian) {
    try {
        $obsidianProcesses = @(Get-Process -Name 'Obsidian' -ErrorAction SilentlyContinue)
        if ($obsidianProcesses.Count -gt 0) {
            Write-Host ('Closing ' + $obsidianProcesses.Count + ' Obsidian process(es) gracefully...')
            foreach ($p in $obsidianProcesses) {
                try {
                    $null = $p.CloseMainWindow()
                } catch {
                    $null = $_
                }
            }
            Start-Sleep -Milliseconds 1500
            $remaining = @(Get-Process -Name 'Obsidian' -ErrorAction SilentlyContinue)
            if ($remaining.Count -gt 0) {
                Write-Host 'Terminating remaining unresponsive Obsidian process(es)...'
                foreach ($p in $remaining) {
                    try {
                        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
                    } catch {
                        $null = $_
                    }
                }
            }
            Write-Host 'Obsidian closed.'
        }
    } catch {
        Write-Warning ('Failed to close Obsidian: ' + $_.Exception.Message)
    }
}

# 3. 處理 server-process.json 與 Node 進程
$recordPath = Join-Path (Split-Path -Parent $ConfigPath) 'server-process.json'
if (Test-Path -LiteralPath $recordPath) {
    try {
        $record = Get-Content -LiteralPath $recordPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($KillServerProcess -and $record.Pid) {
            $running = Get-Process -Id $record.Pid -ErrorAction SilentlyContinue
            if ($running -and (Test-LifeOSProcessRecord -Record $record -Process $running -ProjectRoot $projectRoot)) {
                Write-Host ('Stopping Node server process with PID ' + $record.Pid)
                Stop-Process -Id $record.Pid -Force -ErrorAction SilentlyContinue
                $running.WaitForExit(3000) | Out-Null
            }
        }
        Remove-Item -LiteralPath $recordPath -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Warning ('Failed to process server-process record: ' + $_.Exception.Message)
    }
}

Write-Host 'Life OS services and dependencies stopped successfully.'
