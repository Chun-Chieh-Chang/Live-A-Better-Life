# Only migrate the two known sibling directories belonging to this checkout.
function Move-LifeOSLocalFolders([string]$ProjectRoot) {
    $project = (Resolve-Path -LiteralPath $ProjectRoot).ProviderPath.TrimEnd('\')
    $parent = Split-Path -Parent $project
    $oldData = Join-Path $parent 'Live-A-Better-Life-Data'
    $newData = Join-Path $project 'Live-A-Better-Life-Data'
    $oldTools = Join-Path $parent 'Live-A-Better-Life-Tools'
    $newTools = Join-Path $project 'Live-A-Better-Life-Tools'
    if (-not (Test-Path -LiteralPath $oldData)) { return }
    if ((Test-Path -LiteralPath $newData) -or ((Test-Path -LiteralPath $oldTools) -and (Test-Path -LiteralPath $newTools))) { throw 'Both old and new local folders exist. Preserve them and resolve the duplicate before activation.' }
    foreach ($location in @($oldData,$oldTools,$newData,$newTools)) {
        if ([IO.Path]::GetFullPath($location) -ne $location) { throw 'Unexpected migration target.' }
        if ((Test-Path -LiteralPath $location) -and ((Get-Item -LiteralPath $location -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Linked local directories cannot be migrated.' }
    }
    $oldConfigPath = Join-Path $oldData 'config.json'
    $config = Get-LifeOSConfig $oldConfigPath
    if ($config.ProjectRoot -ne $project -or $config.DataRoot -ne $oldData) { throw 'Sibling data belongs to another installation.' }
    $obsidianSettings = Join-Path $env:APPDATA 'obsidian\obsidian.json'
    $vaultSettings = $null
    $vaultsToMove = @()
    if (Test-Path -LiteralPath $obsidianSettings) {
        $vaultSettings = Get-Content -LiteralPath $obsidianSettings -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($vaultSettings.PSObject.Properties.Name -contains 'vaults') {
            $vaultsToMove = @($vaultSettings.vaults.PSObject.Properties | Where-Object { $_.Value.path.StartsWith($oldData + '\', [StringComparison]::OrdinalIgnoreCase) })
        }
        if ($vaultsToMove.Count -gt 0 -and (Get-Process Obsidian -ErrorAction SilentlyContinue)) { throw 'Please close Obsidian before moving the local notes folder.' }
    }
    $recordPath = Join-Path $oldData 'server-process.json'
    $running = $null
    if (Test-Path -LiteralPath $recordPath) {
        $record = Get-Content -LiteralPath $recordPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $running = Get-Process -Id $record.Pid -ErrorAction SilentlyContinue
        if ($running -and -not (Test-LifeOSProcessRecord $record $running $project)) { $running = $null }
    }
    if ($running) { & (Join-Path $PSScriptRoot 'Backup.ps1') -ConfigPath $oldConfigPath }
    foreach ($name in @('LifeOS-Server','LifeOS-Backup')) {
        $task = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
        if ($task -and @($task.Actions | Where-Object { $_.Arguments.Contains(('"' + $oldConfigPath + '"')) }).Count -gt 0) { Stop-ScheduledTask -TaskName $name }
    }
    if ($running) { $running.Refresh(); if (-not $running.HasExited) { Stop-Process -Id $record.Pid }; $null = $running.WaitForExit(10000) }
    $moves = @()
    try {
        Move-Item -LiteralPath $oldData -Destination $newData
        $moves += ,@($oldData,$newData)
        if (Test-Path -LiteralPath $oldTools) { Move-Item -LiteralPath $oldTools -Destination $newTools; $moves += ,@($oldTools,$newTools) }
    } catch {
        for ($index=$moves.Count-1; $index -ge 0; $index--) { Move-Item -LiteralPath $moves[$index][1] -Destination $moves[$index][0] }
        throw
    }
    foreach ($property in @('DataRoot','NodePath','NotesRoot')) {
        if ($config.PSObject.Properties.Name -notcontains $property) { continue }
        $value = [string]$config.$property
        foreach ($mapping in @(@($oldData,$newData),@($oldTools,$newTools))) {
            if ($value -eq $mapping[0] -or $value.StartsWith($mapping[0] + '\', [StringComparison]::OrdinalIgnoreCase)) { $value = $mapping[1] + $value.Substring($mapping[0].Length); break }
        }
        $config.$property = $value
    }
    $config | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $newData 'config.json') -Encoding UTF8
    if ($vaultsToMove.Count -gt 0) {
        Copy-Item -LiteralPath $obsidianSettings -Destination ($obsidianSettings + '.life-os-backup-' + [Guid]::NewGuid().ToString('N'))
        foreach ($vault in $vaultsToMove) { $vault.Value.path = $newData + $vault.Value.path.Substring($oldData.Length) }
        $vaultSettings | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $obsidianSettings -Encoding UTF8
    }
    foreach ($name in @('node-path.txt','bun-path.txt')) {
        $file = Join-Path $newTools $name
        if (Test-Path -LiteralPath $file) { $value = [IO.File]::ReadAllText($file).Replace($oldTools,$newTools).Replace($oldData,$newData); [IO.File]::WriteAllText($file,$value) }
    }
    Protect-LifeOSDataDirectory $newData
    if (Test-Path -LiteralPath $newTools) { Protect-LifeOSDataDirectory $newTools }
    Write-Host 'Moved private local folders into the project. Existing records and encrypted credentials were preserved.'
}
