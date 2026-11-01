[CmdletBinding()]
param(
    [string]$ProjectRoot = (Join-Path $PSScriptRoot '..\..'),
    [string]$DataRoot,
    [ValidateRange(1024,65535)][int]$Port = 3000,
    [switch]$Unattended,
    [switch]$SkipBuild
)
. (Join-Path $PSScriptRoot 'Common.ps1')
Assert-LifeOSWindows
$project = (Resolve-Path -LiteralPath $ProjectRoot).ProviderPath.TrimEnd('\')
if (-not (Test-Path -LiteralPath (Join-Path $project 'bun.lock'))) { throw 'Select the project root containing bun.lock.' }
if (-not $DataRoot) { $DataRoot = Join-Path (Split-Path -Parent $project) 'Live-A-Better-Life-Data' }
$data = [IO.Path]::GetFullPath($DataRoot).TrimEnd('\')
if ($data.StartsWith($project + '\', [StringComparison]::OrdinalIgnoreCase) -or $data -eq $project -or
    $data -eq [IO.Path]::GetPathRoot($data).TrimEnd('\')) { throw 'Use a dedicated data directory outside the project.' }
if ($data.StartsWith('\\')) { throw 'SQLite data must use a local disk, not a network share.' }
$configPath = Join-Path $data 'config.json'
if (Test-Path -LiteralPath $configPath) {
    $previous = Get-LifeOSConfig $configPath
    if ($previous.DataRoot -ne $data -or $previous.ProjectRoot -ne $project) { throw 'Existing configuration belongs to a different workspace; preserve it and select a new data directory.' }
}
if ((Test-Path -LiteralPath $data) -and -not (Test-Path -LiteralPath $configPath) -and
    @(Get-ChildItem -LiteralPath $data -Force).Count -gt 0) { throw 'Refusing to adopt a nonempty directory without a Life OS config.' }
$node = (Get-Command node.exe -ErrorAction Stop).Source
$nodeMajor = & $node -p 'process.versions.node.slice(0,2)'
if ($LASTEXITCODE -ne 0 -or $nodeMajor -ne '24') { throw 'Install Node.js 24 before running setup.' }
$bunCommand = Get-Command bun.exe,bun.cmd,bun -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $bunCommand) { throw 'Install Bun 1.4.4 before running setup.' }
$bun = $bunCommand.Source
$bunVersion = & $bun --version
if ($LASTEXITCODE -ne 0 -or $bunVersion -ne '1.4.4') { throw 'Bun 1.4.4 is required.' }
[void](New-Item -ItemType Directory -Path $data -Force)
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls.exe $data '/inheritance:r' '/grant:r' ($identity + ':(OI)(CI)F') '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Failed to protect the private data directory.' }
foreach ($name in @('Backups','Logs')) { [void](New-Item -ItemType Directory -Path (Join-Path $data $name) -Force) }
$config = [ordered]@{ Version=1; ProjectRoot=$project; DataRoot=$data; NodePath=$node; Port=$Port }
$config | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
Push-Location $project
try {
    if (-not $SkipBuild) {
    & $bun install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
    & $bun run lint
    if ($LASTEXITCODE -ne 0) { throw 'Type check failed.' }
    & $bun run build
    if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
    }
} finally { Pop-Location }
$config = Get-LifeOSConfig $configPath
if ((Invoke-LifeOSAccount -Config $config -Status) -eq 'unconfigured') {
    if ($Unattended) { $null = Invoke-LifeOSDesktop -Config $config -Action prepare }
    else { & (Join-Path $PSScriptRoot 'Set-OwnerPassword.ps1') -ConfigPath $configPath }
}
Write-Host ('Prepared. Configuration: ' + $configPath)
Write-Host 'Next: run Start-LifeOS.ps1 and Verify.ps1. Tasks are not registered automatically.'
