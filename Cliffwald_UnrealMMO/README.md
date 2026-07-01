# Cliffwald Unreal

Standalone Unreal Engine project for Cliffwald.

## Direction

- Engine target: Unreal Engine 5.8.
- Implementation style: C++ first, no Blueprint gameplay foundation.
- Runtime target: dedicated-server friendly school instance for 96 persistent student bodies.
- Platform stance: cross-platform-first client architecture for PC and mobile. Android is the early mobile performance gate, not the only target.
- AI rule: an offline Echo is a living skin for a real player body. It may move, animate, attend visible routines and socialize theatrically, but it must not persist player stats, inventory, economy, academic progress, prestige, sanctions, equipment or irreversible choices.

## Access

This project mirrors the useful editor-access pattern from `D:\Deep-AeroTwin-UE57-Test`:

- `PythonScriptPlugin` remote execution is enabled in `Config/DefaultEngine.ini`.
- `McpAutomationBridge` is enabled as an editor plugin.
- Epic's experimental `ModelContextProtocol` / Unreal MCP plugin is enabled for editor use.
- Local MCP endpoints are declared in `.mcp.json`:
  - `cliffwald-unreal-bridge`: `http://localhost:3000/mcp`
  - `cliffwald-unreal-native`: `http://localhost:8000/mcp`
- MCP bridge settings listen only on `127.0.0.1` by default.

The bridge is for editor automation and asset/world iteration. It is not gameplay authority.
The plugin is generic and includes broad editor tools, including Blueprint-related tools. Cliffwald's baseline remains C++; do not use Blueprint gameplay foundations unless the project direction explicitly changes.

## Local Setup

Install Unreal Engine 5.8, then open:

```powershell
.\Scripts\Open-CliffwaldEditor.ps1
```

If UE 5.8 is installed somewhere other than `D:\Epic Games\UE_5.8`, either set `UE_5_8_ROOT` or pass `-EngineRoot`.

Generate IDE files from Unreal's context menu or with UnrealBuildTool after UE 5.8 is installed. The local validated install path is `D:\Epic Games\UE_5.8`.

## Server Status

The packaged build has a validated listen-server smoke path:

```powershell
.\Scripts\Test-ListenServer.ps1
```

The source dedicated smoke opens UDP `7777`, starts the packaged dedicated server, connects one local source-matched packaged client, verifies Iris, verifies `96` Echo AI presences, verifies school-clock phase changes, and fails on Iris warnings, ensures, errors, fatals or movement-base warnings.

The listen-server path is only a quick local smoke. Epic's Launcher UE 5.8 distribution does not support compiling `TargetType.Server`; authoritative dedicated builds must use the UE 5.8 source build or an installed build produced with server targets. Cliffwald now has a validated UE 5.8 source-build dedicated server path.

Useful manual commands:

```powershell
.\Scripts\Start-ListenServer.ps1
.\Scripts\Start-LocalClient.ps1
```

Root dedicated-server fix:

```powershell
.\Scripts\Setup-UE58SourceServer.ps1
.\Scripts\Setup-UE58SourceServer.ps1 -Clone -Bootstrap -BuildServer -CookServer -CookClient
.\Scripts\Test-DedicatedServer.ps1
```

The first command is a preflight. The second command should only be run after the GitHub account can access `EpicGames/UnrealEngine` and the target drive has enough free space for a UE source build.

Validated dedicated-server path:

- UE source root: `D:\UnrealEngine-5.8-source`, branch `5.8`.
- Dedicated server archive: `PackagedServer\WindowsServer\CliffwaldServer.exe`.
- Source-matched client archive: `PackagedSourceClient\Windows\Cliffwald.exe`.
- Smoke command: `.\Scripts\Test-DedicatedServer.ps1`.
- Autonomous school smoke command: `.\Scripts\Test-AutonomousSchool.ps1`.
- Latest autonomous smoke: UDP `7777`, `96` Echo AI presences, zero clients joined, `2` school-clock phase transitions, `0` fatal/error/ensure counts and `0` server Iris startup warnings.
- Latest dedicated client smoke: UDP `7777`, `96` Echo AI presences, one local client joined/welcomed, `2` school-clock phase transitions, `0` fatal/error/ensure counts, `0` movement-base warnings and `0` server Iris startup warnings.

Important rule: do not connect the older Launcher-built `Packaged\Windows\Cliffwald.exe` client to the source-built dedicated server. Unreal correctly rejects mismatched network versions. Client and server packages must come from the same engine/build pipeline.

Important bootstrap rule: do not exclude `IOS` when running UE source `Setup.bat` for this branch. Even Win64 `BuildCookRun` compiles AutomationTool platform scripts; excluding iOS leaves `IOS.Automation` resources missing and breaks the official cook/archive path. The setup script excludes large non-Windows runtime platforms but intentionally keeps iOS AutomationTool resources.

Disk note: UE source builds, cooked output, DDC and staged builds are large. Keep at least `250 GB` free before clone/bootstrap/full rebuilds. `Build`, `Saved`, `Intermediate`, `Binaries`, `DerivedDataCache`, packaged outputs and plugin-generated binaries/intermediates are generated local artifacts and are ignored by git.

Use `Scripts\Clean-UnrealGenerated.ps1` to dry-run safe project cleanup, and add `-Execute` only when generated output can be regenerated. Add `-Deep` only when binaries and packaged outputs may also be removed.

Iris startup note: do not silence `LogIris` or patch engine Iris code. Cliffwald preloads UE runtime modules that otherwise load after Iris creates the replication system in Development builds; Automation module preload is gated out of Shipping.

Mobile preflight:

```powershell
.\Scripts\Test-MobileToolchain.ps1
```

Require Android readiness:

```powershell
.\Scripts\Test-MobileToolchain.ps1 -RequireAndroid
```

Package Android Development arm64:

```powershell
.\Scripts\Package-AndroidDevelopment.ps1
```

Unified technical gate:

```powershell
.\Scripts\Test-TechnicalDemoGate.ps1
```

Unreal Automation tests for Echo policy and returning-player slot state:

```powershell
.\Scripts\Test-UnrealAutomation.ps1
```

The automation runner uses `-Game -NullRHI -DisablePython` and fails on `LogPython: Error` so editor Python/toolset startup noise cannot mask test results.

Full gate with reconnect soak:

```powershell
.\Scripts\Test-TechnicalDemoGate.ps1 -RunSoak
```

Autonomous server perf gate:

```powershell
.\Scripts\Test-TechnicalDemoGate.ps1 -SkipRuntimeSmokes -RunPerf
```

Real Android device smoke, after USB debugging is enabled and the device is authorized:

```powershell
.\Scripts\Test-AndroidDevice.ps1 -StartLocalServer
```

Use `-RequireUnrealCsvProfile -RequireFramePacingSample` when validating UE-native frame pacing evidence. Physical hardware is still required before claiming mobile thermal/GPU readiness.

Current local status: Win64 server/client are validated, including reconnect soak with Echo restoration and autonomous server perf sampling. Android SDK/NDK/JBR preflight passes and Android Development packages successfully to `PackagedAndroid\Android\Cliffwald-arm64.apk` as package `com.cliffwald.online`, version `0.1.0`, min SDK `26`, target SDK `35`, arm64 only for the current mobile gate. The APK contains cooked content as `assets/main.obb.png`, and Android emulator online smoke passes on local AVD `Cliffwald_UE58_x86_64` with memory budgets plus Unreal CSV Profiler frame evidence. Android smoke metrics are written to `Saved\Logs\CliffwaldAndroidMetrics.json`, and CSV files are pulled under `Saved\Logs\AndroidCsv`. iOS packaging/signing requires Apple/Xcode tooling or a remote Mac setup and is not validated from this Windows machine.

Android identity, cooked-content and service guardrails live in `Config\DefaultEngine.ini` plus the packaging/test scripts, not generated Java/Gradle edits. Google Play support, AdMob, Android voice, IMU and in-app purchasing are disabled until explicitly needed; the APK metadata gate fails if Unreal's placeholder `com.YourCompany` namespace returns or if cooked UE content is missing.

Mobile stance: Cliffwald is not Android-only. Android is the constrained client we can currently build and use as a performance gate; PC remains the fastest iteration path; future iOS/Switch/web lanes need their own official tooling and platform decisions. Dedicated servers remain Windows/Linux host processes, not mobile apps.

## Structure

- `Cliffwald.uproject`: UE 5.8 project descriptor.
- `Source/Cliffwald`: C++ runtime module.
- `Source/CliffwaldServer.Target.cs`: dedicated server target.
- `Config`: Python remote execution, MCP bridge and project settings.
- `Plugins/McpAutomationBridge`: editor automation bridge copied from the DeepAeroTwin UE 5.7 test project, without generated binaries/intermediates.

## Current Vertical Slice

The current minimum playable slice is C++ only:

- third-person student capsule with visible primitive body and camera;
- WASD movement, mouse look and jump;
- static school blockout owned by `/Game/Maps/L_CliffwaldPrototype`;
- `96` server-spawned Echo students running autonomous school routines as runtime-only AI theatre;
- true slot possession: a joining human claims one existing student slot, that slot's Echo yields, and the visible roster remains capped at `96`;
- replicated school clock and phase display in the HUD;
- HUD reminder that Echoes cannot persist player state.

Create or refresh the prototype map with:

```powershell
"D:\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe" ".\Cliffwald.uproject" -run=pythonscript -script=".\Scripts\CreatePrototypeMap.py" -unattended -nop4 -NullRHI
```

## MMO Kit Decision

MMO Kit remains a research reference, not the baseline. Cliffwald needs a possession/Echo model where disconnected player bodies remain visibly alive without changing protected player state. Starting clean in UE 5.8 C++ keeps that invariant under our control.
