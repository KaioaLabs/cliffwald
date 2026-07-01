# Project History

This file preserves why older material disappeared from the clean source baseline.

## Legacy Prototype Removed From Source

Earlier Cliffwald work included a Phaser/Colyseus/Express/Prisma 2D prototype, Kaioa/Tiled tooling, visual shader research packs, browser QA scripts, UEFN experiments and downloaded editor/tool distributions.

Those artifacts were useful while exploring the product shape, but they are not the current technical-demo baseline. The active implementation path is now:

- Unreal Engine 5.8 C++ project under `Cliffwald_UnrealMMO`
- source-built UE dedicated server path for authoritative multiplayer
- 96 persistent student bodies with Echo possession
- UE Automation and PowerShell validation scripts as the technical gate
- generated packages, logs, DDC, staged builds and local profiling outputs kept out of git

## Current Source Of Truth

- Product rules: `docs/design/GDD_MASTER.md`
- Technical decisions: `docs/technical/TECHNICAL_DECISIONS.md`
- Local setup: `docs/technical/DEV_SETUP.md`
- Current progress: `PROGRESS.md`
- Agent workflow: `AGENTS.md`

Do not revive the old web/2D stack as the mainline unless a future decision document explicitly reopens that product lane.
