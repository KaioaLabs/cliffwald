# Cliffwald Technical Demo Progress

Last updated: `2026-07-01 Europe/Madrid`

## Current Baseline

Cliffwald is now an Unreal Engine 5.8 C++ technical demo. The legacy Phaser/Colyseus/Kaioa/UEFN exploration artifacts are no longer part of the source baseline.

Active project:

- `Cliffwald_UnrealMMO`
- UE 5.8 C++ runtime module
- dedicated server target
- server-authoritative 96-student roster
- offline Echo possession model
- Android as the current mobile performance gate

## Validated Technical Capabilities

- UE 5.8 source engine path exists at `D:\UnrealEngine-5.8-source`.
- `CliffwaldServer Win64 Development` compiles from the UE source build.
- Source-matched dedicated server/client package path has been validated.
- The zero-human school runs with `96` Echo student bodies.
- The school clock advances through routine phases with no connected players.
- True slot possession is implemented: a human reclaims one of the 96 student bodies and the Echo yields.
- Reconnect soak has passed with Echo restoration and roster cap remaining `96`.
- Server perf gate has passed for a 120s autonomous run with `96` Echoes, zero joins, multiple phase transitions and no Iris warnings.
- Android toolchain preflight passes with SDK platforms `android-34/android-35`, NDK `27.2.12479018` and Java `21` from Android Studio JBR.
- Android Development arm64 package path has been validated as package `com.cliffwald.online`.
- Android emulator online smoke has passed with UE CSV Profiler frame evidence.
- UE Automation test `Cliffwald.Echo.Policy` passes and verifies the Echo persistence invariant.
- Headless Automation uses `-Game -NullRHI -DisablePython` and fails on `LogPython: Error`.
- Generated UE output cleanup has been validated; generated packages, logs, DDC, staged builds and binaries are ignored by git.

## Echo Invariant

Offline Echoes are live skins only.

Allowed:

- runtime movement
- visible schedule routines
- social barks/activity
- theatrical magic presentation
- visual attendance at school activities

Forbidden:

- stats, XP, grades or academic points
- gold, economy or trade
- inventory, cards or equipment
- prestige, sanctions or alignment
- irreversible narrative or account choices

## Validation Commands

Lightweight technical gate:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-TechnicalDemoGate.ps1" -SkipRuntimeSmokes
```

UE Automation:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-UnrealAutomation.ps1"
```

Dedicated server smoke:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-DedicatedServer.ps1"
```

Autonomous school smoke:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-AutonomousSchool.ps1"
```

Android hardware/emulator smoke:

```powershell
rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-AndroidDevice.ps1" -StartLocalServer -RequireUnrealCsvProfile -RequireFramePacingSample
```

## Current Open Gaps

- Physical Android hardware thermal/GPU validation is still required before claiming final mobile readiness.
- iOS packaging/signing requires Apple/Xcode tooling or a remote Mac.
- Production online control plane still needs a minimal supported EOS/session/database design before real deployment.
- The UE demo clock still runs at technical-demo speed; product time cadence is deliberately unresolved and now tracked as a zero-trust playtest/research question.
- The older GDD v3.3 sanctuary/PvP draft has been preserved and audited as non-authoritative input; client-authoritative spells, shared-body reassignment, fixed 45-minute cadence and freeform AI chat are not accepted as final design.
- Longer runtime soak should be repeated after major gameplay or networking changes.

## Cleanup Status

- Legacy web/2D source and generated exploration artifacts have been removed from the clean baseline.
- UE generated output remains ignored, not versioned.
- `Scripts\Clean-UnrealGenerated.ps1` is the supported cleanup path for generated UE project directories; use `-Deep` only when binaries and packaged outputs can be regenerated.
- Do not commit packaged builds, binaries, logs, local DDC, profiling captures, Android APKs or downloaded third-party tool distributions.
