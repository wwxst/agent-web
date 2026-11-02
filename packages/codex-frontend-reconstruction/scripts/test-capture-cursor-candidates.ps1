param([Parameter(Mandatory = $true)][string]$CaptureScriptPath)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile(
  $CaptureScriptPath, [ref]$tokens, [ref]$parseErrors
)
if ($parseErrors.Count -ne 0) { throw 'Capture script did not parse.' }
$assignments = @($ast.FindAll({
  param($node)
  $node -is [System.Management.Automation.Language.AssignmentStatementAst] -and
    $node.Left.Extent.Text -eq '$cursorCandidates'
}, $true))
if ($assignments.Count -ne 1) { throw 'Expected one cursor candidate assignment.' }
# Execute the actual production assignment without activating/resizing a window,
# moving the mouse, or capturing desktop content. SelfTest returns before this code.
$assignment = [scriptblock]::Create($assignments[0].Extent.Text)
$cases = @(
  @{ Width = 1920; Height = 1080; Expected = @(@(5,5),@(1915,5),@(5,1075),@(1915,1075)) },
  @{ Width = 640; Height = 480; Expected = @(@(5,5),@(635,5),@(5,475),@(635,475)) },
  @{ Width = 7680; Height = 4320; Expected = @(@(5,5),@(7675,5),@(5,4315),@(7675,4315)) }
)
foreach ($case in $cases) {
  $screenWidth = $case.Width
  $screenHeight = $case.Height
  . $assignment
  if ($cursorCandidates.Count -ne 4) { throw 'Expected four screen corners.' }
  for ($index = 0; $index -lt 4; $index++) {
    $point = $cursorCandidates[$index]
    if ($point.Count -ne 2) { throw 'A screen corner must contain two coordinates.' }
    for ($axis = 0; $axis -lt 2; $axis++) {
      if ($point[$axis] -isnot [int] -or $point[$axis] -ne $case.Expected[$index][$axis]) {
        throw "Incorrect screen corner $index axis $axis for $($case.Width)x$($case.Height)."
      }
    }
  }
  Write-Output "Cursor candidates verified: $($case.Width)x$($case.Height)."
}
