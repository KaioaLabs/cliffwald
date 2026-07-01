$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

function Assert-FileContains {
    param(
        [string]$RelativePath,
        [string]$Pattern,
        [string]$Message
    )

    $path = Join-Path $ProjectRoot $RelativePath
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing required file: $RelativePath"
    }

    if (-not (Select-String -Path $path -Pattern $Pattern -Quiet)) {
        throw $Message
    }
}

function Assert-FileDoesNotContain {
    param(
        [string]$RelativePath,
        [string]$Pattern,
        [string]$Message
    )

    $path = Join-Path $ProjectRoot $RelativePath
    if ((Test-Path -LiteralPath $path) -and (Select-String -Path $path -Pattern $Pattern -Quiet)) {
        throw $Message
    }
}

Assert-FileContains "Source\Cliffwald\Public\CliffwaldRoster.h" "MaxStudentBodiesPerShard = 96" "Roster cap must remain centralized at 96."
Assert-FileContains "Source\Cliffwald\Private\CliffwaldPrototypeWorld.cpp" "Roster::MaxStudentBodiesPerShard" "Prototype world must use the shared roster cap."
Assert-FileContains "Source\Cliffwald\Private\CliffwaldGameMode.cpp" "Roster presence check: Humans=%d ActiveEchoes=%d TotalVisible=%d Cap=%d" "GameMode must log roster-cap evidence."
Assert-FileContains "Source\Cliffwald\Private\CliffwaldHud.cpp" "Roster::MaxStudentBodiesPerShard" "HUD must read the shared roster cap."
Assert-FileContains "Config\DefaultGame.ini" "RealMinutesPerSchoolDay=6\.0" "School-day duration must be centralized in DefaultGame.ini."
Assert-FileContains "Source\Cliffwald\Private\CliffwaldSchoolGameState.cpp" "CliffwaldRealMinutesPerSchoolDay" "School clock must support a command-line day-duration override for playtests."
Assert-FileContains "Scripts\Test-AutonomousSchool.ps1" "RealMinutesPerSchoolDay" "Autonomous smoke must expose school-day duration override for cadence tests."

Assert-FileContains "Source\Cliffwald\Private\CliffwaldEchoStudentActor.cpp" "PrimaryActorTick.TickInterval = 0.2f" "Echo tick interval must stay mobile-friendly."
Assert-FileContains "Source\Cliffwald\Private\CliffwaldEchoStudentActor.cpp" "SetNetUpdateFrequency\(5.0f\)" "Echo net update frequency must stay throttled."
Assert-FileContains "Source\Cliffwald\Private\CliffwaldStudentCharacter.cpp" "SetNetUpdateFrequency\(20.0f\)" "Human pawn net update frequency must stay bounded."

Assert-FileContains "Config\DefaultDeviceProfiles.ini" "\[Android DeviceProfile\]" "Android device profile must exist."
Assert-FileContains "Config\DefaultDeviceProfiles.ini" "\[IOS DeviceProfile\]" "iOS device profile must exist."
Assert-FileContains "Config\DefaultDeviceProfiles.ini" "sg.ShadowQuality=1" "Mobile shadow quality must be intentionally constrained."
Assert-FileContains "Config\DefaultDeviceProfiles.ini" "foliage.DensityScale=0.35" "Mobile foliage density must be intentionally constrained."
Assert-FileContains "Config\DefaultEngine.ini" "PackageName=com\.cliffwald\.online" "Android package name must not use Unreal placeholder defaults."
Assert-FileContains "Config\DefaultEngine.ini" "TargetSDKVersion=35" "Android target SDK must be explicit."
Assert-FileContains "Config\DefaultEngine.ini" "bEnableGooglePlaySupport=False" "Google Play support must stay disabled until real services are configured."
Assert-FileContains "Config\DefaultEngine.ini" "bSupportsInAppPurchasing=False" "Android billing must stay disabled until commerce is designed."
Assert-FileContains "Config\DefaultEngine.ini" "bEnabled=False" "EOS must not be half-enabled without real credentials."
Assert-FileContains "Config\DefaultEngine.ini" "csv\.Benchmark=0" "CSV profiler benchmark must stay disabled for automated runtime profiling."

Assert-FileContains "Scripts\Test-DedicatedServer.ps1" "HumanClaimedCount" "Dedicated smoke must verify human slot claim."
Assert-FileContains "Scripts\Test-DedicatedServer.ps1" "RosterCappedCount" "Dedicated smoke must verify roster cap."
Assert-FileContains "Scripts\Test-AutonomousSchool.ps1" "ZeroHumanRosterCount" "Autonomous smoke must verify zero-human roster."
Assert-FileContains "Scripts\Test-TechnicalDemoGate.ps1" "Test-DedicatedServer.ps1" "Technical gate must run the online dedicated smoke."
Assert-FileContains "Scripts\Test-TechnicalDemoGate.ps1" "Test-AutonomousSchool.ps1" "Technical gate must run the autonomous zero-player smoke."
Assert-FileContains "Scripts\Test-TechnicalDemoGate.ps1" "Test-MobileToolchain.ps1" "Technical gate must run Android toolchain preflight."
Assert-FileContains "Scripts\Test-TechnicalDemoGate.ps1" "Test-ServerSoak.ps1" "Technical gate must expose the reconnect soak."
Assert-FileContains "Scripts\Test-TechnicalDemoGate.ps1" "Test-ServerPerf.ps1" "Technical gate must expose server performance sampling."
Assert-FileContains "Scripts\Test-TechnicalDemoGate.ps1" "Test-UnrealAutomation.ps1" "Technical gate must run Unreal Automation tests."
Assert-FileContains "Source\Cliffwald\Private\Tests\CliffwaldEchoPolicyAutomationTest.cpp" "RegisterRealPlayerSlot" "Unreal Automation tests must cover returning-player slot registration."
Assert-FileContains "Source\Cliffwald\Private\CliffwaldSchoolStateSubsystem.cpp" "SetControlMode\(ECliffwaldControlMode::HumanOnline\)" "Returning real-player slots must explicitly restore human control."
Assert-FileContains "Scripts\Test-ServerSoak.ps1" "Echo continuity restored" "Server soak must verify Echo restoration after disconnect."
Assert-FileContains "Scripts\Test-ServerSoak.ps1" "Assert-NoRosterOverflow" "Server soak must fail on roster overflow."
Assert-FileContains "Scripts\Test-ServerPerf.ps1" "AverageCpuTotalPercent" "Server perf must report CPU evidence."
Assert-FileContains "Scripts\Test-ServerPerf.ps1" "PeakWorkingSetMB" "Server perf must report memory evidence."
Assert-FileContains "Scripts\Test-AndroidDevice.ps1" "UECommandLine.txt" "Android device smoke must support UE command-line injection."
Assert-FileContains "Scripts\Test-AndroidDevice.ps1" 'dumpsys", "meminfo' "Android device smoke must capture memory evidence."
Assert-FileContains "Scripts\Test-AndroidDevice.ps1" 'dumpsys", "gfxinfo' "Android device smoke must capture frame evidence."
Assert-FileContains "Scripts\Test-AndroidDevice.ps1" "CliffwaldCsvCaptureFrames" "Android device smoke must request the UE CSV profiler runtime capture for frame evidence."
Assert-FileContains "Source\Cliffwald\Private\CliffwaldHud.cpp" "FCsvProfiler::Get\(\)->BeginCapture" "Client runtime must start UE CSV profiler captures through the official profiler."
Assert-FileContains "Scripts\Test-AndroidDevice.ps1" "UnrealCsvFramePacingSampleUsable" "Android device smoke must report UE-native frame pacing evidence."
Assert-FileContains "Scripts\Test-TechnicalDemoGate.ps1" "RequireUnrealCsvProfile" "Technical gate must require UE-native CSV profiling when Android device smoke is requested."

Assert-FileDoesNotContain "README.md" "99 Echo|100 presences|100 persistent|100 visible|around 100" "README contains stale roster language."
Assert-FileDoesNotContain "Config\DefaultEngine.ini" "com\.YourCompany|bEnabled=True" "DefaultEngine.ini contains stale Android/EOS placeholder configuration."
Assert-FileDoesNotContain "Scripts\Test-DedicatedServer.ps1" "echoCount -ne 99|99 Echo|EchoCount=99" "Dedicated smoke contains stale 99-Echo expectation."
Assert-FileDoesNotContain "Scripts\Test-ListenServer.ps1" "echoCount -ne 99|99 Echo|EchoCount=99" "Listen smoke contains stale 99-Echo expectation."

[PSCustomObject]@{
    RosterCapCentralized = $true
    SlotPossessionGuarded = $true
    MobileProfilesPresent = $true
    StaleRosterLanguageAbsent = $true
} | Format-List
