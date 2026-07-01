# Cliffwald UE Development Setup

This repository baseline is the Unreal Engine 5.8 C++ technical demo. Legacy web/Phaser/Colyseus tooling is not part of the current source tree.

## Engine Roots

- Launcher/editor install: `D:\Epic Games\UE_5.8`
- Source/server install: `D:\UnrealEngine-5.8-source`
- Project: `D:\cliffwald\Cliffwald_UnrealMMO\Cliffwald.uproject`

Launcher UE is fine for editor/client iteration. Dedicated server targets require the source engine or an installed build produced from source with server targets.

## Open Editor

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Open-CliffwaldEditor.ps1"
```

## Core Validation

Run the lightweight technical gate before handoff:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-TechnicalDemoGate.ps1" -SkipRuntimeSmokes
```

This checks Android toolchain readiness, vertical-slice guardrails, Unreal Automation and APK metadata without launching long runtime smokes.

Run the Echo policy automation test directly:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-UnrealAutomation.ps1"
```

The runner uses `-Game -NullRHI -DisablePython` and fails on `LogPython: Error`, so editor Python/toolset startup noise cannot hide inside a green test.

## Runtime Smokes

Dedicated server/client smoke:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-DedicatedServer.ps1"
```

Zero-human autonomous school smoke:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-AutonomousSchool.ps1"
```

Reconnect soak:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-TechnicalDemoGate.ps1" -RunSoak
```

Autonomous server performance gate:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-TechnicalDemoGate.ps1" -SkipRuntimeSmokes -RunPerf
```

## Android

Android readiness:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-MobileToolchain.ps1" -RequireAndroid
```

Package Development arm64:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Package-AndroidDevelopment.ps1"
```

Android emulator or device smoke:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-AndroidDevice.ps1" -StartLocalServer -RequireUnrealCsvProfile -RequireFramePacingSample
```

Android is the current mobile performance gate because it can be built locally. iOS requires Apple/Xcode tooling or a remote Mac. Dedicated servers remain Windows/Linux host processes.

## Cleanup

Dry-run generated-output cleanup:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Clean-UnrealGenerated.ps1"
```

Execute cleanup:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Clean-UnrealGenerated.ps1" -Execute
```

Generated folders such as `Saved`, `Intermediate`, `Binaries`, `DerivedDataCache` and packaged outputs are ignored by git. Do not commit UE generated binaries, Android packages, staged builds, DDC, logs or local profiling captures.
