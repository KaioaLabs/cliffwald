# Cliffwald Prototype Design Contract

**Status:** Definitive baseline for the current playable prototype.
**Scope:** Product/design decisions only. Technical implementation remains in `docs/technical/TECHNICAL_DECISIONS.md`.
**Date:** 2026-07-01

This document resolves the v3.3 proposal into three buckets:

- **Locked:** implement as product truth for the current prototype.
- **Rejected:** do not implement in this form.
- **Playtest:** keep configurable and validate in-game before locking.

The goal is to preserve the strongest ideas without pretending that untested numbers, schedules or combat rules are already proven.

## 1. North Star

Cliffwald is a compact persistent magical-school simulation where a fixed school population keeps existing. A player does not vanish from the school fiction when they disconnect: their student remains visible as an Echo. The core fantasy is a dense, strange, social school that keeps breathing even when the human roster is low.

Cliffwald should feel easy to enter and hard to exhaust:

- low friction sessions
- short meaningful activities
- social density over map size
- rules that create stories
- night risk without griefing
- progression that respects real life

## 2. Locked For Prototype

### 2.1 Small World, High Density

One school instance targets **96 persistent student bodies**. This is not a generic large MMO. The school should feel readable, theatrical and socially dense.

Locked implications:

- Routes should create encounters.
- Empty space is a bug, not prestige.
- A compact school with repeated social crossings is better than a huge campus.
- Growth beyond one school should use shards or future onboarding, not unlimited bodies in one instance.

### 2.2 Same Student Identity

A real player owns or is assigned one persistent student identity.

Locked implications:

- Login reclaims the same student.
- Logout turns that same student into an Echo.
- Reconnect restores human control of that same student.
- No other human overwrites that real player's name, house, identity or appearance.
- Seeded unassigned Echo students may exist, but only as claimable empty roster slots before they become real identities.

### 2.3 Echo Is A Live Skin

Echoes exist for presence, routine and theatre only.

Echoes may:

- walk through routines
- attend class visually
- eat, sleep and socialize visually
- emit contextual barks
- react to nearby events
- use theatrical magic if it does not mutate protected state

Echoes must never:

- change stats, grades, XP, prestige or sanctions
- buy, sell, trade, consume or lose items
- change inventory, equipment, cards or currency
- make irreversible narrative choices
- create negative persistent consequences for the real player

Short rule:

> AI controls presence, not property. AI controls theatre, not progress.

### 2.4 Server Authority

The server is authoritative for protected gameplay.

Locked implications:

- Client input can feel instant, but final outcomes are server-authoritative.
- Gesture casting may use local prediction for feel.
- The server decides spell validity, cooldowns, range, hit results, rewards, PvP effects and persistence.
- Client-side validation is presentation, not truth.

### 2.5 Low Maintenance School Life

The prototype should support short sessions and avoid chore pressure.

Locked implications:

- Classes should be short activities, not simulated work shifts.
- Missing a class should mainly mean missing that opportunity, not receiving punishment.
- Core progression should not require perfect attendance.
- A 30-60 minute session must offer meaningful play even if the current school phase is not ideal.

### 2.6 Core School Rhythm

The school needs a recognizable rhythm:

- breakfast / morning social gathering
- class block
- lunch / social regroup
- free time
- evening social regroup
- night / curfew / risky play

The exact duration of the rhythm is not locked.

### 2.7 Sanctuaries And Anti-Griefing

Sanctuaries are locked.

Locked safe spaces:

- house common rooms / dorm access
- infirmary or recovery space
- onboarding and essential UI zones

Rules:

- Damage and hostile PvP are disabled in sanctuaries.
- Offline Echoes do not receive persistent punishments.
- PvP must never turn normal school life into spawn camping or social harassment.

### 2.8 Curated Echo Barks

Echoes should speak in short contextual barks, but the first version must be curated.

Locked guardrails:

- phrase banks before generative chat
- cooldowns and repetition limits
- phase/location/personality tags
- no private imitation of real players
- no claims about protected player state
- moderation/filtering path before any dynamic player-facing text

### 2.9 Light Collection Progression

The first progression direction is school-flavored and mostly non-power:

- cosmetics
- collectible cards
- class/event rewards
- social privileges
- lore and secrets

Trading and economy must stay conservative until audit/moderation tools exist.

### 2.10 Original Cliffwald Language

Public-facing names, staff, places and magical terms should read as Cliffwald, not as a derivative wizard-school clone.

Locked implication:

- Avoid franchise-specific names and terms.
- Use original staff names, place names, school authority language and magical tools.
- Public builds should not contain obvious borrowed names from existing magical-school IP.

## 3. Rejected In Current Form

### 3.1 Client-Authoritative Spell Success

Rejected:

> The client determines whether the drawing is correct and sends "Cast Spell X"; cheats are accepted for feel.

Reason:

- This violates server authority.
- It creates avoidable PvP and reward cheats.
- It will become technical debt the moment spells affect other players, items, grades or progression.

Replacement:

- Client predicts animation, VFX and responsiveness.
- Client sends gesture trace/request.
- Server validates context and resolves outcome.

### 3.2 Disposable Body Possession

Rejected:

> A player downloads their soul into any available body and may overwrite the previous appearance.

Reason:

- It breaks identity continuity.
- It makes the player's public school life feel disposable.
- It conflicts with the Echo premise already validated in the prototype.

Replacement:

- Real players reclaim their assigned student.
- Only unassigned seeded Echoes can become newly claimed students.

### 3.3 Fixed 45-Minute Day As Final Truth

Rejected:

> The final school day is 45 real minutes.

Reason:

- It is plausible as a session loop.
- It is not proven as the best Cliffwald cadence.
- If treated as literal academic calendar time, it creates an unreadable number of in-fiction days per course.

Replacement:

- Keep 45/48 minutes as one playtest candidate.
- Keep all cadence values configurable until playtests produce evidence.

### 3.4 Freeform AI Chat For MVP

Rejected:

> Echoes have open AI chat as an early ambience system.

Reason:

- Moderation risk is high.
- Cost and latency are uncertain.
- Echoes should not imitate real players or invent claims about them.
- Curated barks solve the first ambience problem with much less risk.

Replacement:

- Curated barks first.
- Generative dialogue later only behind strict moderation, age/safety policy, rate limits and audit logs.

### 3.5 Global Night PvP Everywhere

Rejected as default:

> At night, all non-sanctuary halls, classrooms and dining spaces become open PvP.

Reason:

- High griefing risk.
- Casual/social players may feel trapped.
- It can turn the school into a hostile arena instead of a living school.

Replacement:

- Start with marked conflict routes, risky secret areas, consensual duels and optional wild zones.
- Expand only if playtests show the social game survives it.

### 3.6 Tile-Count World Spec And JS Roadmap

Rejected:

- `200x200 tiles` as product scale.
- `generate_world_v5.js` as current roadmap.

Reason:

- The current baseline is UE-first.
- Product scale should be expressed by density, route time, chokepoints, safe paths, risky shortcuts and mobile cost.

### 3.7 Custom Soft-Body Crowd Physics As Starting Requirement

Rejected as a starting requirement.

Reason:

- It is likely overengineering for 96 bodies.
- It can harm network determinism and mobile performance.

Replacement:

- Start with ordinary collision, navigation, avoidance, route anchors and low-frequency Echo movement.
- Revisit only if playtests show crowd flow is a real blocker.

## 4. Playtest Before Locking

### 4.1 Time Cadence

Test candidates:

- **48-minute full cycle:** fast school-session feel.
- **90-minute full cycle:** social MMO middle ground.
- **144-minute full cycle:** longer phases with less rush.
- **4-6 hour full cycle:** persistent roleplay feel.
- **Split clock:** short activity rhythm plus separate academic calendar.

Measure:

- time to first meaningful activity
- percentage of 30/60/120 minute sessions that touch class, free time and night
- rush versus waiting sentiment
- night activity completion
- class attendance versus skipping
- Echo believability

Do not lock the final cadence until this data exists.

### 4.2 Class Duration And Attendance

Test candidates:

- 3-minute class
- 5-minute class
- 8-minute class
- attendance requirement such as 10 classes per season/month equivalent

Measure:

- completion rate
- voluntary replays
- fatigue after repetition
- whether social/free time survives
- whether casual players feel punished

### 4.3 Gesture Magic And Duel Grammar

Test candidates:

- circle / triangle / square RPS duel grammar
- shield / attack / area roles
- gesture recognition tolerance levels
- local prediction delay versus server confirmation

Measure:

- perceived responsiveness
- false positives / false negatives
- PvP fairness
- mobile touch comfort
- exploit rate in server logs

### 4.4 Night Risk

Test candidates:

- no hostile PvP outside opt-in duels
- marked night conflict routes
- risky secret areas
- always-dangerous wild zone
- non-lethal PvP outcomes

Measure:

- casual players leaving safe zones
- grief reports
- night participation
- perceived tension versus resentment

### 4.5 Echo Bark Density

Test candidates:

- low bark frequency
- medium bark frequency
- high bark frequency with cooldowns
- location-specific phrase banks

Measure:

- world feels alive
- repetition annoyance
- chat readability
- moderation issues

### 4.6 Collection Economy

Test candidates:

- account-bound cards
- duplicate conversion
- cosmetic rewards
- no player trading
- limited safe trading later

Measure:

- collection motivation
- frustration with duplicates
- scam/grief risk
- pay-to-win perception

## 5. First Playable Product Slice

The next product-shaped slice should prove the school fantasy without pretending to solve the whole game.

Required:

- 96 visible student bodies.
- Human login/reconnect reclaims the same student.
- Echoes continue routines with zero humans.
- Configurable school clock.
- One short class minigame.
- One social hub.
- One sanctuary.
- One marked risky route or wild area.
- Curated Echo barks.
- One gesture spell with local prediction and server-authoritative result.
- One collectible/cosmetic reward path protected from Echo mutation.
- Basic report/mute/block affordance in the design, even if implementation is minimal.

Not required yet:

- final time cadence
- final academic calendar
- full AI chat
- full economy/trading
- broad night PvP
- custom crowd physics
- large campus

## 6. Evidence Basis

Current evidence supports caution:

- Roblox-like school games show fast loops can work, but player sentiment also flags packed schedules and repetition.
- School roleplay servers show schedules create identity, but calendar/time is often split or fluid.
- Cozy/social MMOs commonly use cycles around 60-120 minutes for accessibility.
- Multiplayer implementation practice and the current Cliffwald policy require server authority.
- Social text systems require filtering, moderation and careful safety design before dynamic AI dialogue.

Relevant local docs:

- `docs/design/GDD_MASTER.md`
- `docs/design/TIME_CADENCE_RESEARCH.md`
- `docs/design/audits/GDD_V3_3_ZERO_TRUST_AUDIT.md`
- `docs/security/ZERO_TRUST.md`
- `docs/technical/TECHNICAL_DECISIONS.md`

Relevant external references:

- https://www.reddit.com/r/RoyaleHigh_Roblox/comments/k0y54m/how_long_is_a_royale_high_school_day/
- https://www.reddit.com/r/RoyaleHigh_Roblox/comments/1k0bm27/whatre_your_thoughts_on_the_new_campus/
- https://faq.schoolrp.net/roleplaying/time-system
- https://schoolrp.net/threads/how-does-time-work-in-srp.67417/
- https://palia.wiki.gg/wiki/Guide%3ATime_Passage_in_Palia
- https://ffxiv.gamerescape.com/wiki/Time
- https://wiki.guildwars2.com/wiki/Day_and_night
- https://dev.epicgames.com/documentation/en-us/unreal-engine/networking-overview-for-unreal-engine
- https://create.roblox.com/docs/ui/text-filtering

## 7. Final Working Rule

Build the prototype around what is already robust:

- 96-body living school
- same-student identity
- Echoes as non-authoritative theatre
- short-session respect
- sanctuaries and anti-griefing
- server-authoritative magic and rewards
- configurable time

Everything else must earn its place through play.
