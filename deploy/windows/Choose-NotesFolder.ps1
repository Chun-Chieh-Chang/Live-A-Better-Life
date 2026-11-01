[CmdletBinding()]
param([string]$InitialPath)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;
public static class LifeOSFolderDialog {
    [ComImport, Guid("DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7")] class FileOpenDialog {}
    [ComImport, Guid("42F85136-DB7E-439C-85F1-E4075D135FC8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IFileDialog {
        [PreserveSig] int Show(IntPtr owner);
        void SetFileTypes(uint count, IntPtr filters);
        void SetFileTypeIndex(uint index);
        void GetFileTypeIndex(out uint index);
        void Advise(IntPtr events, out uint cookie);
        void Unadvise(uint cookie);
        void SetOptions(uint options);
        void GetOptions(out uint options);
        void SetDefaultFolder(IShellItem item);
        void SetFolder(IShellItem item);
        void GetFolder(out IShellItem item);
        void GetCurrentSelection(out IShellItem item);
        void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string name);
        void GetFileName(out IntPtr name);
        void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string title);
        void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string label);
        void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string label);
        void GetResult(out IShellItem item);
    }
    [ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IShellItem {
        void BindToHandler(IntPtr context, ref Guid handler, ref Guid iid, out IntPtr result);
        void GetParent(out IShellItem parent);
        void GetDisplayName(uint type, out IntPtr name);
        void GetAttributes(uint mask, out uint attributes);
        void Compare(IShellItem other, uint hint, out int order);
    }
    [DllImport("shell32.dll", CharSet=CharSet.Unicode, PreserveSig=false)]
    static extern void SHCreateItemFromParsingName(string path, IntPtr context, ref Guid iid, out IShellItem item);
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr window);
    public static string Choose(string initialPath, string title, string button) {
        Application.EnableVisualStyles();
        var dialog = (IFileDialog)new FileOpenDialog();
        try {
            uint options; dialog.GetOptions(out options);
            dialog.SetOptions(options | 0x20u | 0x40u | 0x800u | 0x02000000u);
            dialog.SetTitle(title); dialog.SetOkButtonLabel(button);
            if (Directory.Exists(initialPath)) {
                var iid = typeof(IShellItem).GUID;
                IShellItem folder;
                SHCreateItemFromParsingName(initialPath, IntPtr.Zero, ref iid, out folder);
                try { dialog.SetFolder(folder); } finally { Marshal.ReleaseComObject(folder); }
            }
            // A real foreground owner keeps the dialog visible even when the server was started hidden.
            using (var owner = new Form()) {
                owner.Text = title; owner.ShowInTaskbar = false; owner.TopMost = true;
                owner.Opacity = 0; owner.StartPosition = FormStartPosition.CenterScreen;
                owner.Show(); owner.Activate(); SetForegroundWindow(owner.Handle);
                int result = dialog.Show(owner.Handle);
                if (result == unchecked((int)0x800704C7)) return null;
                Marshal.ThrowExceptionForHR(result);
                IShellItem chosen; dialog.GetResult(out chosen);
                try {
                    IntPtr name; chosen.GetDisplayName(0x80058000, out name);
                    try { return Marshal.PtrToStringUni(name); } finally { Marshal.FreeCoTaskMem(name); }
                } finally { Marshal.ReleaseComObject(chosen); }
            }
        } finally { Marshal.ReleaseComObject(dialog); }
    }
}
'@ -ReferencedAssemblies System.Windows.Forms,System.Drawing
$selected = [LifeOSFolderDialog]::Choose($InitialPath, '選擇筆記存放資料夾', '選擇資料夾')
@{ path = $selected } | ConvertTo-Json -Compress
