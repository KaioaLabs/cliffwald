# Zero Trust Policy

Cliffwald treats the dedicated server and durable backend as the only authority for protected player state.

## Hard Rules

- Clients are input and presentation only.
- Echo AI is visual/runtime theatre only.
- Echo AI must never persist player stats, gold, XP, academic points, prestige, alignment, sanctions, inventory, cards, equipment or irreversible choices.
- Server-side code must guard protected mutation paths by control mode and player authority.
- Login, account identity, session handoff and cross-play should use supported platform/EOS paths before any custom auth layer is introduced.
- Admin and director actions require explicit server-side authorization and audit logging.

## Current UE Evidence

- `Cliffwald.Echo.Policy` UE Automation verifies protected Echo mutation denial and returning-player `HumanOnline` restoration.
- `Test-VerticalSliceGuardrails.ps1` verifies the 96-roster cap, guarded slot possession and mobile profile presence.
- Dedicated and autonomous smokes fail on fatal/error/ensure output and Iris startup warnings.

## Persistence Boundary

Allowed Echo runtime state:

- visual presentation
- runtime location
- schedule phase
- social bark/activity state
- theatrical magic presentation

Protected state:

- inventory, equipment, cards and trade
- economy, gold and spending
- stats, XP, grades, academic points and prestige
- sanctions, alignment and irreversible narrative choices

Protected state can change only through server-authorized human actions or explicitly whitelisted positive offline systems documented in the GDD and technical decisions.
