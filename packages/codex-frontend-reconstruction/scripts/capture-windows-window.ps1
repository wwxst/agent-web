[CmdletBinding()]
param(
  [string]$ProcessName,
  [string]$WindowTitleRegex,
  [string]$OutputPath,
  [string]$ScenarioId,
  [ValidateSet("light","dark")]
  [string]$Theme,
  [ValidateRange(640,7680)]
  [int]$Width = 1352,
  [ValidateRange(480,4320)]
  [int]$Height = 760,
  [ValidateRange(0,60000)]
  [int]$WaitMilliseconds = 1500,
  [int]$X = -1,
  [int]$Y = -1,
  [switch]$SelfTest
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($env:OS -ne "Windows_NT") {
  throw "This capture helper is Windows-only. Run it in PowerShell on the same Windows display as both Codex applications."
}

# Set this process to per-monitor-v2 before reading or changing any window
# coordinates. If the host already fixed its DPI context, Windows may reject
# the call; the existing context is still recorded through GetDpiForWindow.
if (-not ("CodexWindowCaptureNative" -as [type])) {
  $nativeSource = @'
using System;
using System.Text;
using System.Runtime.InteropServices;

public static class CodexWindowCaptureNative
{
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr extraData);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int maxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetWindowPos(
        IntPtr hWnd, IntPtr insertAfter, int x, int y, int width, int height, uint flags);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int command);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int x, int y);

    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int index);

    [DllImport("user32.dll")]
    public static extern uint GetDpiForWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool SetProcessDpiAwarenessContext(IntPtr value);

    [DllImport("dwmapi.dll", PreserveSig = true)]
    public static extern int DwmGetWindowAttribute(
        IntPtr hWnd, int attribute, out RECT value, int valueSize);
}
'@
  Add-Type -TypeDefinition $nativeSource -ErrorAction Stop
}

if ($SelfTest) {
  try {
    [void][CodexWindowCaptureNative]::SetProcessDpiAwarenessContext([IntPtr](-4))
  } catch {
    # An existing host DPI context is acceptable for the API smoke test.
  }
  $screenWidth = [CodexWindowCaptureNative]::GetSystemMetrics(0)
  $screenHeight = [CodexWindowCaptureNative]::GetSystemMetrics(1)
  if ($screenWidth -lt 640 -or $screenHeight -lt 480) {
    throw "Windows returned invalid primary display metrics: $($screenWidth)x$($screenHeight)."
  }

  # Exercise the EnumWindows delegate and DWM bounds signature when an
  # interactive desktop window is available on the runner.
  $visibleHandles = [System.Collections.Generic.List[IntPtr]]::new()
  $probe = [CodexWindowCaptureNative+EnumWindowsProc]{
    param([IntPtr]$Handle, [IntPtr]$LParam)
    if ([CodexWindowCaptureNative]::IsWindowVisible($Handle)) {
      $visibleHandles.Add($Handle)
    }
    return $true
  }
  [void][CodexWindowCaptureNative]::EnumWindows($probe, [IntPtr]::Zero)
  if ($visibleHandles.Count -gt 0) {
    $probeRect = [CodexWindowCaptureNative+RECT]::new()
    if (-not [CodexWindowCaptureNative]::GetWindowRect($visibleHandles[0], [ref]$probeRect)) {
      throw "GetWindowRect API smoke test failed."
    }
    $dwmRect = [CodexWindowCaptureNative+RECT]::new()
    $rectSize = [System.Runtime.InteropServices.Marshal]::SizeOf([type][CodexWindowCaptureNative+RECT])
    $hresult = [CodexWindowCaptureNative]::DwmGetWindowAttribute(
      $visibleHandles[0], 9, [ref]$dwmRect, $rectSize
    )
    if ($hresult -ne 0) {
      throw "DWM extended-frame API smoke test failed with HRESULT $hresult."
    }
  }

  Add-Type -AssemblyName System.Drawing -ErrorAction Stop
  $probeBitmap = [System.Drawing.Bitmap]::new(1, 1)
  $probeBitmap.Dispose()
  Write-Output "Windows capture API ready; primary display $($screenWidth)x$($screenHeight); visible windows $($visibleHandles.Count)."
  return
}

if ([string]::IsNullOrWhiteSpace($ProcessName) -and
    [string]::IsNullOrWhiteSpace($WindowTitleRegex)) {
  throw "Specify -ProcessName or -WindowTitleRegex to select exactly one application window."
}
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  throw "-OutputPath is required."
}
if ([string]::IsNullOrWhiteSpace($ScenarioId)) {
  throw "-ScenarioId is required (for example A-shell-empty)."
}
if ([string]::IsNullOrWhiteSpace($Theme)) {
  throw "-Theme is required (light or dark)."
}

$titlePattern = $null
if (-not [string]::IsNullOrWhiteSpace($WindowTitleRegex)) {
  try {
    $titlePattern = [regex]::new($WindowTitleRegex, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  } catch {
    throw "Invalid -WindowTitleRegex: $($_.Exception.Message)"
  }
}

# PROCESS_PER_MONITOR_DPI_AWARE_V2 = -4. This is best-effort because DPI
# awareness can only be fixed once per process.
try {
  [void][CodexWindowCaptureNative]::SetProcessDpiAwarenessContext([IntPtr](-4))
} catch {
  # GetDpiForWindow below remains the authoritative recorded window DPI.
}

$windows = [System.Collections.Generic.List[object]]::new()
$callback = [CodexWindowCaptureNative+EnumWindowsProc]{
  param([IntPtr]$Handle, [IntPtr]$LParam)

  if (-not [CodexWindowCaptureNative]::IsWindowVisible($Handle)) {
    return $true
  }

  $titleBuffer = [System.Text.StringBuilder]::new(1024)
  [void][CodexWindowCaptureNative]::GetWindowText($Handle, $titleBuffer, $titleBuffer.Capacity)
  $title = $titleBuffer.ToString()
  if ([string]::IsNullOrWhiteSpace($title)) {
    return $true
  }

  [uint32]$pid = 0
  [void][CodexWindowCaptureNative]::GetWindowThreadProcessId($Handle, [ref]$pid)
  $process = Get-Process -Id ([int]$pid) -ErrorAction SilentlyContinue
  if ($null -eq $process) {
    return $true
  }

  $windows.Add([pscustomobject]@{
    Handle = $Handle
    ProcessId = [int]$pid
    ProcessName = $process.ProcessName
    Title = $title
  })
  return $true
}
[void][CodexWindowCaptureNative]::EnumWindows($callback, [IntPtr]::Zero)

$candidates = @($windows | Where-Object {
  ([string]::IsNullOrWhiteSpace($ProcessName) -or $_.ProcessName -ieq $ProcessName) -and
  ($null -eq $titlePattern -or $titlePattern.IsMatch($_.Title))
})

if ($candidates.Count -ne 1) {
  $details = @($candidates | ForEach-Object {
    "$($_.ProcessName) [$($_.ProcessId)] '$($_.Title)'"
  }) -join [Environment]::NewLine
  if ($details.Length -eq 0) {
    $details = "No visible top-level windows matched the supplied selector."
  }
  throw "Expected exactly one matching window, found $($candidates.Count). Refine the selector. $details"
}

$selected = $candidates[0]
$handle = [IntPtr]$selected.Handle

function Get-CaptureBounds {
  param([IntPtr]$WindowHandle)

  $outer = [CodexWindowCaptureNative+RECT]::new()
  if (-not [CodexWindowCaptureNative]::GetWindowRect($WindowHandle, [ref]$outer)) {
    throw "GetWindowRect failed for '$($selected.Title)'."
  }

  $visible = [CodexWindowCaptureNative+RECT]::new()
  $rectSize = [System.Runtime.InteropServices.Marshal]::SizeOf([type][CodexWindowCaptureNative+RECT])
  $hresult = [CodexWindowCaptureNative]::DwmGetWindowAttribute(
    $WindowHandle, 9, [ref]$visible, $rectSize
  )
  if ($hresult -ne 0) {
    throw "DwmGetWindowAttribute(DWMWA_EXTENDED_FRAME_BOUNDS) failed with HRESULT $hresult. Refusing an ambiguous capture boundary."
  }

  return [pscustomobject]@{
    Outer = $outer
    Visible = $visible
    VisibleWidth = $visible.Right - $visible.Left
    VisibleHeight = $visible.Bottom - $visible.Top
  }
}

# Restore a maximized/minimized window first. The DWM visible-frame insets are
# preserved while resizing so the captured visible frame has exact dimensions.
[void][CodexWindowCaptureNative]::ShowWindow($handle, 9) # SW_RESTORE
Start-Sleep -Milliseconds 250
$before = Get-CaptureBounds -WindowHandle $handle

$leftInset = $before.Visible.Left - $before.Outer.Left
$topInset = $before.Visible.Top - $before.Outer.Top
$rightInset = $before.Outer.Right - $before.Visible.Right
$bottomInset = $before.Outer.Bottom - $before.Visible.Bottom

$screenWidth = [CodexWindowCaptureNative]::GetSystemMetrics(0)
$screenHeight = [CodexWindowCaptureNative]::GetSystemMetrics(1)
$targetX = if ($X -ge 0) { $X } else { [int][math]::Floor(($screenWidth - $Width) / 2) }
$targetY = if ($Y -ge 0) { $Y } else { [int][math]::Floor(($screenHeight - $Height) / 2) }

$outerX = $targetX - $leftInset
$outerY = $targetY - $topInset
$outerWidth = $Width + $leftInset + $rightInset
$outerHeight = $Height + $topInset + $bottomInset

$positioned = [CodexWindowCaptureNative]::SetWindowPos(
  $handle, [IntPtr]::Zero, $outerX, $outerY, $outerWidth, $outerHeight, 0x0040
) # SWP_SHOWWINDOW
if (-not $positioned) {
  $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
  throw "SetWindowPos failed with Win32 error $code."
}

Start-Sleep -Milliseconds 400
$bounds = Get-CaptureBounds -WindowHandle $handle
if ($bounds.VisibleWidth -ne $Width -or $bounds.VisibleHeight -ne $Height) {
  throw "The visible frame is $($bounds.VisibleWidth)x$($bounds.VisibleHeight), not the requested $($Width)x$($Height). The app may enforce a minimum size."
}
if ($bounds.Visible.Left -lt 0 -or $bounds.Visible.Top -lt 0 -or
    $bounds.Visible.Right -gt $screenWidth -or $bounds.Visible.Bottom -gt $screenHeight) {
  throw "The target window is not fully inside the primary display. Use a display large enough for $($Width)x$($Height)."
}

[void][CodexWindowCaptureNative]::SetForegroundWindow($handle)
Start-Sleep -Milliseconds 250
if ([CodexWindowCaptureNative]::GetForegroundWindow() -ne $handle) {
  throw "Windows did not activate the selected window. Bring it to the foreground manually and retry."
}

# Move the cursor outside the capture rectangle where possible, preventing a
# hover state from contaminating the screenshot.
$cursorCandidates = @(
  @(5, 5),
  @($screenWidth - 5, 5),
  @(5, $screenHeight - 5),
  @($screenWidth - 5, $screenHeight - 5)
)
foreach ($point in $cursorCandidates) {
  $inside = $point[0] -ge $bounds.Visible.Left -and
    $point[0] -lt $bounds.Visible.Right -and
    $point[1] -ge $bounds.Visible.Top -and
    $point[1] -lt $bounds.Visible.Bottom
  if (-not $inside) {
    [void][CodexWindowCaptureNative]::SetCursorPos($point[0], $point[1])
    break
  }
}

Start-Sleep -Milliseconds $WaitMilliseconds

$outputFullPath = [System.IO.Path]::GetFullPath($OutputPath)
$outputDirectory = [System.IO.Path]::GetDirectoryName($outputFullPath)
[void][System.IO.Directory]::CreateDirectory($outputDirectory)
$metadataPath = "$outputFullPath.json"

Add-Type -AssemblyName System.Drawing -ErrorAction Stop
$bitmap = [System.Drawing.Bitmap]::new(
  $Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
try {
  $sourceRectangle = [System.Drawing.Rectangle]::new(
    $bounds.Visible.Left, $bounds.Visible.Top, $Width, $Height
  )
  $graphics.CopyFromScreen(
    $sourceRectangle.Location,
    [System.Drawing.Point]::Empty,
    $sourceRectangle.Size,
    [System.Drawing.CopyPixelOperation]::SourceCopy
  )
  $bitmap.Save($outputFullPath, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $graphics.Dispose()
  $bitmap.Dispose()
}

$windowDpi = [CodexWindowCaptureNative]::GetDpiForWindow($handle)
$hash = (Get-FileHash -LiteralPath $outputFullPath -Algorithm SHA256).Hash.ToLowerInvariant()
$metadata = [ordered]@{
  schemaVersion = 1
  scenarioId = $ScenarioId
  theme = $Theme
  captureBoundary = "dwm-extended-frame-bounds"
  screenshot = $outputFullPath
  width = $Width
  height = $Height
  windowDpi = [int]$windowDpi
  windowScaleFactor = [math]::Round($windowDpi / 96, 4)
  processName = $selected.ProcessName
  processId = $selected.ProcessId
  windowTitle = $selected.Title
  windowHandle = ("0x{0:X}" -f $handle.ToInt64())
  visibleBounds = [ordered]@{
    x = $bounds.Visible.Left
    y = $bounds.Visible.Top
    width = $bounds.VisibleWidth
    height = $bounds.VisibleHeight
  }
  outerBounds = [ordered]@{
    x = $bounds.Outer.Left
    y = $bounds.Outer.Top
    width = $bounds.Outer.Right - $bounds.Outer.Left
    height = $bounds.Outer.Bottom - $bounds.Outer.Top
  }
  sha256 = $hash
  capturedAtUtc = [DateTime]::UtcNow.ToString("o")
}
$metadataJson = $metadata | ConvertTo-Json -Depth 8
[System.IO.File]::WriteAllText(
  $metadataPath, $metadataJson, [System.Text.UTF8Encoding]::new($false)
)

Write-Output "Captured $($selected.ProcessName) / '$($selected.Title)'"
Write-Output "PNG: $outputFullPath ($($Width)x$($Height))"
Write-Output "Metadata: $metadataPath"
Write-Output "DPI: $windowDpi ($($metadata.windowScaleFactor)x); scenario: $ScenarioId; theme: $Theme"
