[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ConfigPath, [switch]$Reset)
. (Join-Path $PSScriptRoot 'Common.ps1')
Assert-LifeOSWindows
$config = Get-LifeOSConfig $ConfigPath
$first = Read-Host 'Owner password (14-256 characters)' -AsSecureString
$second = Read-Host 'Repeat owner password' -AsSecureString
$firstPtr = [IntPtr]::Zero
$secondPtr = [IntPtr]::Zero
try {
    $firstPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($first)
    $secondPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($second)
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($firstPtr)
    $repeat = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secondPtr)
    if ($plain -cne $repeat) { throw 'Passwords do not match. Account unchanged.' }
    Invoke-LifeOSAccount -Config $config -InputText $plain -Reset:$Reset
} finally {
    $plain = $null
    $repeat = $null
    if ($firstPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($firstPtr) }
    if ($secondPtr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secondPtr) }
    $first.Dispose()
    $second.Dispose()
}
