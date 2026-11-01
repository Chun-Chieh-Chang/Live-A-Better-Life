# PowerShell checks use disposable directories and verify their private ACLs.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).ProviderPath
. (Join-Path $project 'deploy/windows/Common.ps1')
. (Join-Path $project 'deploy/windows/Obsidian.ps1')
$parseFailures = @()
Get-ChildItem (Join-Path $project 'deploy/windows/*.ps1') | ForEach-Object {
    $tokens = $null
    $parseErrors = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile($_.FullName, [ref]$tokens, [ref]$parseErrors)
    $parseFailures += $parseErrors
}
if ($parseFailures.Count) { throw ($parseFailures | Out-String) }
$root = Join-Path ([IO.Path]::GetTempPath()) ('life-os-ps-' + [Guid]::NewGuid().ToString('N'))
$fixtureProject = Join-Path $PSScriptRoot ('.life-os-fixture-' + [Guid]::NewGuid().ToString('N'))
try {
    [void](New-Item -ItemType Directory -Path $root)
    [void](New-Item -ItemType Directory -Path (Join-Path $root 'Logs'))
    Protect-LifeOSDataDirectory -LiteralPath $root
    $acl = Get-LifeOSDirectoryAcl -LiteralPath $root
    $allowed = @([Security.Principal.WindowsIdentity]::GetCurrent().User.Value, 'S-1-5-18', 'S-1-5-32-544')
    if (-not $acl.AreAccessRulesProtected) { throw 'Private directory still inherits permissions.' }
    foreach ($rule in $acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier])) {
        if ($rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin $allowed) { throw 'Unexpected private directory access grant.' }
    }
    $vaultSettings = Join-Path $root 'obsidian-settings'
    $vaultFolder = Join-Path $root 'notes'
    Register-LifeOSVault -VaultRoot $vaultFolder -SettingsRoot $vaultSettings
    Register-LifeOSVault -VaultRoot $vaultFolder -SettingsRoot $vaultSettings
    $vaultConfig = Get-Content -LiteralPath (Join-Path $vaultSettings 'obsidian.json') -Raw | ConvertFrom-Json
    if (@($vaultConfig.vaults.PSObject.Properties).Count -ne 1) { throw 'Vault registration is not repeatable.' }
    if (@($vaultConfig.vaults.PSObject.Properties)[0].Value.path -ne $vaultFolder) { throw 'Registered vault path is wrong.' }
    $hashFixture = Join-Path $root 'hash-fixture.txt'
    [IO.File]::WriteAllText($hashFixture, 'abc', (New-Object Text.UTF8Encoding($false)))
    if ((Get-LifeOSFileHash $hashFixture) -ne 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad') { throw 'SHA-256 known vector failed.' }
    $config = [pscustomobject]@{ Version=1; ProjectRoot=$project; DataRoot=$root; NodePath=(Get-Command node).Source; Port=3000 }
    $configPath = Join-Path $root 'config.json'
    $config | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
    $loaded = Get-LifeOSConfig $configPath
    $currentProcess = Get-Process -Id $PID
    $record = @{NodePath=$currentProcess.Path; StartedUtc=$currentProcess.StartTime.ToUniversalTime().ToString('O'); ProjectRoot=$project} | ConvertTo-Json | ConvertFrom-Json
    if (-not (Test-LifeOSProcessRecord -Record $record -Process $currentProcess -ProjectRoot $project)) { throw 'Serialized process identity failed to match.' }
    $record.StartedUtc = [datetime]::UtcNow.AddYears(-1)
    if (Test-LifeOSProcessRecord -Record $record -Process $currentProcess -ProjectRoot $project) { throw 'Stale PID would terminate an unrelated process.' }
    $saved = Save-LifeOSEnvironment
    try { Set-LifeOSEnvironment $loaded; if ($env:LIFE_OS_ORIGIN -ne 'http://127.0.0.1:3000') { throw 'Loopback configuration failed.' } }
    finally { Restore-LifeOSEnvironment $saved }
    foreach ($name in $saved.Keys) { if ([Environment]::GetEnvironmentVariable($name, 'Process') -cne $saved[$name]) { throw 'Caller environment was not restored.' } }
    if ($loaded.DataRoot -ne $root) { throw 'Config round trip failed.' }
    if ((Invoke-LifeOSAccount -Config $loaded -Status) -ne 'unconfigured') { throw 'Fresh account status failed.' }
    if (Test-Path (Join-Path $root 'owner.sqlite')) { throw 'Status inspection unexpectedly created a database.' }
    # Public fixture password exists only in the disposable test directory.
    $result = Invoke-LifeOSAccount -Config $loaded -InputText 'test-only-powershell-password'
    if ($result -notlike '*configured*') { throw 'Password stdin provisioning failed.' }
    if ((Invoke-LifeOSAccount -Config $loaded -Status) -ne 'configured') { throw 'Provisioned account status failed.' }
    $refused = $false
    try { Invoke-LifeOSAccount -Config $loaded -InputText 'test-only-powershell-password' | Out-Null } catch { $refused = $true }
    if (-not $refused) { throw 'Existing account was reset without an explicit flag.' }
    Invoke-LifeOSAccount -Config $loaded -InputText 'test-only-powershell-password' -Reset | Out-Null
    $null = Invoke-LifeOSDesktop -Config $loaded -Action prepare
    $null = Invoke-LifeOSDesktop -Config $loaded -Action prepare
    $grant = Invoke-LifeOSDesktop -Config $loaded -Action grant | ConvertFrom-Json
    if ($grant.token -notmatch '^[a-f0-9]{64}$') { throw 'Private desktop handoff failed.' }
    $grant = $null
    if ((Get-LifeOSSourceHash $project) -ne (Get-LifeOSSourceHash $project)) { throw 'Build fingerprint is unstable.' }
    [void](New-Item -ItemType Directory -Path $fixtureProject)
    'console.log("stdout-marker"); console.error("stderr-marker");' | Set-Content -LiteralPath (Join-Path $fixtureProject 'server.ts') -Encoding UTF8
    $logging = [pscustomobject]@{ ProjectRoot=$fixtureProject; DataRoot=$root; NodePath=$loaded.NodePath }
    Invoke-LifeOSLoggedServer $logging
    if ((Get-Content -Raw (Join-Path $root 'Logs/server.stdout.log')) -notlike '*stdout-marker*') { throw 'Stdout logging failed.' }
    if ((Get-Content -Raw (Join-Path $root 'Logs/server.stderr.log')) -notlike '*stderr-marker*') { throw 'Stderr logging failed.' }
    Write-Host 'PASS: PowerShell syntax, config, non-mutating status, stdin provisioning/reset, native stdout/stderr logging.'
    Write-Host 'Additional host acceptance covers scheduled startup, scheduled backup and D: drive readiness.'
} finally {
    Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $fixtureProject -Recurse -Force -ErrorAction SilentlyContinue
}
