# Technical Decisions

## Purpose

This document records implementation decisions and constraints. Product design belongs in `docs/design/GDD_MASTER.md`; this file explains how the codebase or future platform choices support that design.

## Documentation Decision

- The GDD is engine-agnostic and describes Cliffwald as a product.
- Technical stack details, migration plans and prototype constraints live here or in nearby technical docs.
- AI-agent workflow rules live in root `AGENTS.md`.
- Historical notes live in `docs/management/PROJECT_HISTORY.md`.

## Current Prototype

- Active source baseline: Unreal Engine 5.8 C++ under `Cliffwald_UnrealMMO`.
- Server: UE dedicated server from the source engine build.
- Client: UE client, with PC as the fastest iteration path and Android as the first mobile performance gate.
- Persistence/control plane: not implemented in the clean technical demo; future production work should use a small backend plus PostgreSQL and supported EOS/session handoff before custom infrastructure.
- Verification: Unreal Automation and project PowerShell gates.

The earlier Phaser/Colyseus/Prisma prototype has been removed from the source baseline. It remains historical context only.

## Engine And Platform Stance

- Cliffwald should not be defined by a specific engine in the GDD.
- Cliffwald is not Android-only and not PC-only. The implementation stance is cross-platform-first, with Android used as the earliest hard performance gate because it is the most constrained validated client target on this machine.
- A future Unreal implementation should be evaluated against the GDD, especially the persistent student/Echo model.
- MMO Kit can be studied or spiked, but it is not the product baseline unless it proves it supports Cliffwald's possession/Echo model without forcing generic MMORPG assumptions.
- UEFN can be useful for public experiments, but it should not be treated as the core product platform while Cliffwald requires deep ownership of characters, spells, persistence and backend rules.

## Unreal Prototype

- `Cliffwald_UnrealMMO` is now the standalone Unreal prototype path.
- The project descriptor targets Unreal Engine 5.8 and uses a C++ runtime module, game target, editor target and dedicated server target.
- Blueprint assets are not the gameplay foundation. Editor automation is allowed through Python/MCP for world and asset iteration.
- `McpAutomationBridge` is vendored as an editor plugin from the DeepAeroTwin UE 5.7 test project because its descriptor states support through UE 5.8 Preview.
- UE 5.8's experimental Epic `ModelContextProtocol` / Unreal MCP plugin is enabled for editor-only access on port `8000`; the third-party bridge remains available on port `3000` because it exposes broad, proven Python/editor automation for this project.
- UE 5.8 is installed locally at `D:\Epic Games\UE_5.8`; editor, game target, map creation, MCP control and Launcher-client/listen packaging have been validated.
- UE 5.8 source is installed locally at `D:\UnrealEngine-5.8-source`, branch `5.8`; dedicated server and source-matched client cook/archive have been validated.
- Launcher-built clients and source-built dedicated servers must not be mixed. Unreal's network version handshake correctly rejects mismatched engine/build products.
- Current authoritative network smoke test uses the source-built packaged dedicated server and a source-built packaged client.
- The Unreal map now owns static environment geometry. Runtime C++ spawns only gameplay presences such as Echo actors on the server. This follows UE's client/server model better than spawning client-local collision as a workaround.

## UE 5.8 Networking Stack Decision

Decision: use UE 5.8 C++ as the prototype baseline, study Lyra selectively, and prepare EOS/Iris without importing Lyra or MMO Kit as the product foundation.

- Lyra is a reference project, not the Cliffwald base. Use it for patterns around modular gameplay, cross-platform setup and EOS/session flows, but do not inherit its shooter-centric architecture wholesale.
- EOS is the right future path for account identity, sessions, invites and cross-play handoff. The Unreal prototype enables EOS plugins but keeps the default online service as local/null until real EOS Product/Sandbox/Deployment credentials exist.
- Iris is the preferred replication direction for the 96-presence target. UE 5.8 already marks the game net driver as Iris-capable; Cliffwald explicitly enables Iris and asks the game mode to use it.
- Replication must still be interest-driven. The target is not "96 fully expensive pawns broadcast at 60 Hz"; it is 96 school presences with relevance, low-frequency Echo updates and server authority.
- MassEntity/MassGameplay can be revisited if Echo count or background routines outgrow actor-based simulation. At 96 students, lightweight replicated actors with lower tick/update rates are simpler and enough for the first vertical slice.
- MMO Kit remains overkill for Cliffwald unless a spike proves it can preserve the Echo possession model and persistent-state rules without forcing generic MMORPG inventory/combat assumptions.
- Supported server methodology: authoritative gameplay belongs on the server, clients render local approximations, static environment belongs in the map/content, replicated gameplay actors are spawned by server authority, and dedicated deployment must use a source build of Unreal Engine or an installed build produced with server targets.
- The Launcher UE 5.8 install is valid for editor, game/client packaging and listen-server smoke tests, but not for building `CliffwaldServer` from `TargetType.Server`. The local UBT failure matches Epic's requirement that dedicated-server projects use a source build.
- Reconnect/disconnect handling must use Unreal-native ownership surfaces first. Cliffwald stores the claimed roster slot in a custom `ACliffwaldPlayerState` subclass, while `ACliffwaldGameMode::Logout` restores Echo control through that PlayerState when the pawn is unavailable.
- Project-level `[/Script/OnlineSubsystemUtils.IpNetDriver]` config sets `ConnectionTimeout=20.0`, `InitialConnectTimeout=30.0` and `RecentlyDisconnectedTrackingTime=30` for the prototype. This keeps disconnect recovery within the school-presence contract without patching engine networking code.
- Echo persistence policy is covered by UE Automation Tests, not only static script checks. `Scripts\Test-UnrealAutomation.ps1` runs the `Cliffwald.` test filter and verifies that offline Echoes deny protected persistent mutations, allow runtime theatre, and that returning players re-register as `HumanOnline` instead of remaining in the offline Echo state. The headless runner uses UE's supported `-Game -NullRHI -DisablePython` path and fails if `LogPython: Error` appears, so experimental editor Python/toolset startup noise cannot hide inside green automation.

Research anchors:

- Epic's Lyra documentation frames Lyra as a learning resource/sample architecture with cross-platform compatibility and scalability.
- Epic's Online Services EOS and OSS EOS documentation says EOS integration requires registered/configured products and exposes EOS through supported Unreal layers rather than direct EOS SDK calls.
- Epic's Android project settings documentation defines the package name, SDK versions, APK data and architecture switches through `AndroidRuntimeSettings`, so Cliffwald keeps those in project config instead of generated Android files.
- Epic's CSV Profiler documentation describes `-csvCaptureFrames=N`, runtime capture, `Saved/Profiling/CSV` output, built-in frame/unit stats and optional GPU stats. Cliffwald uses that profiler for automated UE-native Android frame evidence instead of relying only on Android `gfxinfo`.
- Epic's Unreal Insights Android documentation confirms that Android UE apps receive profiling command-line arguments through `UECommandline.txt` / device tooling, so the Android smoke keeps command-line injection in UE-supported paths.
- Epic's Iris documentation describes Iris as opt-in replication intended for larger worlds, higher player counts and lower server costs, while still requiring caution because it is experimental.
- Epic's networking documentation states that UE network multiplayer is client/server, the server holds the authoritative game state, clients render local approximations, and dedicated servers are preferable for large-scale, trusted or high-performance multiplayer.
- Epic's dedicated server setup documentation explicitly requires a source build of Unreal Engine and a C++ client/server project.

Official references:

- Dedicated Servers: https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-dedicated-servers-in-unreal-engine
- Networking Overview: https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-overview-for-unreal-engine
- Iris Replication: https://dev.epicgames.com/documentation/en-us/unreal-engine/iris-replication-system-in-unreal-engine
- Online Services EOS: https://dev.epicgames.com/documentation/unreal-engine/enable-and-configure-online-services-eos-in-unreal-engine
- Online Subsystem EOS: https://dev.epicgames.com/documentation/en-us/unreal-engine/online-subsystem-eos-plugin-in-unreal-engine
- Android Project Settings: https://dev.epicgames.com/documentation/unreal-engine/android-settings-in-the-unreal-engine-project-settings
- Android Quick Start: https://dev.epicgames.com/documentation/unreal-engine/android-quick-start
- Android Development Requirements: https://dev.epicgames.com/documentation/en-us/unreal-engine/android-development-requirements-for-unreal-engine
- iOS, iPadOS and tvOS Development Requirements: https://dev.epicgames.com/documentation/en-us/unreal-engine/ios-ipados-and-tvos-development-requirements-for-unreal-engine
- Mobile Performance Guidelines: https://dev.epicgames.com/documentation/en-us/unreal-engine/performance-guidelines-for-mobile-devices-in-unreal-engine
- CSV Profiler: https://dev.epicgames.com/documentation/en-us/unreal-engine/csv-profiler
- Unreal Insights on Android Devices: https://dev.epicgames.com/documentation/unreal-engine/how-to-use-unreal-insights-to-profile-android-games-for-unreal-engine
- Unreal on GitHub: https://www.unrealengine.com/ue-on-github

## Unreal Server Status

- `CliffwaldServer.Target.cs` exists and is valid.
- `D:\Epic Games\UE_5.8` is a Launcher-style installed distribution whose `[InstalledPlatforms]` data does not include `PlatformType="Server"`. UBT correctly fails there with `Server targets are not currently supported from this engine distribution.`
- Do not patch Epic's `BaseEngine.ini` to fake `PlatformType="Server"` in the Launcher install. That would bypass metadata but not provide a supported server toolchain/content pipeline.
- Root fix: use `D:\UnrealEngine-5.8-source` branch `5.8`, or later produce an installed build from source that includes server targets.
- Bootstrap caveat: do not exclude `IOS` in this UE source branch. Win64 `BuildCookRun` still compiles AutomationTool platform scripts, and excluding iOS removed `IOS.Automation` resources such as `GreenCheck.png`, breaking the official cook/archive path.
- Source setup script: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Setup-UE58SourceServer.ps1"`
- Validated source pipeline: `Setup-UE58SourceServer.ps1 -Bootstrap -BuildServer -CookServer -CookClient` after the source clone already exists.
- Packaged dedicated server: `D:\cliffwald\Cliffwald_UnrealMMO\PackagedServer\WindowsServer\CliffwaldServer.exe`.
- Source-matched packaged client: `D:\cliffwald\Cliffwald_UnrealMMO\PackagedSourceClient\Windows\Cliffwald.exe`.
- Validated dedicated smoke command: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-DedicatedServer.ps1"`.
- Latest autonomous-school smoke result: UDP `0.0.0.0:7777`, `96` Echo AI presences, `0` connected clients, `2` school-clock phase transitions, `0` fatal/error/ensure counts and `0` server Iris startup warnings.
- Latest dedicated client smoke result: UDP `0.0.0.0:7777`, Iris active, `96` Echo AI presences, one local client joined/welcomed, `2` school-clock phase transitions, `0` fatal/error/ensure counts, `0` client movement-base warnings and `0` server Iris startup warnings.
- Latest reconnect soak result: `3` connect/disconnect cycles, `3` human slot claims, `3` Echo restorations, roster cap stayed at `96`, `0` server/client errors and `0` Iris startup warnings.
- Latest server perf result: 120s autonomous dedicated-server run, `96` Echoes, `0` joins, `4` school phase transitions, peak working set about `295.51 MB`, peak private memory about `192.28 MB`, `0` server errors and `0` Iris warnings. Evidence CSV: `D:\cliffwald\Cliffwald_UnrealMMO\Saved\Logs\CliffwaldServerPerf.csv`.
- Resolved Iris startup warning: UE 5.8 Development runtime was lazy-loading `PerfCounters`, `AutomationWorker` and `AutomationController` after the map/net driver had already created an Iris `ReplicationSystem`, which triggered `FInternalNetSerializerDelegates::BroadcastLoadedModulesUpdated()`. Cliffwald now preloads the affected runtime modules from the game module before Iris starts replication; Automation modules are gated to non-shipping builds. Do not fix this by silencing `LogIris` or patching Iris engine code.
- Disk status after source server/client cooks is tight, so generated Unreal project artifacts can be cleaned with `Scripts\Clean-UnrealGenerated.ps1 -Execute`. Use `-Deep` only when binaries and packaged outputs can be regenerated. Do not start another full source/editor rebuild without checking free space first.

## Echo Persistence Invariant

The Echo is visible runtime theatre, not persistent player authority.

- AI-controlled Echoes may change visible position, animation, bark state, activity and other ephemeral runtime presentation.
- AI-controlled Echoes must not persist player stats, gold, XP, academic points, prestige, alignment, sanctions, inventory, cards, equipment or irreversible choices.
- Server-side systems that mutate economy, inventory, prestige, sanctions or player persistence must guard against `entity.ai`.
- Autosave must ignore AI-controlled player bodies.

## Scale Target

- Product target: one school instance with up to 96 persistent student bodies.
- Human concurrency can vary; disconnected humans are represented by AI Echoes.
- Networking should be designed around interest/relevance rather than broadcasting every actor to every client.
- The Unreal vertical slice now materializes the zero-human school as 96 autonomous Echo continuity bodies.
- True slot possession is implemented in the Unreal slice: a human joins by claiming one existing student slot, that slot's Echo yields, and the total visible roster remains capped at 96.
- Echoes are replicated/movement-ready with reduced tick and net update rates. Their current runtime activity remains visual only.
- The hard server invariant remains: Echo AI may animate the body, but persistent stats/items/currency/grades are mutated only by server-authorized human actions or explicitly whitelisted positive offline systems.

## Autonomous School Slice

Decision: the minimum UE vertical slice must run the school with zero connected humans.

- `ACliffwaldSchoolGameState` is the server-authoritative school clock. It replicates day, time and phase.
- The initial compressed schedule advances through sleep, breakfast, class, lunch, free time, dinner and curfew.
- Current UE demo clock speed is deliberately accelerated: `GameMinutesPerRealSecond = 4.0`, so a 24-hour clock loop lasts `6` real minutes. This is a technical-demo setting, not the final product cadence.
- Product cadence is unresolved and must remain configurable. `5h36m`, `144m`, `90m` and `48m` cycles are research candidates, not hardcoded targets.
- The time-cadence research record is `docs/design/TIME_CADENCE_RESEARCH.md`.
- Future implementation should expose game minutes per real second and phase boundaries through supported server config/data assets, then log playtest telemetry for rush, waiting, phase participation and Echo believability.
- `ACliffwaldPrototypeWorld` spawns `96` Echo actors on the server for the full zero-human roster.
- `ACliffwaldEchoStudentActor` reads the replicated school phase and moves to deterministic phase anchors for dorm, dining, class and free-time areas.
- Echo actor tick is throttled to `0.2s`, net update frequency is reduced to `5Hz` with `1Hz` minimum, and cull distance remains finite. This is the intended starting shape for mobile-friendly replication.
- `Scripts\Test-AutonomousSchool.ps1` is the no-player regression test. It fails unless the dedicated server opens UDP, spawns exactly `96` Echoes, advances school phases without any joins, and reports no fatal/error/ensure or Iris warnings.

## Online Infrastructure Decision

Decision for the first production-shaped milestone: one authoritative UE dedicated-server process runs one Cliffwald school shard, backed by a small control-plane/backend service and a relational database.

- **Game server:** UE dedicated server is authoritative for world state, movement acceptance, Echo routines, spells, rewards and moderation-sensitive actions.
- **Control plane:** a lightweight HTTPS service handles login handoff, account/student-slot lookup, shard status, admin actions, crash/restart policy and patch/version compatibility.
- **Database:** PostgreSQL is the durable source for accounts, roster slots, protected player state, inventory, sanctions, economy and audit logs. SQLite remains local dev only.
- **Identity/cross-play:** Epic Online Services is the preferred future layer for cross-platform identity, sessions, invites and presence once real Product/Sandbox/Deployment credentials exist. The UE prototype stays local/null until then.
- **Shards:** MVP runs a single school world. If more than 96 active student slots are needed later, add shard allocation in the control plane rather than raising per-server population blindly.
- **Persistence boundary:** Echo routine state is transient server runtime. Protected player state is saved only through server-authorized human actions or explicitly whitelisted positive offline systems.
- **Web:** native browser play is not the baseline for UE. If a web client is required, treat it as a separate product track such as Pixel Streaming/cloud rendering or a distinct lightweight client, not a promise of direct UE client parity.

## Platform And Mobile Stance

Decision: build one cross-platform Unreal client/server architecture, validate Windows first for iteration speed, and keep Android as the early performance gate. This is not an Android-only project.

- Dedicated servers stay on Windows/Linux host targets, not on mobile devices.
- PC and mobile clients share the same C++ gameplay rules. Platform differences should live in device profiles, input adapters, packaging/signing, scalability settings and asset quality tiers.
- Android is the current mobile validation target because it can be built from this Windows machine and exposes the strictest CPU/GPU/memory constraints already available locally.
- iOS is a planned client target, but final packaging/signing requires Apple tooling, Xcode and likely a local or remote Mac.
- Switch-family support should be treated as a future licensed platform lane. The architecture should avoid PC-only assumptions, but no Switch package can be promised without official SDK access and platform certification work.
- Native web is not the baseline for UE. If a browser version is required, treat it as a separate track such as Pixel Streaming/cloud rendering or a distinct lightweight client.
- Graphics direction should stay stylized and asset-light: low-poly/handcrafted forms, short sightlines, low material complexity, conservative dynamic lights, LODs, instancing/HLOD where useful, and platform device profiles.
- The 96-Echo design must remain CPU/network cheap: reduced AI tick, low net update rates, server relevance/culling, no expensive per-Echo behavior trees in the first slice, and no client authority over protected state.
- Tiny Glade / Little Devil Inside are good visual references for warmth and readability, but the technical bar is Cliffwald's own mobile-safe school simulation, not copying their rendering stack.
- Local platform status on 2026-07-01: Win64 dedicated server/client are built, cooked and smoke-tested. Android SDK/NDK/JBR preflight passes and an arm64 Development APK packages successfully at `D:\cliffwald\Cliffwald_UnrealMMO\PackagedAndroid\Android\Cliffwald-arm64.apk`; the local emulator online smoke passes with memory budgets and UE CSV Profiler frame evidence. iOS cannot be fully packaged or signed from this Windows-only environment without Apple/Xcode tooling or remote Mac setup.

## Android Packaging Decision

Decision: use the official UE 5.8 source Android pipeline and keep local build fixes in scripts/configuration, not in engine hacks.

- Android project identity is configured through `[/Script/AndroidRuntimeSettings.AndroidRuntimeSettings]` in `Config\DefaultEngine.ini`: package `com.cliffwald.online`, display name `Cliffwald`, version `0.1.0`, min SDK `26`, target SDK `35`, arm64 enabled and x86_64 disabled for the current mobile gate.
- Google Play support, AdMob, Android voice, IMU and in-app purchasing stay disabled until those platform services have explicit product decisions. The current APK must not request `com.android.vending.BILLING`.
- Unreal currently still emits `com.android.vending.CHECK_LICENSE` in the packaged APK. Treat that as UE-generated Android packaging behavior, not as Cliffwald enabling billing or a custom license-check feature.
- EOS plugins/config remain disabled in the runnable local prototype until real Epic Developer Portal Product/Sandbox/Deployment credentials exist. Development uses `OnlineSubsystem Null`; future production identity/session work should use UE's Online Services EOS/EOSGS path first, with OSS EOS as the mature subsystem fallback when appropriate.
- Android dependencies are restored through Epic's `GitDependencies.exe` for the UE source checkout.
- `SetupAndroid.bat` is used for the official SDK/NDK/CMake setup. The validated NDK is `27.2.12479018`.
- Android packaging uses Android Studio's bundled JBR Java 21, not the globally installed Java 25, because Gradle/UE compatibility is bounded by the Android toolchain.
- `Scripts\Package-AndroidDevelopment.ps1` sets Android environment variables, routes Gradle to a no-spaces JBR junction, uses an isolated Gradle cache and runs UAT with source UE 5.8.
- `Scripts\Package-AndroidDevelopment.ps1` cleans generated Android intermediates by default before packaging so stale Unreal placeholder Java namespaces cannot survive a project package-name change. Use `-KeepAndroidGenerated` only for targeted Android build debugging.
- Android `BuildCookRun` must include the `-package` phase. `-stage`, `-pak` and `-archive` alone can produce an APK that launches Android Activity code but does not contain cooked game content. The package script now fails unless the resulting APK contains cooked UE content such as `.pak`, `.utoc`, `.ucas` or embedded OBB data.
- `-NoUBA` is used on the Android package path because the local UBA path produced unreliable arm64 retries earlier; this is a build-executor choice, not a gameplay patch.
- `-ForcePackageData` is acceptable for the current small Development APK. Revisit APK/AAB/asset delivery strategy before distribution.
- The current Android APK contains `assets/main.obb.png` with cooked content. Activity-only APKs are invalid even if `aapt` metadata is correct.
- A successful package is not the same as a passed mobile gameplay target. Android emulator online smoke now passes with memory budgets and UE CSV Profiler frame pacing evidence, but the next proof is representative thermal/GPU capture on real Android hardware.
- `Scripts\Test-AndroidDevice.ps1` is the official local Android hardware/emulator smoke path. It installs the APK, injects command line through UE 5.8-supported Android paths, can start a local dedicated server, launches the app, requires UE engine initialization in logcat, captures logcat, pulls the UE device log when available and saves `dumpsys meminfo` / `dumpsys gfxinfo` evidence plus `Saved\Logs\CliffwaldAndroidMetrics.json`. It enables Unreal's CSV Profiler through a Cliffwald runtime command-line hook: `-CliffwaldCsvCaptureFrames=360 -CliffwaldCsvCaptureDelaySeconds=30`. The client HUD starts `FCsvProfiler::BeginCapture` after gameplay warmup, the script pulls `Saved/Profiling/CSV`, analyzes the final `240` gameplay frames and fails if the UE CSV sample is missing or exceeds p95/p99 budgets. This avoids measuring Android/UE startup as gameplay. For Android emulators it uses `10.0.2.2` for the local host server route.
- Android smoke budgets currently fail when total PSS exceeds `1200 MB`, total RSS exceeds `1400 MB`, or total swap PSS exceeds `512 MB`. These are smoke-test guardrails, not final store-performance targets.
- `dumpsys gfxinfo` can report only a tiny Java Activity/SurfaceView sample for this UE app on the local emulator. The script records those values as auxiliary Android-system evidence. `-RequireFramePacingSample` now accepts a usable UE CSV Profiler sample; real mobile readiness still requires hardware thermal/GPU runs rather than claiming success from a 2-3 frame emulator `gfxinfo` sample.
- `Scripts\Test-TechnicalDemoGate.ps1` is the unified local technical gate. Without `-RunAndroidDevice`, it proves the Windows/server side and Android package/toolchain side. With `-RunAndroidDevice`, it also requires real Android launch/join/perf evidence and UE-native CSV frame evidence.

## Validation Commands

- Unreal editor target: `rtk proxy "D:\Epic Games\UE_5.8\Engine\Build\BatchFiles\Build.bat" CliffwaldEditor Win64 Development -Project="D:\cliffwald\Cliffwald_UnrealMMO\Cliffwald.uproject" -WaitMutex -NoHotReload -NoLiveCoding`
- Unreal packaged build: `rtk proxy "D:\Epic Games\UE_5.8\Engine\Build\BatchFiles\RunUAT.bat" BuildCookRun -project="D:\cliffwald\Cliffwald_UnrealMMO\Cliffwald.uproject" -noP4 -platform=Win64 -clientconfig=Development -build -cook -map=/Game/Maps/L_CliffwaldPrototype -stage -pak -archive -archivedirectory="D:\cliffwald\Cliffwald_UnrealMMO\Packaged"`
- Unreal listen-server smoke: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-ListenServer.ps1"`
- Unreal autonomous school smoke: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-AutonomousSchool.ps1"`
- Unreal source dedicated smoke: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-DedicatedServer.ps1"`
- Unreal Android toolchain preflight: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-MobileToolchain.ps1" -RequireAndroid`
- Unreal Android Development package: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Package-AndroidDevelopment.ps1"`
- Unreal vertical-slice guardrails: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-VerticalSliceGuardrails.ps1"`
- Unreal automation tests: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-UnrealAutomation.ps1"`
- Unified technical demo gate: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-TechnicalDemoGate.ps1"`
- Unified gate with reconnect soak: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-TechnicalDemoGate.ps1" -RunSoak`
- Unified gate with autonomous server perf: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-TechnicalDemoGate.ps1" -SkipRuntimeSmokes -RunPerf`
- Android real-device online smoke: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-AndroidDevice.ps1" -StartLocalServer`
- Android physical-device frame pacing gate: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-AndroidDevice.ps1" -StartLocalServer -RequireUnrealCsvProfile -RequireFramePacingSample`
Use the narrowest command that validates the changed surface, then broaden before major handoff.
