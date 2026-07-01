# GDD v3.3 Zero-Trust Audit

**Audited input:** `docs/design/inbox/GDD_V3_3_SANCTUARY_PVP_DRAFT.md`
**Date:** 2026-07-01
**Status:** Advisory audit. No proposal in the input is accepted as product truth until tested or reconciled with the active source documents.

## Audit Method

This audit assumes every attractive idea may be wrong. Each claim is checked against:

- Active product source: `docs/design/GDD_MASTER.md`.
- Current project evidence: `PROGRESS.md`.
- Technical constraints: `docs/technical/TECHNICAL_DECISIONS.md`.
- Server-authority policy: `docs/security/ZERO_TRUST.md`.
- External player/industry evidence where available.

## Executive Verdict

The draft has several strong instincts: small-world density, short classes, Echo presence, sanctuaries, optional high-risk zones and a light progression model. It also contains several unsafe or outdated assumptions.

Status conflict:

- The draft labels itself as "final" and "diseño cerrado", but the active source of truth is `docs/design/GDD_MASTER.md` version 5.0.
- Therefore this draft is treated as historical/proposal input only.

Hard blockers:

- **Client-validating spell success is rejected.** It violates Cliffwald's server-authority rule and creates avoidable cheat surfaces.
- **Shared body reassignment is rejected for real players.** Humans must reclaim the same student identity; another player should not overwrite a real player's body or appearance.
- **45 minutes is not accepted as final cadence.** It is a useful candidate for session testing, not a validated product truth.
- **Freeform AI chat is not accepted for MVP.** Echo barks should be curated, filtered and rate-limited before any generative dialogue is considered.
- **The JS roadmap is obsolete.** The current baseline is UE 5.8 C++ with a dedicated server.
- **Several names/terms are IP-risky.** Terms such as specific staff names from existing franchises, "Bosque Prohibido" and "varita" should be replaced with original Cliffwald language before public use.

## Decision Table

| Draft Claim | Zero-Trust Verdict | Reason | Action |
| --- | --- | --- | --- |
| Cliffwald as small-world academic simulation | Keep | Matches the active GDD and current 96-body technical slice. | Preserve as product pillar. |
| Low floor, low maintenance | Keep, test | Strong fit for mobile and short sessions, but class frequency and rewards need telemetry. | Treat as design goal with playtest metrics. |
| Authority of time | Adapt | Time creates drama, but "absolute authority" can become FOMO. | Rephrase as "time creates opportunities and risk." |
| Echo theatre | Keep with stricter wording | Matches core product, but Echoes are live skins only. | Preserve Echo presence; keep hard no-mutation rule. |
| Player is an "alma" possessing a body | Maybe | Fiction can work, but UX must avoid making identity feel disposable. | Explore as lore language, not technical ownership rule. |
| 45-minute day, 30 day / 15 night | Test only | Similar to Roblox school pacing, but not proven for a persistent course/calendar. | Include in cadence tests, do not lock. |
| Classes are 3-5 minute minigames | Keep, test | Good short-session shape; risk is shallow repetition. | Prototype one class and measure replay fatigue. |
| 10 classes/month enough to pass | Test only | Good anti-grind instinct, but the unit "month real" conflicts with unresolved cadence. | Move into academic progression experiments. |
| Login picks an available body of house | Reject for real players | Conflicts with identity continuity. | Use assigned persistent student slot; seeded NPC slots can be claimed once. |
| Echo keeps previous player's clothes until overwritten by next player | Reject for real players | Breaks ownership, privacy expectation and identity continuity. | Real player's appearance stays on their own student; only unassigned seeded Echoes can be overwritten on first claim. |
| One instance, player #101 queue | Keep for MVP, do not overpromise | Single shard is simplest, but growth needs shard/spectator/onboarding strategy. | Document as MVP option, not forever architecture. |
| Echo contextual barks | Keep with controls | Good ambience; risk is moderation noise, repetition and uncanny behavior. | Start with curated phrase banks, cooldowns, local context and moderation filters. |
| Echo AI chat as generated conversation | Reject for MVP | Cost, moderation and safety risk are too high before the social foundation works. | Revisit later behind strict guardrails. |
| Client validates gesture spell correctness | Reject | Direct conflict with server authority and anti-cheat requirements. | Client may predict VFX; server validates spell request, cooldown, trace plausibility and outcome. |
| RPS spell triad | Keep, test | Clear prototype combat loop; may be too shallow alone. | Use as first duel grammar, add utility/social spells separately. |
| Sanctuaries: infirmary and dorms | Keep | Strong anti-griefing structure and readable fiction. | Preserve as core safety rule. |
| House-only common rooms | Keep with caveat | Supports identity, but too much separation can reduce social mixing. | Add neutral social hubs and event exceptions. |
| Night PvP across halls, dining hall and classrooms | High-risk test | Can create drama, but griefing risk is severe in a school social game. | Start with non-lethal PvP, clear warnings, opt-in escalation or restricted conflict routes. |
| Forbidden/wild zone always PvP | Keep with consent | Good high-risk zone if clearly optional. | Require explicit entry messaging and safe exits. |
| 200x200 tiles | Reject as product spec | Tile count is legacy/implementation detail and not UE-first. | Express world scale as density, route time and encounter goals. |
| Soft-body crowd fluid system | Defer | Good fantasy, likely overengineering for 96 actors. | Start with UE movement/collision/nav avoidance; only upgrade if bottleneck appears. |
| CASTLE_LAYOUT_V2 priority | Unknown | No audited current source in active docs. | Treat as historical reference until found and reviewed. |
| AcademicManager credits | Keep concept | Lightweight credits fit low-grind school progression. | Rename engine-agnostically in GDD; implement server-authoritative. |
| Absences have no penalty, only missing progress | Keep | Strong anti-FOMO principle. | Preserve; ensure Echo attendance does not progress grades. |
| Card album and cosmetics as main progression | Keep, test economy | Good non-power progression; needs scam/trade/economy guardrails. | Favor account-bound cosmetics early; delay open trading. |
| generate_world_v5.js roadmap | Reject | Legacy JS path conflicts with current UE-first baseline. | Replace with UE map/content/data-asset workflow. |
| Possession and visual persistence next step | Already partly implemented | UE slice already has slot possession and Echo restoration. | Continue hardening with identity and appearance tests. |
| IA chat next step | Defer | Ambience is useful, but combat/classes/safety may be higher leverage. | Implement curated barks before generative chat. |

## Detailed Reasoning

### 1. Small World Is Strong

The best part of the draft is the small-world premise. It matches the active GDD: Cliffwald is not a generic MMORPG map; it is a dense school with around 96 visible bodies. The current UE vertical slice already proves 96 Echo presences and zero-human autonomous school behavior, so this is not only aesthetic. It is technically aligned.

Keep this idea.

### 2. "Low Floor, Low Maintenance" Is Directionally Right

Short classes and low attendance requirements match the mobile/casual target. They also protect the game from turning into chores.

The weak point is specificity. "3-5 minutes" and "10 classes per real month" sound plausible but are not validated. They should become test variables, not GDD law.

Recommended test:

- One 3-minute class.
- One 5-minute class.
- One 8-minute class.
- Measure repeat fatigue, completion, voluntary replays and whether players still have time to socialize.

### 3. The Clock Should Not Be a Tyrant

"La dictadura del reloj" is a strong phrase, but as a product rule it is risky. A real-time school schedule can create atmosphere; it can also punish players who log in at the wrong time.

Better principle:

> The clock creates rhythm, opportunity and risk, but never blocks a normal session from meaningful play.

This keeps the drama without locking the design into FOMO.

### 4. The 45-Minute Cycle Is a Candidate, Not a Truth

The draft's 45-minute cycle is credible as a Roblox-like session loop. It sits near community-reported Royale High school-day timings. That makes it worth testing.

But it fails if treated as literal academic calendar time. Over an 8-week course, a 45-minute day produces 1,792 in-fiction days. That is almost certainly too noisy for a readable school year.

Verdict: test it as an arcade/session cadence, but do not adopt it as final calendar truth.

### 5. Identity Transfer Needs Correction

The draft says a new player can occupy an available body and overwrite appearance. That breaks the current Cliffwald identity rule.

Correct model:

- A real account owns or is assigned one persistent student slot.
- On logout, that same student becomes an Echo.
- On reconnect, the same player reclaims the same student.
- Another human does not overwrite that real player's appearance.
- Seeded/unassigned Echoes may exist to fill the school; those can become permanent assigned students when claimed.

This distinction matters because the fantasy is "my student still exists," not "my account is a ghost that rents bodies."

### 6. Echo Barks Are Good, Generative AI Chat Is Not MVP-Safe

Contextual barks are a strong ambience tool. They should start as curated short phrase banks with:

- rate limits
- local phase/context tags
- house/personality tags
- no protected player-state claims
- no direct player imitation
- no generated private conversation
- moderation filtering for any player-facing dynamic text

Freeform AI chat should wait. It creates moderation, safety, cost and consistency problems before the core school loop is even proven.

### 7. Client-Validated Magic Is Rejected

This is the biggest technical/design conflict in the draft.

Good: tactile gesture input is a strong identity for Cliffwald magic.

Bad: "prioritizing gesture satisfaction over server safety" is not acceptable for multiplayer rewards, PvP or progression.

Supported design:

- Client captures gesture and predicts immediate VFX/audio for feel.
- Client sends gesture trace, timestamp and requested spell.
- Server checks spell availability, cooldown, range, context, plausibility and authority.
- Server decides the actual gameplay outcome.
- Client-side success can only control local presentation until server confirmation.

This keeps game feel without accepting avoidable cheating.

### 8. RPS Combat Is a Useful Prototype, Not a Whole Magic System

Circle/triangle/square is readable and easy to teach. It is good for a first duel prototype.

Risk: if every spell is just shield/attack/area, Cliffwald becomes a tiny combat game rather than a magical-school sim.

Keep the triad for duel grammar, but separate it from utility, exploration, social and mischief magic.

### 9. PvP Rules Need More Anti-Griefing

Sanctuaries are strong. Dorms and infirmary as no-combat zones should remain.

Night PvP everywhere outside sanctuaries is risky. In a social school game, one toxic group can make casual players afraid to leave safe zones. That kills the school fantasy.

Safer first version:

- Day: no hostile PvP except consensual duels/training.
- Night: conflict only in marked routes, secret areas, event zones or after clear opt-in escalation.
- Wild/forbidden zone: always dangerous, but entry is explicit and reversible.
- Consequences are recoverable and never applied to offline Echoes.

### 10. Space Design Should Drop Tile Counts

"200x200 tiles" and `generate_world_v5.js` are legacy implementation language. The active project is UE-first.

The product spec should define:

- time from dorm to class
- number of social chokepoints
- sightline length
- density of secrets
- safe route versus risky shortcut
- maximum mobile rendering complexity

Those are better design constraints than tile count.

### 11. Soft-Body Crowd Physics Is Probably Overengineering

Soft crowd flow sounds elegant, but for 96 bodies it may be unnecessary. It can also produce unpredictable network movement and mobile cost.

Start with:

- capsule collision
- nav avoidance
- route anchors
- low-frequency Echo movement
- local client smoothing

Only add a custom crowd system if simple movement fails in actual playtests.

### 12. IP And Originality Risk

The draft and some older seed content use names/terms strongly associated with an existing wizard-school franchise. That is a real product risk, especially if Cliffwald becomes public. This is not legal advice; it is a zero-trust product/design warning.

Risky examples:

- specific staff names from existing works
- "Bosque Prohibido"
- "varita" as default language if the whole fantasy reads too derivative
- house-school structure that copies too many recognizable beats at once

Action: rename staff, places, school authority and magical tools into original Cliffwald language before public-facing builds.

### 13. Economy And Collection Are Strong If Kept Light

Cards and cosmetics are good main progression because they avoid power creep. They also support mobile sessions and social identity.

Risks:

- trading scams
- pay-to-win perception
- Echoes touching inventory
- duplicate frustration

First implementation should favor account-bound collection, clear drop sources and no open player trading until moderation/audit tools exist.

## Recommended Next Design Shape

Do not merge the v3.3 draft into the master GDD wholesale.

Adopt now:

- small-world academic simulation
- low-maintenance goal
- Echo theatre language with strict protected-state boundary
- sanctuaries
- lightweight class minigames as test target
- card/cosmetic progression as a promising direction

Keep as test candidates:

- 45-minute cycle
- 3-5 minute classes
- 10 classes/month pass rule
- RPS duel grammar
- night conflict routes

Reject or rewrite:

- client-authoritative spell validation
- body rental/appearance overwrite for real players
- freeform AI chat as an early feature
- tile-count product spec
- JS roadmap
- derivative IP names and terms

## Evidence Links

- Active time cadence research: `docs/design/TIME_CADENCE_RESEARCH.md`
- Active zero-trust policy: `docs/security/ZERO_TRUST.md`
- Active technical baseline: `docs/technical/TECHNICAL_DECISIONS.md`
- Unreal networking overview: https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-overview-for-unreal-engine
- Unreal dedicated servers: https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-dedicated-servers-in-unreal-engine
- Roblox text filtering documentation: https://create.roblox.com/docs/ui/text-filtering
- Roblox community standards: https://en.help.roblox.com/hc/en-us/articles/203313410-Roblox-Community-Standards
- Wizarding World submission guidelines: https://www.warnerbros.com/wizardingworldsubmissionguidelines
