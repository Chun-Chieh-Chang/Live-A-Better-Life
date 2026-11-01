[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ConfigPath, [switch]$OpenBrowser)
. (Join-Path $PSScriptRoot 'Common.ps1')
Assert-LifeOSWindows
$config = Get-LifeOSConfig $ConfigPath
if (-not (Test-Path -LiteralPath (Join-Path $config.ProjectRoot 'dist\index.html'))) { throw 'Run Setup.ps1 or build the application first.' }
if ((Invoke-LifeOSAccount -Config $config -Status) -ne 'configured') { throw 'Configure the owner password before starting the service.' }
$savedEnvironment = Save-LifeOSEnvironment
Set-LifeOSEnvironment $config
$keyPath = Join-Path $config.DataRoot 'gemini.dpapi'
$keyPtr = [IntPtr]::Zero
Push-Location $config.ProjectRoot
try {
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
