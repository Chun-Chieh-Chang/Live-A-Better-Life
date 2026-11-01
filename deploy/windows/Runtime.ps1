# User-scoped runtimes only. Downloads use official Node HTTPS metadata + SHA-256,
# or npm's normal integrity checks. No execution policy, TLS or certificate bypass.
function Get-LifeOSNativeVersion([string]$Executable) {
    if (-not $Executable -or -not (Test-Path -LiteralPath $Executable)) { return '' }
    try { $v = & $Executable --version; if ($LASTEXITCODE -eq 0) { return ([string]$v).Trim() } } catch {}
    return ''
}
function Ensure-LifeOSRuntime([string]$ToolsRoot, [string]$PreferredNode) {
    [void](New-Item -ItemType Directory -Path $ToolsRoot -Force)
    $node = $PreferredNode
    if (-not $node) { $found = Get-Command node.exe -ErrorAction SilentlyContinue; if ($found) { $node = $found.Source } }
    if ((Get-LifeOSNativeVersion $node) -notmatch '^v24\.') { $node = '' }
    if (-not $node) {
        $cached = Join-Path $ToolsRoot 'node-path.txt'
        if (Test-Path -LiteralPath $cached) {
            $candidate = (Get-Content -LiteralPath $cached -Raw).Trim()
            if ((Get-LifeOSNativeVersion $candidate) -match '^v24\.') { $node = $candidate }
        }
    }
    if (-not $node) {
        $architecture = $env:PROCESSOR_ARCHITEW6432
        if (-not $architecture) { $architecture = $env:PROCESSOR_ARCHITECTURE }
        switch ($architecture.ToUpperInvariant()) { 'AMD64' { $arch = 'x64' }; 'ARM64' { $arch = 'arm64' }; default { throw 'A 64-bit Windows x64/ARM64 runtime is required.' } }
        $tls = [Net.ServicePointManager]::SecurityProtocol
        try {
            [Net.ServicePointManager]::SecurityProtocol = $tls -bor [Net.SecurityProtocolType]::Tls12
            $releases = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -TimeoutSec 60
            $releases24 = @($releases | Where-Object { $_.version -match '^v24\.\d+\.\d+$' -and $_.files -contains ('win-' + $arch + '-zip') })
            if ($releases24.Count -eq 0) { throw 'No supported Node 24 archive found in official metadata.' }
            $version = $releases24[0].version
            $base = 'https://nodejs.org/dist/' + $version
            $name = 'node-' + $version + '-win-' + $arch
            $download = Join-Path $ToolsRoot ('download-' + [Guid]::NewGuid().ToString('N'))
            [void](New-Item -ItemType Directory -Path $download)
            try {
                $manifest = Join-Path $download 'SHASUMS256.txt'
                $archive = Join-Path $download ($name + '.zip')
                Invoke-WebRequest -UseBasicParsing -Uri ($base + '/SHASUMS256.txt') -OutFile $manifest -TimeoutSec 60
                Invoke-WebRequest -UseBasicParsing -Uri ($base + '/' + $name + '.zip') -OutFile $archive -TimeoutSec 180
                $pattern = '^[a-fA-F0-9]{64}\s+\*?' + [regex]::Escape($name + '.zip') + '$'
                $lines = @(Get-Content -LiteralPath $manifest | Where-Object { $_ -match $pattern })
                if ($lines.Count -ne 1) { throw 'Missing or ambiguous official Node checksum.' }
                $expected = ($lines[0] -split '\s+')[0]
                if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ine $expected) { throw 'Node SHA-256 mismatch. Archive will not be used.' }
                Expand-Archive -LiteralPath $archive -DestinationPath $download
                $target = Join-Path $ToolsRoot $name
                if (Test-Path -LiteralPath $target) { throw 'Unexpected existing runtime directory; refusing to replace it.' }
                Move-Item -LiteralPath (Join-Path $download $name) -Destination $target
                $node = Join-Path $target 'node.exe'
                if ((Get-LifeOSNativeVersion $node) -notmatch '^v24\.') { throw 'Downloaded runtime failed its version check.' }
                $node | Set-Content -LiteralPath (Join-Path $ToolsRoot 'node-path.txt') -Encoding UTF8
            } finally { Remove-Item -LiteralPath $download -Recurse -Force -ErrorAction SilentlyContinue }
        } finally { [Net.ServicePointManager]::SecurityProtocol = $tls }
    }
    $env:PATH = (Split-Path -Parent $node) + ';' + $env:PATH
    $bun = ''
    $foundBun = Get-Command bun.exe,bun.cmd,bun -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($foundBun -and (Get-LifeOSNativeVersion $foundBun.Source) -eq '1.4.4') { $bun = $foundBun.Source }
    $privateBun = Join-Path $ToolsRoot 'bun\node_modules\.bin\bun.cmd'
    if (-not $bun -and (Get-LifeOSNativeVersion $privateBun) -eq '1.4.4') { $bun = $privateBun }
    if (-not $bun) {
        $npm = Join-Path (Split-Path -Parent $node) 'node_modules\npm\bin\npm-cli.js'
        if (-not (Test-Path -LiteralPath $npm)) { throw 'The selected Node 24 runtime has no npm CLI.' }
        & $node $npm install --prefix (Join-Path $ToolsRoot 'bun') --cache (Join-Path $ToolsRoot 'npm-cache') --no-package-lock --no-audit --no-fund bun@1.4.4 | Out-Host
        if ($LASTEXITCODE -ne 0 -or (Get-LifeOSNativeVersion $privateBun) -ne '1.4.4') { throw 'User-scoped Bun installation failed.' }
        $bun = $privateBun
    }
    $env:PATH = (Split-Path -Parent $bun) + ';' + $env:PATH
    return [pscustomobject]@{NodePath=$node; BunPath=$bun}
}
