[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ConfigPath)
. (Join-Path $PSScriptRoot 'Common.ps1')
Assert-LifeOSWindows
$config = Get-LifeOSConfig $ConfigPath
$base = 'http://127.0.0.1:' + $config.Port
$health = Invoke-RestMethod -Uri ($base + '/healthz') -TimeoutSec 10
$ready = Invoke-RestMethod -Uri ($base + '/readyz') -TimeoutSec 10
$session = Invoke-RestMethod -Uri ($base + '/api/auth/session') -TimeoutSec 10
if ($health.status -ne 'ok' -or $ready.status -ne 'ready' -or $session.mode -ne 'personal' -or -not $session.configured) { throw 'Service is not ready in personal mode.' }
$privateStatus = 0
try { $private = Invoke-WebRequest -UseBasicParsing -Uri ($base + '/api/data') -TimeoutSec 10; $privateStatus = [int]$private.StatusCode }
catch { if (-not $_.Exception.Response) { throw }; $privateStatus = [int]$_.Exception.Response.StatusCode }
if ($privateStatus -ne 401) { throw 'Private data endpoint unexpectedly accepts an anonymous request.' }
$listeners = Get-NetTCPConnection -State Listen -LocalPort $config.Port
if (@($listeners | Where-Object { $_.LocalAddress -ne '127.0.0.1' }).Count -gt 0) { throw 'Unexpected non-loopback listener.' }
Write-Host ('PASS: personal service is ready and bound to loopback on port ' + $config.Port)
Write-Host 'Complete browser login, journal upload/download, backup and restart checks before marking this Windows host accepted.'
