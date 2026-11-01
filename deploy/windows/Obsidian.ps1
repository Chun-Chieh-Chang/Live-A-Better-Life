function Get-LifeOSObsidianPath {
    foreach ($candidate in @((Join-Path $env:LOCALAPPDATA 'Programs\Obsidian\Obsidian.exe'), (Join-Path $env:LOCALAPPDATA 'Obsidian\Obsidian.exe'), (Join-Path $env:ProgramFiles 'Obsidian\Obsidian.exe'))) {
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    return ''
}

function Ensure-LifeOSObsidian {
    $installed = Get-LifeOSObsidianPath
    if ($installed) { return $installed }
    $notice = $null
    try {
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        $notice = New-Object Windows.Forms.NotifyIcon
        $notice.Icon = [Drawing.SystemIcons]::Information
        $notice.Visible = $true
        $notice.ShowBalloonTip(12000, '把日子過好', '尚未安裝 Obsidian，正在自動安裝並連接你的筆記。請稍候。', [Windows.Forms.ToolTipIcon]::Info)
    } catch { Write-Host 'Obsidian is missing; installing and connecting your notes automatically.' }
    try {
    $winget = Get-Command winget.exe -ErrorAction Stop
    & $winget.Source install --id Obsidian.Obsidian --exact --source winget --scope user --silent --disable-interactivity | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'Obsidian installation failed.' }
    $installed = Get-LifeOSObsidianPath
    if (-not $installed) { throw 'Obsidian executable was not found after installation.' }
    return $installed
    } finally { if ($notice) { $notice.Visible = $false; $notice.Dispose() } }
}

function Register-LifeOSVault([string]$VaultRoot, [string]$SettingsRoot = (Join-Path $env:APPDATA 'obsidian')) {
    [void](New-Item -ItemType Directory -Path (Join-Path $VaultRoot '.obsidian') -Force)
    [void](New-Item -ItemType Directory -Path $SettingsRoot -Force)
    $settingsPath = Join-Path $SettingsRoot 'obsidian.json'
    $settings = [pscustomobject]@{vaults=[pscustomobject]@{}}
    if (Test-Path -LiteralPath $settingsPath) { $settings = Get-Content -LiteralPath $settingsPath -Raw -Encoding UTF8 | ConvertFrom-Json }
    if ($settings.PSObject.Properties.Name -notcontains 'vaults') { $settings | Add-Member -NotePropertyName vaults -NotePropertyValue ([pscustomobject]@{}) }
    foreach ($property in $settings.vaults.PSObject.Properties) { if ($property.Value.path -eq $VaultRoot) { return } }
    if ((Get-Process Obsidian -ErrorAction SilentlyContinue) -and $SettingsRoot -eq (Join-Path $env:APPDATA 'obsidian')) { throw 'Close Obsidian once to add the diary vault safely.' }
    if (Test-Path -LiteralPath $settingsPath) { Copy-Item -LiteralPath $settingsPath -Destination ($settingsPath + '.life-os-backup-' + [Guid]::NewGuid().ToString('N')) }
    $vaultId = [Guid]::NewGuid().ToString('N').Substring(0,16)
    $settings.vaults | Add-Member -NotePropertyName $vaultId -NotePropertyValue ([pscustomobject]@{path=$VaultRoot;ts=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds();open=$false})
    $settings | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $settingsPath -Encoding UTF8
}
