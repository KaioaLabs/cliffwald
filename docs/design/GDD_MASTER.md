# Cliffwald Online - Game Design Document

**Version:** 5.0
**Status:** Product design source of truth
**Last updated:** 2026-06-29

## 1. High Concept

Cliffwald Online is a persistent magical-school simulation where up to 96 student bodies exist as a living school population. Each student can be controlled by a human when online or by an AI Echo when offline, so the school stays socially alive without letting AI alter the real player's persistent progress or property.

Cliffwald is not a generic MMORPG with a school skin. It is a social school-life simulation with MMO-scale presence: classes, houses, routines, friendships, rivalries, secrets, rules, curfew, duels, exploration and consequences.

## 2. Design Pillars

1. **The school is always alive.** Every student body keeps existing in the world. Login changes control, not existence.
2. **Humans own progress.** AI Echoes provide presence and theatre, but never spend, lose, trade, degrade or persist real player state.
3. **Time creates drama.** The school day, curfew and calendar structure social pressure without turning play into mandatory chores.
4. **Social systems matter.** Houses, reputation, rumors, duels and relationships are core progression, not decoration.
5. **Magic is expressive.** Spells should support combat, exploration, mischief, utility and social play.
6. **Rules create stories.** Prefects, sanctuaries, forbidden zones and school authority create risk, not arbitrary punishment.
7. **Small world, high density.** Cliffwald should feel compact, readable and socially dense rather than huge and empty.

## 3. Non-Negotiable Product Rules

- One school instance represents a finite roster of persistent student bodies.
- A player never disappears from the school fiction purely because they logged out.
- Offline AI is a live skin, not a second player with account authority.
- Negative persistent consequences require human agency online.
- Player-owned inventory, currency, stats, grades, cards and equipment cannot be changed by offline AI.
- The GDD is engine-agnostic. Technical stack choices live in `docs/technical/TECHNICAL_DECISIONS.md`.

## 4. Target Experience

The player should feel like a student inside a strange, compact magical academy where their character has a public life even when they are not online. They log in to reclaim a body that has remained socially present, then choose whether to study, duel, sneak out, investigate secrets, trade, socialize or help their house.

The fantasy is not "grind monsters forever." The fantasy is "my school exists, my house remembers me, and the day keeps moving."

## 5. Population And Possession

### 5.1 Student Roster

The target school roster is **96 persistent student bodies**. This is the product cap for one school instance: connected humans plus offline Echoes together fill the same finite roster. The roster uses 96 as a deliberate school-scale cap: large enough to feel socially dense, small enough to keep routines, moderation, mobile performance and server authority tractable.

| Concept | Definition |
| --- | --- |
| Student body | The persistent in-world character slot. |
| Human control | A connected player actively controlling their student. |
| Echo control | AI control of that student while the human is offline. |
| Student identity | Name, house, appearance, public personality and social memory. |

### 5.2 Control Transfer

- **Login:** The human possesses their assigned student body.
- **Logout:** The body remains in the world as an Echo.
- **Reconnect:** The human reclaims the same student body.
- **Visible continuity:** Name, house and appearance remain visible across control changes.
- **Full roster:** player #97 cannot create a hidden extra body inside the same school instance; they must wait, join another instance, or use a future spectator/onboarding flow.

### 5.2.1 Echo Population Guarantee

The school should appear full even when fewer than 96 humans are connected.

- Online humans control their bodies directly.
- Disconnected humans are represented by Echo AI.
- Empty reserved roster slots can be represented by seeded Echo students until assigned to real accounts.
- Echo AI is expected to support the full remaining roster, up to 96 visible presences in one school instance.
- If zero humans are connected, all 96 bodies remain present as autonomous Echoes and the school day continues.
- The simulation may reduce animation, decision frequency, dialogue frequency or network update rate for distant Echoes, but the fiction should remain that the school population exists.

### 5.3 Echo Safety Contract

The Echo offline is a **live skin** of the player: it maintains public presence, routine and social texture, but it has zero authority over the player's persistent record.

Allowed Echo activity:

- Move through the school.
- Follow schedules.
- Attend class visually.
- Eat, sleep and socialize.
- Speak with contextual barks.
- React to events.
- Stand in duel/training zones.
- Use theatrical or visual magic when design calls for it.
- Preserve the illusion that the student still belongs to the school.

Forbidden Echo authority:

- No persistent stat changes.
- No gold spending or loss.
- No XP, grade, academic point or prestige mutation.
- No alignment, sanction or detention persistence.
- No inventory, card, equipment, trade, buy, sell or consume mutation.
- No build changes.
- No irreversible narrative decisions.

Short rule: **AI controls presence, not property. AI controls theatre, not progress.**

## 6. Time And Schedule

### 6.1 School Day

The school follows a compressed day/night rhythm. Exact timings can change through tuning, but the structure is stable:

| Phase | Activity | Main Function |
| --- | --- | --- |
| Morning | Breakfast | Social gathering, buffs, school atmosphere. |
| Class block | Lessons | Academic minigames, subject progression, house prestige. |
| Midday | Lunch | Social play, rumors, informal planning. |
| Afternoon | Free time | Exploration, duels, secrets, trading, errands. |
| Evening | Dinner | Social regrouping before riskier night play. |
| Night | Curfew | Stealth, forbidden routes, PvPvE pressure. |

### 6.2 Respect For Player Time

Classes and schedules should create immersion, not FOMO punishment. Players should gain benefits from attending live events, but the design must avoid locking core progression behind narrow real-time windows.

Offline Echo presence can preserve social continuity, but real progression should be earned through human play or explicitly approved positive offline systems.

## 7. Houses And Social Structure

The school has three core houses:

| House | Identity | School Space | Social Flavor |
| --- | --- | --- | --- |
| Ignis | Courage, fire, glory | High ground / tower | Bold, duel-prone, heroic. |
| Axiom | Logic, ice, discipline | Study wing | Analytical, strategic, academic. |
| Vesper | Ambition, shadow, secrets | Lower/dungeon wing | Cunning, secretive, opportunistic. |

House systems should support:

- House points and prestige.
- Friendly rivalry.
- Shared goals.
- House chat or local identity.
- House-specific spaces, rumors and traditions.
- Social pressure without enabling griefing.

## 8. Core Loops

### 8.1 Daily Loop

1. Wake or log in.
2. Check time, schedule, house state and active rumors/events.
3. Attend class, socialize or pursue side goals.
4. Use free time for duels, exploration, trading, secrets or preparation.
5. Decide whether to obey curfew or risk night play.
6. Earn social, academic or exploratory rewards.

### 8.2 Session Loop

1. Reclaim your student body.
2. See what your house/school has been doing.
3. Pick a meaningful short-term goal.
4. Interact with students, systems and spaces.
5. Leave the body as an Echo when done.

### 8.3 Season Loop

Season-scale progression should include:

- Academic milestones.
- House standings.
- Secret discoveries.
- Social arcs and rivalries.
- School-wide events.
- A climactic event where collective actions matter.

## 9. Academic System

The academic system should be lightweight, readable and varied.

Core expectations:

- Classes have subjects, professors and minigames.
- Academic rewards should feel meaningful but not mandatory in every time window.
- Subjects can unlock spells, lore, areas, cosmetics or social privileges.
- Echoes can attend visually but do not mutate real player grades or stats.

Initial subject examples:

| Subject | Activity Fantasy | Possible Reward |
| --- | --- | --- |
| Charms | Timing, gesture, precision | Utility spell progress. |
| Potions | Ingredient control, rhythm | Consumable knowledge. |
| History | Memory, lore, pattern recall | Secrets, cards, rumors. |

## 10. Magic And Combat

Magic should be expressive first and competitive second.

### 10.1 Spell Roles

- **Duel spells:** Shield, projectile, area, missile, counterplay.
- **Utility spells:** Open, reveal, repair, illuminate, distract.
- **Exploration spells:** Secret detection, traversal, puzzle interactions.
- **Social/mischief spells:** Harmless expression, theatrics, pranks with guardrails.

### 10.2 PvP Rules

| Zone Type | Example | PvP Rule |
| --- | --- | --- |
| Sanctuary | Dorms, infirmary | Damage disabled. |
| Conditional | Halls, courtyard | PvP enabled only under time/event rules. |
| Wild/Forbidden | Woods, secret passages | PvP enabled, higher risk. |

Combat must include anti-griefing safeguards. A school simulation dies quickly if new or casual players become targets with no recourse.

## 11. Discipline And Authority

Prefects and school staff create rules pressure.

Design goals:

- Curfew should create tension, not resentment.
- Detection should be readable and avoid invisible punishment.
- Punishment should be recoverable and proportionate.
- Offline Echoes should not receive persistent punishments.
- Human players who choose risk should understand the consequences.

Initial punishment scale:

| Level | Cause | Example Consequence |
| --- | --- | --- |
| I | Curfew violation | Short detention/task. |
| II | Curfew plus magic | Longer detention/task. |
| III | Harmful action/KO | Serious but recoverable consequence. |

## 12. World Design

Cliffwald should be compact and socially dense.

Core spaces:

- Great Hall / dining hall.
- Classrooms.
- Library.
- Courtyard.
- House common rooms.
- Dormitories or implied dormitory access.
- Infirmary.
- Detention room.
- Secret passages.
- Forbidden woods or exterior danger zone.
- Merchant/traveling vendor space.

World rules:

- Important routes should create encounters.
- Secret routes should carry tradeoffs.
- Safe spaces must exist.
- The school layout should support schedules and social clustering.

## 13. Economy, Items And Collections

Economy should be light and school-flavored, not a grind treadmill.

Supported item categories:

- Robes, boots and accessories.
- Consumables and ingredients.
- Collectible cards.
- Class/event rewards.
- Cosmetic or social items.

AI Echoes do not buy, sell, trade, consume or lose real player items.

## 14. NPCs And Roles

Role categories:

- Students / Echoes.
- Professors.
- Prefects.
- Headmaster.
- Caretaker.
- Healer/matron.
- Traveling merchant.
- Special event characters.

NPCs should support school atmosphere, schedule believability, guidance, rumors and events.

## 15. Director Tools

Cliffwald needs tools for running a living school.

Expected capabilities:

- Trigger events.
- Adjust schedule/calendar.
- Broadcast school announcements.
- Seed rumors or mysteries.
- Inspect house standings.
- Control or spawn staff/NPC events.
- Moderate toxic behavior.
- Review suspicious actions.

Director tools are a product pillar, not just admin cheats.

## 16. Safety, Moderation And Anti-Griefing

Social safety is core design.

Required systems:

- Report/block/mute tools.
- Admin/moderation visibility.
- Anti-cheat on rewards, items, movement and spells.
- PvP boundaries and sanctuaries.
- Protection against trade/item scams.
- Clear distinction between playful rivalry and harassment.

## 17. Content Data Seeds

### 17.1 Houses

| House | Color Direction | Flavor Bark |
| --- | --- | --- |
| Ignis | Warm/red/fire | "For glory!" |
| Axiom | Cool/blue/ice | "Logic dictates victory." |
| Vesper | Shadow/gold/violet | "Ambition is not a sin." |

### 17.2 Staff

| Name | Role | Primary Function |
| --- | --- | --- |
| Headmaster Aris | Headmaster | Announcements, ceremonies, authority. |
| Professor Hecate | Professor | Classes and guidance. |
| Professor Merlin | Professor | Lore, library, secrets. |
| Matron Pomfrey | Healer | Recovery and sanctuary. |
| Prefects | Discipline | Curfew and rule pressure. |
| Caretaker Filch | Patrol | Night pressure and alerts. |

### 17.3 Example Items

| ID | Name | Type | Rarity |
| --- | --- | --- | --- |
| robe_plain | Plain Work Robe | Robe | Common |
| robe_silk | Silk Robe | Robe | Rare |
| robe_velvet | Velvet Robe | Robe | Legendary |
| boots_leather | Leather Boots | Boots | Common |
| boots_dragon | Dragon Skin Boots | Boots | Legendary |
| acc_spectacles | Spectacles | Accessory | Rare |

### 17.4 Example Collectibles

| ID | Name | Rarity |
| --- | --- | --- |
| card_4 | Merlin | Legendary |
| card_5 | Morgan le Fay | Legendary |
| card_1 | Abe no Seimei | Legendary |
| card_6 | Nicholas Flamel | Rare |
| card_2 | Baba Yaga | Rare |
| card_13 | Cassandra | Common |

## 18. Acceptance Criteria

Cliffwald reaches its intended MVP fantasy when:

- A school instance maintains 96 visible student bodies.
- Human players can connect, disconnect and reconnect without breaking identity continuity.
- Offline Echoes keep presence while protecting persistent player records.
- With zero connected humans, the clock, classes, meals, curfew and Echo routines continue autonomously.
- A normal day visibly moves students through breakfast, class, lunch, free time, dinner and curfew.
- Players can attend class, socialize, duel, explore and interact with house systems.
- Rules, sanctuaries and discipline are readable.
- The world feels populated during low human concurrency.
- Server authority protects stats, items and rewards.

## 19. Open Design Decisions

- Exact human concurrency target at MVP versus later scale.
- How much positive offline progression, if any, is allowed.
- Whether Echo theatrical magic can affect other connected players visually only or mechanically.
- How seasons/end-of-year events resolve house competition.
- How to balance curfew risk for casual players.
- Final engine/platform choice.

Technical decisions for these items belong in `docs/technical/TECHNICAL_DECISIONS.md` once made.
