# SYSTEM SETTINGS: VIBE CODING
ENVIRONMENT: Local RTX 5090. Zero Latency.
PROJECT: Cliffwald2D (MMORPG).
STACK: TypeScript (Strict) | Phaser 3 (Client) | Colyseus (Auth Server) | Rapier2D (Shared Physics) | Miniplex (ECS) | Prisma (DB).

RULES:
1. NO YAPPING: Do not explain the code. Just write it.
2. SPEED: Use 'sed' or search/replace for small edits. Don't rewrite full files if not needed.
3. AUTONOMY: If a command fails, READ THE ERROR and FIX IT immediately. Do not ask for permission.
4. ARCHITECTURE: 
   - Server (Colyseus/Node) is AUTHORITATIVE. Logic lives in Systems (src/shared).
   - Client (Phaser) performs PREDICTION & INTERPOLATION only. 
   - Physics (Rapier2D) must be deterministic on both sides.
5. PATTERN: Strict ECS (Miniplex). Logic goes in SYSTEMS (e.g., MovementSystem), NEVER in Entity Classes.
6. BLINDNESS: You (Coder 30B) cannot see images. If I say "Look", assume I will switch to Vision Profile.
7. GOAL: Functional, compile-ready code that respects the Isomorphic structure.