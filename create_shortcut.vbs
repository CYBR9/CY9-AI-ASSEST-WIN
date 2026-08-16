Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
desktopPath = WshShell.SpecialFolders("Desktop")

exePath = scriptDir & "\dist\CY9-win32-x64\CY9.exe"
iconFile = scriptDir & "\CY9.ico"
If Not fso.FileExists(iconFile) Then
    iconFile = scriptDir & "\src\assets\icon.ico"
End If

If Not fso.FileExists(exePath) Then
    exePath = scriptDir & "\node_modules\electron\dist\electron.exe"
    args = """" & scriptDir & """"
    workingDir = scriptDir
Else
    args = ""
    workingDir = scriptDir & "\dist\CY9-win32-x64"
End If

' 1. Create on Windows Special Desktop
Set shortcut1 = WshShell.CreateShortcut(desktopPath & "\CY9.lnk")
shortcut1.TargetPath = exePath
shortcut1.Arguments = args
shortcut1.WorkingDirectory = workingDir
shortcut1.Description = "CY9 Autonomous AI Assistant"
If fso.FileExists(iconFile) Then
    shortcut1.IconLocation = iconFile & ",0"
End If
shortcut1.WindowStyle = 1
shortcut1.Save

' 2. Create on OneDrive Desktop if present
oneDriveDesktop = WshShell.ExpandEnvironmentStrings("%USERPROFILE%") & "\OneDrive\Desktop"
If fso.FolderExists(oneDriveDesktop) Then
    Set shortcut2 = WshShell.CreateShortcut(oneDriveDesktop & "\CY9.lnk")
    shortcut2.TargetPath = exePath
    shortcut2.Arguments = args
    shortcut2.WorkingDirectory = workingDir
    shortcut2.Description = "CY9 Autonomous AI Assistant"
    If fso.FileExists(iconFile) Then
        shortcut2.IconLocation = iconFile & ",0"
    End If
    shortcut2.WindowStyle = 1
    shortcut2.Save
End If

WScript.Echo "SUCCESS"
