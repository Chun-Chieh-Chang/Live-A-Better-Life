Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../deploy/windows/Common.ps1')
. (Join-Path $PSScriptRoot '../deploy/windows/LocalFolders.ps1')
function Get-ScheduledTask { param($TaskName) return $null }
$fixture = Join-Path ([IO.Path]::GetTempPath()) ('life-os-move-' + [Guid]::NewGuid().ToString('N'))
try {
    $project = Join-Path $fixture 'Live-A-Better-Life'
    $oldData = Join-Path $fixture 'Live-A-Better-Life-Data'
    $oldTools = Join-Path $fixture 'Live-A-Better-Life-Tools'
    $newData = Join-Path $project 'Live-A-Better-Life-Data'
    $newTools = Join-Path $project 'Live-A-Better-Life-Tools'
    foreach ($directory in @($project,$oldData,$oldTools)) { [void](New-Item -ItemType Directory -Path $directory -Force) }
    Set-Content -LiteralPath (Join-Path $project 'server.ts') -Value '// fixture'
    Set-Content -LiteralPath (Join-Path $oldData 'agnes.dpapi') -Value 'test-only-encrypted-file-placeholder'
    $before = Get-LifeOSFileHash (Join-Path $oldData 'agnes.dpapi')
    $config = @{Version=1;ProjectRoot=$project;DataRoot=$oldData;NodePath=(Join-Path $oldData 'Tools/node.exe');NotesRoot=(Join-Path $oldData 'Notes');Port=3002}
    $config | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $oldData 'config.json') -Encoding UTF8
    Set-Content -LiteralPath (Join-Path $oldTools 'node-path.txt') -Value (Join-Path $oldTools 'node.exe')
    Move-LifeOSLocalFolders $project
    Move-LifeOSLocalFolders $project
    $saved = Get-LifeOSConfig (Join-Path $newData 'config.json')
    if ($saved.DataRoot -ne $newData -or $saved.NodePath -ne (Join-Path $newData 'Tools/node.exe') -or $saved.NotesRoot -ne (Join-Path $newData 'Notes')) { throw 'Paths did not migrate.' }
    if ((Get-LifeOSFileHash (Join-Path $newData 'agnes.dpapi')) -ne $before) { throw 'Encrypted file was altered.' }
    if ((Get-Content -LiteralPath (Join-Path $newTools 'node-path.txt') -Raw).Trim() -ne (Join-Path $newTools 'node.exe')) { throw 'Runtime pointer did not migrate.' }
    if ((Test-Path -LiteralPath $oldData) -or (Test-Path -LiteralPath $oldTools)) { throw 'Sibling folders remained.' }
    [void](New-Item -ItemType Directory -Path $oldData)
    $rejected = $false
    try { Move-LifeOSLocalFolders $project } catch { $rejected = $true }
    if (-not $rejected -or -not (Test-Path -LiteralPath (Join-Path $newData 'agnes.dpapi'))) { throw 'Duplicate folders were not preserved.' }
    Write-Host 'PASS: directory migration preserves encrypted bytes, remaps runtime/notes, repeats safely and refuses collisions.'
} finally {
    if ([IO.Path]::GetFullPath($fixture).StartsWith([IO.Path]::GetTempPath(), [StringComparison]::OrdinalIgnoreCase)) { Remove-Item -LiteralPath $fixture -Recurse -Force }
}
