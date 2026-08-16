Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes -ErrorAction SilentlyContinue

function Get-OpenTabs {
    param([string]$BrowserName = "chrome")
    
    $results = @()
    $procs = Get-Process -Name $BrowserName -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne '' }
    
    foreach ($p in $procs) {
        $results += [PSCustomObject]@{
            ProcessId = $p.Id
            WindowTitle = $p.MainWindowTitle
            Handle = $p.MainWindowHandle
        }
    }
    
    # Also inspect UI Automation Tab Items if available
    try {
        foreach ($p in $procs) {
            $element = [System.Windows.Automation.AutomationElement]::FromHandle($p.MainWindowHandle)
            if ($element) {
                $condition = New-Object System.Windows.Automation.PropertyCondition(
                    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
                    [System.Windows.Automation.ControlType]::TabItem
                )
                $tabs = $element.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
                if ($tabs -and $tabs.Count -gt 0) {
                    foreach ($tab in $tabs) {
                        $name = $tab.Current.Name
                        if ($name -and $name -ne '') {
                            $results += [PSCustomObject]@{
                                ProcessId = $p.Id
                                TabName = $name
                                Handle = $p.MainWindowHandle
                            }
                        }
                    }
                }
            }
        }
    } catch {
        # Fallback to window title
    }
    
    return $results
}

$tabs = Get-OpenTabs "chrome"
Write-Host "Discovered Tabs / Windows:"
$tabs | ConvertTo-Json
