[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ConfigPath)
. (Join-Path $PSScriptRoot 'Common.ps1')
Assert-LifeOSWindows
$config = Get-LifeOSConfig $ConfigPath
$configPathResolved = (Resolve-Path -LiteralPath $ConfigPath).ProviderPath
$scriptPath = Join-Path $PSScriptRoot 'Activate.ps1'
$legacyScriptPath = Join-Path $PSScriptRoot 'Open-LifeOS.ps1'
$powerShellPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
# Fixed command only: never forward the URL, query string or caller-supplied arguments.
$command = '"' + $powerShellPath + '" -NoProfile -WindowStyle Hidden -File "' + $scriptPath + '" -ProjectRoot "' + $config.ProjectRoot + '"'
$legacyCommand = '"' + $powerShellPath + '" -NoProfile -WindowStyle Hidden -File "' + $legacyScriptPath + '" -ConfigPath "' + $configPathResolved + '"'
$previousCommand = $command
$command += ' -ShowErrors'
$keyPath = 'Software\Classes\lifeos'
$existing = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey($keyPath + '\shell\open\command')
if ($existing) {
    try { if ($existing.GetValue('') -ne $command -and $existing.GetValue('') -ne $legacyCommand -and $existing.GetValue('') -ne $previousCommand) { throw 'The lifeos link handler belongs to another installation; it was not replaced.' } }
    finally { $existing.Dispose() }
}
$key = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($keyPath)
try {
    $key.SetValue('', 'URL:把日子過好')
    $key.SetValue('URL Protocol', '')
    $commandKey = $key.CreateSubKey('shell\open\command')
    try { $commandKey.SetValue('', $command) } finally { $commandKey.Dispose() }
} finally { $key.Dispose() }
Write-Host 'Registered current-user Life OS launch button handler.'
