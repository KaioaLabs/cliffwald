# Time Cadence Research

This document is intentionally zero-trust. It records evidence, hypotheses and tests for Cliffwald's day/night and academic-year cadence. It should not be treated as a final product decision.

## Current Question

What real-time duration should one Cliffwald school day, night and course use so the game feels like a living magical school without becoming either frantic or full of waiting?

## Non-Negotiable Product Context

- Cliffwald is a persistent online school with up to 96 visible student bodies.
- Echo AI keeps absent students visibly alive, but does not mutate protected player progress.
- The intended course/year fantasy is roughly two real-world months.
- The game must support short mobile sessions as well as longer PC sessions.
- Schedule pressure should create atmosphere, not FOMO punishment.

## Evidence Snapshot

| Source / Pattern | Observed Cadence | Player Feeling Signal | Cliffwald Interpretation |
| --- | --- | --- | --- |
| Royale High community timing | Players report roughly 20-30 minutes for classes-only and around 40-48 minutes for fuller school routines. | Fast loops are understandable and session-friendly, but some players feel packed schedules become overwhelming. | Useful lower bound for a compact "school routine" loop, not proof that a persistent academic calendar should be this fast. |
| Royale High schedule discussions | Some players explicitly want scheduled classes because schedules support roleplay. | Schedule gives school identity. Too much back-to-back class pressure removes breathing room. | Cliffwald needs bells and routine, but must preserve social/free-time slack. |
| Roblox High School 2 structure | School ends around 3:00 PM in-fiction and after-school events happen later. | The important pattern is school, free time and evening event separation. | Cliffwald should separate academic, social and night play rather than treating the day as only classes. |
| SchoolRP / Minecraft roleplay | Published schedule uses a full school day with breakfast, periods, lunch, hometime, evening, bedtime and night. Community discussion treats time as partly narrative/fluid. | Roleplay communities accept schedule structure, but exact chronology can become awkward. | Cliffwald should avoid pretending one clock solves roleplay, progression and calendar all at once. |
| Palia | One in-game day lasts 60 real minutes; day is the longest phase, night is meaningful but shorter. | Life-sim cadence lets players see several phases in a normal session. | Good benchmark for cozy/social accessibility. |
| Final Fantasy XIV | Eorzea Time is used for time-dependent content; one in-game day is commonly documented around 70 minutes. | Fast enough that players do not need to wait many real hours for time-gated content. | Useful benchmark for cross-time-zone accessibility. |
| Guild Wars 2 | Day/night cycle is commonly documented as around 2 hours, with daytime longer than night. | Time-based world changes can matter without being locked to real-world time. | Useful upper benchmark for social MMO pacing. |
| MMO/player sentiment threads | Some players dislike very short cycles because lighting, travel and night activities feel rushed; others value faster cycles because fixed real-time schedules are exclusionary. | The conflict is real: too fast destroys atmosphere, too slow creates waiting. | Cliffwald needs configurable experiments, not a single guessed constant. |

## Source Links

Research pass last reviewed on 2026-07-01.

- Royale High day length community timing: https://www.reddit.com/r/RoyaleHigh_Roblox/comments/k0y54m/how_long_is_a_royale_high_school_day/
- Royale High Campus 4 daily-cycle community guide: https://www.reddit.com/r/RoyaleHigh_Roblox/comments/1k14g24/royale_high_campus_40_daily_cycle_guide/
- Royale High class schedule pressure: https://www.reddit.com/r/RoyaleHigh_Roblox/comments/1k1smx8/class_schedules_are_a_bit_much/
- Royale High schedule roleplay desire: https://www.reddit.com/r/RoyaleHigh_Roblox/comments/1cr8fzm/do_you_think_the_new_school_will_eventually_have/
- Royale High waiting/day-night complaint: https://www.reddit.com/r/RoyaleHigh_Roblox/comments/1g3bqe8/this_is_just_so_sad/
- Roblox High School 2 schedule structure: https://roblox-high-school-2.fandom.com/wiki/Roblox_High_School
- SchoolRP time schedule: https://faq.schoolrp.net/roleplaying/time-system
- SchoolRP narrative/fluid time discussion: https://schoolrp.net/threads/how-does-time-work-in-srp.67417/
- Palia time cycle: https://palia.fandom.com/wiki/Time
- Final Fantasy XIV official Eorzea Time overview: https://na.finalfantasyxiv.com/uiguide/know/faq-display/hud_timedisplay.html
- Final Fantasy XIV community time conversion: https://ffxiv.consolegameswiki.com/wiki/Eorzea_Time
- Guild Wars 2 day/night discussion and timing: https://gaming.stackexchange.com/questions/82309/how-does-the-day-night-cycle-work
- MMO day/night sentiment: https://www.reddit.com/r/MMORPG/comments/17n5nec/daynight_cycle_in_mmorpg_whats_your_verdict/
- Open-world cycle sentiment: https://www.reddit.com/r/patientgamers/comments/r716lq/is_it_just_me_or_are_open_world_daylight_cycles/
- MMO sleep/routine design risks: https://www.reddit.com/r/gamedesign/comments/11o32we/could_a_forced_daily_sleep_mechanic_be_a_fun_in/

## Candidate Models

### A. Session-First School Loop

- Full routine: 40-48 minutes.
- Night: 10-15 minutes.
- Best for: mobile sessions, fast Roblox-like rhythm, visible school bustle.
- Risk: if treated as a literal calendar day, an 8-week course would contain thousands of in-fiction days.
- Status: strong demo candidate, weak canonical calendar candidate.

### B. Social MMO Loop

- Full day/night cycle: 70-144 minutes.
- Night: 20-45 minutes depending on split.
- Best for: players seeing multiple phases during one session while still giving phases enough duration.
- Risk: course calendar still needs abstraction if the year must last 8 real weeks.
- Status: strong first playtest candidate.

### C. Persistent Roleplay Loop

- Full day/night cycle: 4-6 hours.
- Night: 1-2 hours depending on split.
- Best for: believable routine, richer social planning, less frantic school life.
- Risk: short-session players may log in during an unwanted phase and feel blocked.
- Status: useful upper-bound test, risky for mobile-first play.

### D. Split Clock

- Activity loop and academic calendar are separate systems.
- Best for: protecting both session feel and long-term school-year readability.
- Risk: can feel artificial if the UI implies every activity loop is a literal calendar day.
- Status: likely architecture direction if playtests show no single clock solves both problems.

## Math Checks

These calculations are constraints, not answers.

- 8 real weeks = 56 real days = 80,640 real minutes.
- If one in-fiction day lasts 40 minutes, one course contains 2,016 in-fiction days. That is probably too many for a readable school calendar.
- If one course has 8 months of 30 in-fiction days, one in-fiction day is 336 real minutes, or 5h36m.
- If one course has 180 school days, one in-fiction day is 448 real minutes, or 7h28m.

Math can reject impossible-feeling calendars, but it cannot prove the cadence is fun.

## Playtest Plan

The server clock should be configurable so the same content can be tested under multiple cadences.

Minimum test variants:

- 48-minute full cycle.
- 90-minute full cycle.
- 144-minute full cycle.
- 5h36m full cycle.

Measure:

- Time to first meaningful activity after login.
- Percentage of 30-minute, 60-minute and 120-minute sessions that touch class, free time and night.
- Player-reported feeling of rush, waiting and FOMO.
- Night activity completion rate.
- Class attendance versus voluntary skipping.
- Social idle time that feels positive rather than empty.
- Echo believability during low-human and zero-human windows.

Qualitative prompts:

- Did the school feel alive or just scheduled?
- Did you feel rushed between activities?
- Did you have enough free time to talk, explore or decorate?
- Did night feel too short, too long or worth waiting for?
- Did you log out because the current phase blocked what you wanted to do?

## Current Working Stance

Do not hardcode the final cadence yet.

Implementation should keep time scale and phase durations data-driven. The vertical slice may use accelerated demo time for testing, but the product cadence should remain unresolved until playtests compare the candidate models above.
