# Runs the state-park bird-frequency build while preventing the machine from
# sleeping for the build's duration. Uses SetThreadExecutionState (a transient
# runtime request, NOT a power-setting change) which Windows auto-releases the
# moment this process exits — so nothing persists even if the build crashes.
$ErrorActionPreference = 'Stop'
Set-Location -Path (Split-Path -Parent $PSScriptRoot)

$sig = @'
[DllImport("kernel32.dll", SetLastError=true)]
public static extern uint SetThreadExecutionState(uint esFlags);
'@
$Power = Add-Type -MemberDefinition $sig -Name 'Pwr' -Namespace 'Win32' -PassThru

# ES_CONTINUOUS (0x80000000) | ES_SYSTEM_REQUIRED (0x00000001) = 2147483649
$KEEP_AWAKE = [uint32]2147483649
$RELEASE    = [uint32]2147483648   # ES_CONTINUOUS only -> clears the request

[void]$Power::SetThreadExecutionState($KEEP_AWAKE)
Write-Host "[keepAwake] sleep suppressed for build duration"

try {
    & node scripts/buildStateParkBirdFreq.js
    $code = $LASTEXITCODE
    Write-Host "[keepAwake] build exited with code $code"
    exit $code
}
finally {
    [void]$Power::SetThreadExecutionState($RELEASE)
    Write-Host "[keepAwake] sleep suppression released"
}
