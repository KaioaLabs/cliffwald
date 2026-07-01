# Cliffwald Documentation Map

This folder separates product design, technical decisions, execution plans and historical notes. The goal is to keep Cliffwald easy for humans and AI agents to navigate without mixing gameplay truth with implementation trivia.

## Primary Documents

- `docs/design/GDD_MASTER.md` - Product source of truth. Engine-agnostic game design, rules, pillars, systems and content.
- `docs/technical/TECHNICAL_DECISIONS.md` - Implementation stance, architecture decisions, platform notes and non-product constraints.
- `PROGRESS.md` - Current execution status, latest evidence and next high-priority gaps.
- `AGENTS.md` - Root instructions for AI coding agents and human contributors using agent workflows.

## Supporting Documents

- `docs/design/PROTOTYPE_DESIGN_CONTRACT.md` - Definitive prototype design contract: locked decisions, rejected ideas and playtest hypotheses.
- `docs/design/audits/GDD_V3_3_ZERO_TRUST_AUDIT.md` - Zero-trust review of the older v3.3 sanctuary/PvP draft against current product and technical reality.
- `docs/design/inbox/GDD_V3_3_SANCTUARY_PVP_DRAFT.md` - Preserved non-authoritative user-provided draft text used by the audit.
- `docs/design/TIME_CADENCE_RESEARCH.md` - Evidence, hypotheses and playtest plan for school-day/night/course cadence.
- `docs/technical/DEV_SETUP.md` - Local Unreal setup, validation and cleanup commands.
- `docs/security/ZERO_TRUST.md` - Server-authority and persistence safety policy.
- `docs/management/PROJECT_HISTORY.md` - Historical notes that explain what was removed from the legacy prototype and why.

## Document Boundaries

- Use the GDD for what the game is and how it should feel.
- Use technical docs for how the current or future implementation satisfies the GDD.
- Use management docs only for history and execution notes.
- Use Unreal scripts and saved validation logs for current technical evidence.

## Current Clean Baseline Rationale

The repository is now UE-first. The legacy Phaser/Colyseus/Kaioa prototype, downloaded tool distributions, generated videos, frame packs, local logs and packaged build outputs are not part of the source baseline. They were useful exploration artifacts, but they are no longer the technical demo path.

Modern GDD guidance treats the GDD as a living design reference rather than a single overloaded engineering file. Agent workflow guidance likewise favors a focused root `AGENTS.md` with links to deeper docs instead of tool-specific instruction sprawl.

External references used for this structure:

- https://www.nuclino.com/articles/game-design-document-template
- https://agents.md/
