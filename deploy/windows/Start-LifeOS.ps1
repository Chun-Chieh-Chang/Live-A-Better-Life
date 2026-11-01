[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ConfigPath, [switch]$OpenBrowser)
. (Join-Path $PSScriptRoot 'Common.ps1')
. (Join-Path $PSScriptRoot 'Obsidian.ps1')
Assert-LifeOSWindows
$config = Get-LifeOSConfig $ConfigPath
$notesRoot = if ($config.PSObject.Properties.Name -contains 'NotesRoot') { $config.NotesRoot } else { Join-Path $config.DataRoot 'Notes' }
Register-LifeOSVault -VaultRoot $notesRoot
if (-not (Test-Path -LiteralPath (Join-Path $config.ProjectRoot 'dist\index.html'))) { throw 'Run Setup.ps1 or build the application first.' }
if ((Invoke-LifeOSAccount -Config $config -Status) -ne 'configured') { throw 'Configure the owner password before starting the service.' }
$savedEnvironment = Save-LifeOSEnvironment
Set-LifeOSEnvironment $config
$keyPath = Join-Path $config.DataRoot 'gemini.dpapi'
$keyPtr = [IntPtr]::Zero
Push-Location $config.ProjectRoot
try {
    $agnesKeyPath = Join-Path $config.DataRoot 'agnes.dpapi'
    if (Test-Path -LiteralPath $agnesKeyPath) {
        Add-Type -AssemblyName System.Security
        $agnesBytes = [Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String([IO.File]::ReadAllText($agnesKeyPath)), $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
        try { $env:AGNES_API_KEY = [Text.Encoding]::UTF8.GetString($agnesBytes) } finally { [Array]::Clear($agnesBytes, 0, $agnesBytes.Length) }
    }
    if (Test-Path -LiteralPath $keyPath) {
        $key = (Get-Content -LiteralPath $keyPath -Raw).Trim() | ConvertTo-SecureString
        $keyPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($key)
        $env:GEMINI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPtr)
    }
    Invoke-LifeOSLoggedServer -Config $config -OpenBrowser:$OpenBrowser
} finally {
    Restore-LifeOSEnvironment $savedEnvironment
    Pop-Location
    if ($keyPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPtr); $key.Dispose() }
}
