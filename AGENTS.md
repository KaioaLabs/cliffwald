# AGENTS.md

## Project

Cliffwald Online is a persistent magical-school simulation. The core product rule is that every student body keeps existing: when a human disconnects, an AI Echo controls visible presence only; when the human returns, they reclaim the same student identity.

## Source Of Truth

- Product/design: `docs/design/GDD_MASTER.md`
- Documentation map: `docs/README.md`
- Technical decisions: `docs/technical/TECHNICAL_DECISIONS.md`
- Current progress and next gaps: `PROGRESS.md`
- Historical implementation notes: `docs/management/PROJECT_HISTORY.md`

## Hard Product Rules

- Echo offline is a live skin: presence, routine and visible theatre only.
- AI may move, attend class visually, eat, sleep, socialize, bark, react to events, enter duel zones or use theatrical magic.
- AI must never persist player stats, gold, XP, academic points, prestige, alignment, sanctions, inventory, cards, equipment or irreversible choices.
- Server authority is mandatory. Client input is never trusted for stats, items, prestige, auth, admin actions or permissions.
- The product GDD is engine-agnostic. Engine/platform implementation choices belong in technical docs.

## Commands

Always prefix shell commands with `rtk` when possible. In PowerShell, use executable commands through `rtk proxy` when needed.

- UE Automation: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-UnrealAutomation.ps1"`
- Technical gate: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-TechnicalDemoGate.ps1" -SkipRuntimeSmokes`
- Dedicated server smoke: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-DedicatedServer.ps1"`
- Autonomous school smoke: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-AutonomousSchool.ps1"`
- Android toolchain preflight: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Test-MobileToolchain.ps1" -RequireAndroid`
- Clean generated UE project output: `rtk proxy powershell -NoProfile -ExecutionPolicy Bypass -File "D:\cliffwald\Cliffwald_UnrealMMO\Scripts\Clean-UnrealGenerated.ps1" -Execute`

## Working Rules

- Read `PROGRESS.md` before resuming implementation work.
- For design changes, update `docs/design/GDD_MASTER.md` first, then technical docs if implementation constraints change.
- For agent/developer workflow changes, update this file.
- Do not vendor paid Fab/Unreal/marketplace assets into git without an explicit license decision.
- Do not remove user work or generated assets unless the task explicitly asks for cleanup.
- Validate code changes with the narrowest relevant Unreal command, then broaden to the technical gate if the change touches shared behavior.

## Documentation Rules

- Keep GDD sections about player experience, rules, systems, content and acceptance criteria.
- Keep implementation stack, ports, commands, runtime notes and migration decisions outside the GDD.
- Prefer small, named documents over a single catch-all file.
