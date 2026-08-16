$code = @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public class WindowHelper {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    public class WindowInfo {
        public IntPtr Handle { get; set; }
        public string Title { get; set; }
        public uint ProcessId { get; set; }
    }

    public static List<WindowInfo> GetVisibleWindows() {
        var list = new List<WindowInfo>();
        EnumWindows((hWnd, lParam) => {
            if (IsWindowVisible(hWnd)) {
                var sb = new StringBuilder(512);
                GetWindowText(hWnd, sb, 512);
                string title = sb.ToString();
                if (!string.IsNullOrWhiteSpace(title)) {
                    uint pid;
                    GetWindowThreadProcessId(hWnd, out pid);
                    list.Add(new WindowInfo { Handle = hWnd, Title = title, ProcessId = pid });
                }
            }
            return true;
        }, IntPtr.Zero);
        return list;
    }
}
"@

Add-Type -TypeDefinition $code -Language CSharp

$windows = [WindowHelper]::GetVisibleWindows()
Write-Host "All visible windows count: $($windows.Count)"
foreach ($w in $windows) {
    Write-Host "HWND: $($w.Handle) | PID: $($w.ProcessId) | Title: $($w.Title)"
}
