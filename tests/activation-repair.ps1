param([string]$BunPath)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../deploy/windows/Common.ps1')
if (-not $BunPath) {
    $toolsRoot = Join-Path (Split-Path $PSScriptRoot -Parent) 'Live-A-Better-Life-Tools'
    $pointer = Join-Path $toolsRoot 'bun-path.txt'
    if (Test-Path -LiteralPath $pointer) { $BunPath = (Get-Content -LiteralPath $pointer -Raw).Trim() }
    else { $BunPath = Join-Path $toolsRoot 'bun/node_modules/.bin/bun.cmd' }
}
$fixtureRoot = Join-Path ([IO.Path]::GetTempPath()) ('life-os-repair-' + [Guid]::NewGuid().ToString('N'))
[void](New-Item -ItemType Directory -Path $fixtureRoot)
$savedCache = $env:BUN_INSTALL_CACHE_DIR
$env:BUN_INSTALL_CACHE_DIR = Join-Path $fixtureRoot 'cache'
try {
    '{"name":"life-os-repair-test","private":true,"dependencies":{"is-number":"7.0.0"},"scripts":{"lint":"node check.cjs","build":"node build.cjs"}}' | Set-Content -LiteralPath (Join-Path $fixtureRoot 'package.json') -Encoding ASCII
    'if(!require("is-number")(42)) process.exit(1);' | Set-Content -LiteralPath (Join-Path $fixtureRoot 'check.cjs') -Encoding ASCII
    'require("fs").writeFileSync("built.txt","ok");' | Set-Content -LiteralPath (Join-Path $fixtureRoot 'build.cjs') -Encoding ASCII
    'private records remain intact' | Set-Content -LiteralPath (Join-Path $fixtureRoot 'records.txt') -Encoding ASCII
    Push-Location $fixtureRoot
    try { & $BunPath install; if ($LASTEXITCODE -ne 0) { throw 'Fixture installation failed.' } } finally { Pop-Location }
    $entry = Join-Path $fixtureRoot 'node_modules/is-number/index.js'
    Remove-Item -LiteralPath $entry
    Repair-LifeOSApplication -ProjectRoot $fixtureRoot -BunPath $BunPath
    if (-not (Test-Path -LiteralPath $entry)) { throw 'Missing package entry was not repaired.' }
    'module.exports = () => false;' | Set-Content -LiteralPath $entry -Encoding ASCII
    Repair-LifeOSApplication -ProjectRoot $fixtureRoot -BunPath $BunPath
    if ((Get-Content -LiteralPath (Join-Path $fixtureRoot 'built.txt') -Raw).Trim() -ne 'ok') { throw 'Build did not complete.' }
    $cachedEntries = @(Get-ChildItem -LiteralPath $env:BUN_INSTALL_CACHE_DIR -Recurse -File -Filter index.js)
    if ($cachedEntries.Count -eq 0) { throw 'Cache fixture missing.' }
    foreach ($cached in $cachedEntries) { 'module.exports = () => false;' | Set-Content -LiteralPath $cached.FullName -Encoding ASCII }
    Repair-LifeOSApplication -ProjectRoot $fixtureRoot -BunPath $BunPath
    Remove-Item -LiteralPath (Join-Path $fixtureRoot 'built.txt')
    'process.exit(1);' | Set-Content -LiteralPath (Join-Path $fixtureRoot 'check.cjs') -Encoding ASCII
    $failed = $false
    try { Repair-LifeOSApplication -ProjectRoot $fixtureRoot -BunPath $BunPath } catch { $failed = $true }
    if (-not $failed -or (Test-Path -LiteralPath (Join-Path $fixtureRoot 'built.txt'))) { throw 'A failed check continued into build.' }
    if ((Get-Content -LiteralPath (Join-Path $fixtureRoot 'records.txt') -Raw).Trim() -ne 'private records remain intact') { throw 'Records were changed.' }
    Write-Host 'PASS: removed dependency repaired; corrupted dependency and cache repaired; failed check stops build; records preserved.'
} finally {
    $env:BUN_INSTALL_CACHE_DIR = $savedCache
    $resolvedFixture = [IO.Path]::GetFullPath($fixtureRoot)
    $tempParent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
    if (-not $resolvedFixture.StartsWith($tempParent, [StringComparison]::OrdinalIgnoreCase) -or (Split-Path -Leaf $resolvedFixture) -notlike 'life-os-repair-*') { throw 'Unsafe cleanup path.' }
    Remove-Item -LiteralPath $resolvedFixture -Recurse -Force
}
