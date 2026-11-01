Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-LifeOSWindows {
    if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
        throw 'This entry point requires Windows. No host changes were made.'
    }
}

function Get-LifeOSConfig([string]$ConfigPath) {
    $resolved = (Resolve-Path -LiteralPath $ConfigPath).ProviderPath
    $config = Get-Content -LiteralPath $resolved -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($config.Version -ne 1 -or -not [IO.Path]::IsPathRooted($config.ProjectRoot) -or
        -not [IO.Path]::IsPathRooted($config.DataRoot) -or -not [IO.Path]::IsPathRooted($config.NodePath) -or
        $config.Port -lt 1024 -or $config.Port -gt 65535) { throw 'Invalid Life OS configuration.' }
    if (-not (Test-Path -LiteralPath (Join-Path $config.ProjectRoot 'server.ts'))) { throw 'Project files are missing.' }
    return $config
}

function Set-LifeOSEnvironment($Config) {
    $env:LIFE_OS_DESKTOP = '1'
    $env:LIFE_OS_MODE = 'personal'
    $env:LIFE_OS_BIND = '127.0.0.1'
    $env:LIFE_OS_ORIGIN = 'http://127.0.0.1:' + $Config.Port
    $env:LIFE_OS_NOTES_PATH = if ($Config.PSObject.Properties.Name -contains 'NotesRoot') { $Config.NotesRoot } else { Join-Path $Config.DataRoot 'Notes' }
    $env:LIFE_OS_DB_PATH = Join-Path $Config.DataRoot 'owner.sqlite'
    $env:LIFE_OS_BACKUP_DIR = Join-Path $Config.DataRoot 'Backups'
    $env:PORT = [string]$Config.Port
    $env:NODE_ENV = 'production'
}

function Invoke-LifeOSAccount($Config, [string]$InputText, [switch]$Reset, [switch]$Status) {
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $Config.NodePath
    $info.WorkingDirectory = $Config.ProjectRoot
    $info.Arguments = '--import tsx scripts/account.ts'
    if ($Reset) { $info.Arguments += ' --reset' }
    if ($Status) { $info.Arguments += ' --status' }
    $info.UseShellExecute = $false
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.EnvironmentVariables['LIFE_OS_DB_PATH'] = Join-Path $Config.DataRoot 'owner.sqlite'
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $info
    try {
        [void]$process.Start()
        $outputTask = $process.StandardOutput.ReadToEndAsync()
        $errorTask = $process.StandardError.ReadToEndAsync()
        # Send UTF-8 bytes directly; Windows console code pages must not change the password.
        if (-not $Status) {
            $bytes = [Text.Encoding]::UTF8.GetBytes($InputText)
            try { $process.StandardInput.BaseStream.Write($bytes, 0, $bytes.Length); $process.StandardInput.BaseStream.Flush() }
            finally { [Array]::Clear($bytes, 0, $bytes.Length) }
        }
        $process.StandardInput.BaseStream.Close()
        $process.WaitForExit()
        $outputText = $outputTask.GetAwaiter().GetResult()
        $errorText = $errorTask.GetAwaiter().GetResult()
        if ($process.ExitCode -ne 0) { throw ('Account operation failed. ' + $errorText) }
        return $outputText.Trim()
    } finally { $process.Dispose() }
}

function Invoke-LifeOSLoggedServer($Config, [switch]$OpenBrowser) {
    $logs = Join-Path $Config.DataRoot 'Logs'
    foreach ($name in @('server.stdout.log','server.stderr.log')) {
        $file = Join-Path $logs $name
        if ((Test-Path -LiteralPath $file) -and (Get-Item -LiteralPath $file).Length -gt 5MB) {
            Move-Item -LiteralPath $file -Destination ($file + '.1') -Force
        }
    }
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $Config.NodePath
    $info.Arguments = '--import tsx server.ts'
    $info.WorkingDirectory = $Config.ProjectRoot
    $info.UseShellExecute = $false
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $info
    $outFile = $null
    $errFile = $null
    try {
        $outFile = [IO.File]::Open((Join-Path $logs 'server.stdout.log'), [IO.FileMode]::Append, [IO.FileAccess]::Write, [IO.FileShare]::Read)
        $errFile = [IO.File]::Open((Join-Path $logs 'server.stderr.log'), [IO.FileMode]::Append, [IO.FileAccess]::Write, [IO.FileShare]::Read)
        [void]$process.Start()
        $record = @{Pid=$process.Id; StartedUtc=$process.StartTime.ToUniversalTime().ToString('O'); NodePath=$Config.NodePath; ProjectRoot=$Config.ProjectRoot}
        $record | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $Config.DataRoot 'server-process.json') -Encoding UTF8
        # Copy bytes using .NET tasks; native stderr must not become a PowerShell terminating error.
        $outTask = $process.StandardOutput.BaseStream.CopyToAsync($outFile)
        $errTask = $process.StandardError.BaseStream.CopyToAsync($errFile)
        if ($OpenBrowser) { Wait-LifeOSDesktopReady -Config $Config -Process $process; Open-LifeOSBrowser $Config }
        $process.WaitForExit()
        $null = $outTask.GetAwaiter().GetResult()
        $null = $errTask.GetAwaiter().GetResult()
        if ($process.ExitCode -ne 0) { throw 'Life OS exited with an error. See Logs\server.stderr.log.' }
    } finally {
        if ($outFile) { $outFile.Dispose() }
        if ($errFile) { $errFile.Dispose() }
        $process.Dispose()
    }
}

function Save-LifeOSEnvironment {
    $saved = @{}
    foreach ($name in @('LIFE_OS_DESKTOP','LIFE_OS_MODE','LIFE_OS_BIND','LIFE_OS_ORIGIN','LIFE_OS_DB_PATH','LIFE_OS_NOTES_PATH','LIFE_OS_BACKUP_DIR','PORT','NODE_ENV','GEMINI_API_KEY','AGNES_API_KEY','AI_PROVIDER','AGNES_MODEL','GEMINI_MODEL')) {
        $saved[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
    }
    return $saved
}

function Restore-LifeOSEnvironment($Saved) {
    foreach ($name in $Saved.Keys) {
        if ($null -eq $Saved[$name]) { Remove-Item -LiteralPath ('Env:' + $name) -ErrorAction SilentlyContinue }
        else { [Environment]::SetEnvironmentVariable($name, $Saved[$name], 'Process') }
    }
}

function Invoke-LifeOSDesktop($Config, [ValidateSet('prepare','grant')][string]$Action) {
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = $Config.NodePath
    $info.WorkingDirectory = $Config.ProjectRoot
    $info.Arguments = '--import tsx scripts/desktop.ts ' + $Action
    $info.UseShellExecute = $false
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.EnvironmentVariables['LIFE_OS_DB_PATH'] = Join-Path $Config.DataRoot 'owner.sqlite'
    $process = New-Object Diagnostics.Process
    $process.StartInfo = $info
    try {
        [void]$process.Start()
        $out = $process.StandardOutput.ReadToEndAsync()
        $err = $process.StandardError.ReadToEndAsync()
        $process.WaitForExit()
        $output = $out.GetAwaiter().GetResult()
        $errorText = $err.GetAwaiter().GetResult()
        if ($process.ExitCode -ne 0) { throw ('Desktop operation failed. ' + $errorText) }
        return $output.Trim()
    } finally { $process.Dispose() }
}

function Get-LifeOSFileHash([string]$LiteralPath) {
    $sha = [Security.Cryptography.SHA256]::Create()
    $stream = $null
    try {
        $stream = [IO.File]::OpenRead($LiteralPath)
        return ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-','').ToLowerInvariant()
    } finally {
        if ($stream) { $stream.Dispose() }
        $sha.Dispose()
    }
}

function Get-LifeOSSourceHash([string]$ProjectRoot) {
    $paths = @()
    foreach ($name in @('src','server','scripts','public','deploy')) {
        if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot $name))) { continue }
        $paths += Get-ChildItem -LiteralPath (Join-Path $ProjectRoot $name) -Recurse -File | Sort-Object FullName
    }
    foreach ($name in @('server.ts','package.json','bun.lock','vite.config.ts','tsconfig.json','index.html')) { $paths += Get-Item -LiteralPath (Join-Path $ProjectRoot $name) }
    $lines = @($paths | ForEach-Object { $_.FullName.Substring($ProjectRoot.Length) + ':' + (Get-LifeOSFileHash -LiteralPath $_.FullName) })
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes(($lines -join "`n"))))).Replace('-','').ToLowerInvariant() }
    finally { $sha.Dispose() }
}

function Test-LifeOSDesktopReady($Config) {
    $base = 'http://127.0.0.1:' + $Config.Port
    try {
        $ready = Invoke-RestMethod -Uri ($base + '/readyz') -TimeoutSec 1
        $session = Invoke-RestMethod -Uri ($base + '/api/auth/session') -TimeoutSec 1
        return ($ready.status -eq 'ready' -and $session.mode -eq 'personal' -and $session.configured -and $session.desktop)
    } catch { return $false }
}
function Wait-LifeOSDesktopReady($Config, $Process = $null) {
    $watch = [Diagnostics.Stopwatch]::StartNew()
    while (-not (Test-LifeOSDesktopReady $Config)) {
        if ($Process) { $Process.Refresh(); if ($Process.HasExited) { throw 'Server exited before becoming ready. Inspect the private Logs directory.' } }
        if ($watch.Elapsed.TotalSeconds -ge 30) { throw 'Server did not become ready within 30 seconds. Inspect the private Logs directory.' }
        Start-Sleep -Milliseconds 400
    }
}
function Open-LifeOSBrowser($Config) {
    $grant = Invoke-LifeOSDesktop -Config $Config -Action grant | ConvertFrom-Json
    Start-Process ('http://127.0.0.1:' + $Config.Port + '/#desktop=' + $grant.token)
    $grant = $null
}

function Test-LifeOSProcessRecord($Record, $Process, [string]$ProjectRoot) {
    try {
        return ($Process.Path -eq $Record.NodePath -and
            $Process.StartTime.ToUniversalTime().Ticks -eq ([datetime]$Record.StartedUtc).ToUniversalTime().Ticks -and
            $Record.ProjectRoot -eq $ProjectRoot)
    } catch { return $false }
}

function Protect-LifeOSDataDirectory([string]$LiteralPath) {
    $acl = New-Object Security.AccessControl.DirectorySecurity
    $acl.SetAccessRuleProtection($true, $false)
    $owner = [Security.Principal.WindowsIdentity]::GetCurrent().User

    foreach ($sid in @($owner.Value, 'S-1-5-18', 'S-1-5-32-544')) {
        $identity = New-Object Security.Principal.SecurityIdentifier($sid)
        $rule = New-Object Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
        $acl.AddAccessRule($rule)
    }
    $directory = Get-Item -LiteralPath $LiteralPath
    if ($directory.PSObject.Methods.Name -contains 'SetAccessControl') { $directory.SetAccessControl($acl) }
    else { [IO.FileSystemAclExtensions]::SetAccessControl($directory, $acl) }
}

function Get-LifeOSDirectoryAcl([string]$LiteralPath) {
    $directory = Get-Item -LiteralPath $LiteralPath
    if ($directory.PSObject.Methods.Name -contains 'GetAccessControl') { return $directory.GetAccessControl() }
    return [IO.FileSystemAclExtensions]::GetAccessControl($directory)
}

function Repair-LifeOSApplication([string]$ProjectRoot, [string]$BunPath) {
    Push-Location $ProjectRoot
    $freshCache = $null
    $originalCache = $env:BUN_INSTALL_CACHE_DIR
    try {
        for ($attempt = 0; $attempt -lt 2; $attempt++) {
            try {
                $installArgs = @('install', '--frozen-lockfile', '--force', '--backend', 'copyfile')
                if ($attempt -eq 1) {
                    $freshCache = Join-Path ([IO.Path]::GetTempPath()) ('life-os-package-repair-' + [Guid]::NewGuid().ToString('N'))
                    [void](New-Item -ItemType Directory -Path $freshCache)
                    Protect-LifeOSDataDirectory -LiteralPath $freshCache
                    $env:BUN_INSTALL_CACHE_DIR = $freshCache
                    $installArgs += @('--cache-dir', $freshCache, '--no-cache')
                }
                & $BunPath @installArgs
                if ($LASTEXITCODE -ne 0) { throw 'Dependency repair failed.' }
                & $BunPath run lint
                if ($LASTEXITCODE -ne 0) { throw 'Application check failed.' }
                & $BunPath run build
                if ($LASTEXITCODE -ne 0) { throw 'Application build failed.' }
                return
            } catch {
                if ($attempt -eq 1) { throw }
                Write-Host 'Retrying preparation with a fresh package cache...'
            }
        }
    } finally {
        Pop-Location
        $env:BUN_INSTALL_CACHE_DIR = $originalCache
        if ($freshCache) {
            $resolvedCache = [IO.Path]::GetFullPath($freshCache)
            $tempParent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
            if (-not $resolvedCache.StartsWith($tempParent, [StringComparison]::OrdinalIgnoreCase) -or (Split-Path -Leaf $resolvedCache) -notlike 'life-os-package-repair-*') { throw 'Unsafe repair cache cleanup path.' }
            Remove-Item -LiteralPath $resolvedCache -Recurse -Force
        }
    }
}
