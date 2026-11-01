[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$VaultRoot)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Obsidian.ps1')
Register-LifeOSVault -VaultRoot $VaultRoot
