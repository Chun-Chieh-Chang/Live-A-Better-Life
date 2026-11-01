[CmdletBinding()]
param()
# Opens the real folder dialog from a hidden process (as the server does), then proves it is visible,
# in the foreground, can be cancelled, and can return a chosen folder. Needs an interactive Windows desktop.
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System; using System.Text; using System.Runtime.InteropServices;
public static class DialogProbe {
    delegate bool EnumProc(IntPtr h, IntPtr l);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc p, IntPtr l);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern IntPtr GetDlgItem(IntPtr h, int id);
    [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] static extern IntPtr PostMessage(IntPtr h, uint msg, IntPtr w, IntPtr l);
    static string Text(IntPtr h) { var s = new StringBuilder(256); GetWindowText(h, s, 256); return s.ToString(); }
    static string Class(IntPtr h) { var s = new StringBuilder(256); GetClassName(h, s, 256); return s.ToString(); }
    public static IntPtr Find(uint pid, string title) {
        IntPtr found = IntPtr.Zero;
        EnumWindows((h, l) => {
            uint p; GetWindowThreadProcessId(h, out p);
            if (p == pid && IsWindowVisible(h) && Class(h) == "#32770" && Text(h) == title) { found = h; return false; }
            return true; }, IntPtr.Zero);
        return found;
    }
    public static uint ForegroundPid() { uint pid; GetWindowThreadProcessId(GetForegroundWindow(), out pid); return pid; }
    public static void Press(IntPtr dialog, int id) { PostMessage(GetDlgItem(dialog, id), 0x00F5, IntPtr.Zero, IntPtr.Zero); }
}
'@
$script = Join-Path (Split-Path $PSScriptRoot -Parent) 'deploy\windows\Choose-NotesFolder.ps1'
$title = '選擇筆記存放資料夾'
$target = Join-Path ([IO.Path]::GetTempPath()) ('life-os-dialog-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $target | Out-Null

function Invoke-Dialog([string]$action) {
    $out = Join-Path ([IO.Path]::GetTempPath()) ('dialog-out-' + [guid]::NewGuid().ToString('N') + '.txt')
    $proc = Start-Process -FilePath 'powershell.exe' -WindowStyle Hidden -PassThru -RedirectStandardOutput $out `
        -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $script, '-InitialPath', $(if ($action -eq 'choose') { $target } else { $env:TEMP }))
    try {
        $dialog = [IntPtr]::Zero
        for ($i = 0; $i -lt 60 -and $dialog -eq [IntPtr]::Zero; $i++) {
            Start-Sleep -Milliseconds 250
            $dialog = [DialogProbe]::Find([uint32]$proc.Id, $title)
        }
        if ($dialog -eq [IntPtr]::Zero) { throw 'Dialog never became visible on the desktop.' }
        Start-Sleep -Milliseconds 500
        $foregroundPid = [DialogProbe]::ForegroundPid()
        $foreground = $foregroundPid -eq $proc.Id
        if ($action -eq 'choose') { [DialogProbe]::Press($dialog, 1) }
        else { [DialogProbe]::Press($dialog, 2) }
        if (-not $proc.WaitForExit(15000)) { throw 'Dialog process did not finish after the button was pressed.' }
        $result = (Get-Content -LiteralPath $out -Raw -Encoding UTF8 | ConvertFrom-Json).path
        [pscustomobject]@{ Foreground = $foreground; ForegroundPid = $foregroundPid; Path = $result }
    } finally {
        if (-not $proc.HasExited) { $proc.Kill() }
        Remove-Item -LiteralPath $out -Force -ErrorAction SilentlyContinue
    }
}

try {
    $cancel = Invoke-Dialog 'cancel'
    $choose = Invoke-Dialog 'choose'
    if ($null -ne $cancel.Path) { throw 'Cancelling must return no folder.' }
    if ($choose.Path -ne $target) { throw "Expected '$target' but got '$($choose.Path)'." }
    if ($cancel.ForegroundPid -eq 0 -or $choose.ForegroundPid -eq 0) { throw 'Cancel and choose work, but foreground was not verified: the desktop has no active foreground window (screen locked or nobody at the keyboard). Run this on an unlocked desktop.' }
    if (-not $cancel.Foreground -or -not $choose.Foreground) { throw 'Dialog was visible but not in the foreground.' }
    'Folder dialog foreground check passed.'
} finally {
    Remove-Item -LiteralPath $target -Force -Recurse -ErrorAction SilentlyContinue
}
