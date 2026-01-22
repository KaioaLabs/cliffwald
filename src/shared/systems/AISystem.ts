import { ECSWorld } from "../ecs/world";
import { CONFIG } from "../Config";
import { Pathfinding } from "./Pathfinding";
import RAPIER from "@dimforge/rapier2d-compat";
import { MathUtils } from "../utils/MathUtils";
import { RoutineState } from "../../server/ai/states/RoutineState";
import { DuelState } from "../../server/ai/states/DuelState";
import { IdleState } from "../../server/ai/states/IdleState";
import { getRandomBark, BarkContext } from "../data/BarkRegistry";
import { getStudentScheduleTarget } from "../utils/ScheduleUtils";

// Shared reuseable objects
const SHARED_SEARCH_SHAPE = new RAPIER.Ball(24);
let frameCount = 0;

export const AISystem = (
    world: ECSWorld, 
    physicsWorld: RAPIER.World, 
    dt: number, 
    currentHour: number, 
    pathfinder?: Pathfinding,
    castCallback?: (id: string, spellId: string, vx: number, vy: number) => void,
    targetProvider?: (id: string) => { x: number, y: number } | null,
    floorProvider?: (id: string) => number, // New provider
    chatCallback?: (id: string, text: string) => void,
    jumpCallback?: (id: string) => void,
    catchCallback?: (prefectId: string, victimId: string) => void,
    setSleepingState?: (id: string, isSleeping: boolean) => void
) => {
    const entities = world.with("ai", "body", "input");
    frameCount++;
    
    // Prefect Vision Shape
    const PREFECT_VISION = new RAPIER.Ball(CONFIG.PREFECT_VISION_RADIUS || 150);

    for (const entity of entities) {
        const { ai, body, input, id } = entity;
        if (!ai) continue; 
        
        // Get Floor
        const floor = floorProvider ? floorProvider(entity.player?.sessionId || "") : 0;

        // Update Timer
        ai.timer += dt;

        // THROTTLE: Interleave AI logic (10Hz) for CPU savings
        const safeId = String(id || "0");
        const numericId = typeof id === 'number' ? id : (parseInt(safeId.replace(/\D/g, "") || "0") || 0);

        // --- BARK SYSTEM (Chat Bubbles) ---
        if (chatCallback) {
            if (ai.barkTimer === undefined) ai.barkTimer = Math.random() * 60000 + 30000; // Init: 30-90s
            
            ai.barkTimer -= dt;
            if (ai.barkTimer <= 0) {
                // Determine Context from Schedule
                const schedule = getStudentScheduleTarget(currentHour);
                let context: BarkContext = 'GENERAL';
                
                if (schedule.activity === 'class') context = 'CLASS';
                else if (schedule.activity === 'eat') context = 'EAT';
                else if (schedule.activity === 'sleep') context = 'SLEEP';
                else if (ai.state === 'duel') context = 'DUEL';
                else if (ai.state === 'idle') context = 'IDLE';

                const phrase = getRandomBark(context, ai.house);
                chatCallback(safeId, phrase);
                
                // Reset Timer (45s - 120s) - Less spammy
                ai.barkTimer = Math.random() * 75000 + 45000;
            }
        }

        if ((frameCount + numericId) % 3 !== 0) continue;

        // --- PREFECT LOGIC (Special Case) ---
        const isPrefect = numericId >= 1000;
        
        if (isPrefect) {
            handlePrefectAI(entity, physicsWorld, currentHour, frameCount, PREFECT_VISION, catchCallback);
            continue;
        }

        // --- STUDENT LOGIC ---
        
        // Artificial Reaction Delay (Staggered updates)
        if (ai.timer < (ai.reactionDelay || 0)) {
            // Tiny chance to wake up early if delay is huge? No, keep it deterministic-ish.
            continue;
        }

        // Dispatch to State Handlers
        switch (ai.state) {
            case 'idle':
                IdleState.update(entity, dt, currentHour, castCallback, chatCallback);
                break;
            case 'routine':
                RoutineState.update(entity, dt, currentHour, pathfinder, physicsWorld, frameCount, floor, setSleepingState);
                break;
            case 'duel':
                DuelState.update(entity, dt, castCallback!, targetProvider!);
                break;
            case 'attending_class':
                // Players in class are focused on their minigame screen.
                // Avatar stays perfectly still, facing North (Teacher).
                input.analogDir = { x: 0, y: 0 }; 
                if (entity.facing) { entity.facing.x = 0; entity.facing.y = -1; }
                
                if (ai.timer > CONFIG.CLASS_DURATION_MS) {
                    ai.state = 'idle';
                    ai.timer = 0;
                }
                break;
            default:
                ai.state = 'idle';
                break;
        }

        // --- GLOBAL FLAVOR ---
        // Jump occasionally while moving (Humans do this for fun)
        if ((input.analogDir?.x !== 0 || input.analogDir?.y !== 0) && Math.random() < 0.005) {
             const vel = body.linvel();
             body.applyImpulse({ x: vel.x * 0.5, y: vel.y * 0.5 }, true);
             if (jumpCallback) jumpCallback(entity.player?.sessionId || "");
        }
    }
};

function handlePrefectAI(
    entity: any, 
    physicsWorld: RAPIER.World, 
    currentHour: number, 
    frameCount: number, 
    visionShape: RAPIER.Ball,
    catchCallback?: (p: string, v: string) => void
) {
    const isNight = currentHour >= 22 || currentHour < 5;
    const { body, input, ai, facing } = entity;

    if (isNight) {
        // Guard Rotation Logic: Rotate 90 degrees every 3 seconds
        if (frameCount % 180 === 0) {
            const angles = [0, Math.PI/2, Math.PI, Math.PI*1.5];
            const nextAngle = angles[Math.floor(Math.random() * angles.length)];
            facing.x = Math.cos(nextAngle);
            facing.y = Math.sin(nextAngle);
        }

        // Scan every 5 frames (faster reaction for cones)
        if (frameCount % 5 === 0 && catchCallback) {
            const currentPos = body.translation();
            const visionRadius = CONFIG.PREFECT_VISION_RADIUS || 150;
            const visionConeAngle = 0.707; // ~45 degrees from center (total 90 deg field of view). cos(45deg) = 0.707

            physicsWorld.intersectionsWithShape(currentPos, 0, visionShape, (collider) => {
                const victimBody = collider.parent();
                if (!victimBody) return true;
                
                const victimId = (victimBody.userData as any)?.sessionId;
                if (victimId && !victimId.startsWith('prefect_') && !victimId.startsWith('teacher_')) {
                    const victimPos = victimBody.translation();
                    
                    // 1. Calculate Vector to Victim
                    const toVictim = { x: victimPos.x - currentPos.x, y: victimPos.y - currentPos.y };
                    const distSq = toVictim.x * toVictim.x + toVictim.y * toVictim.y;
                    
                    if (distSq > visionRadius * visionRadius) return true;

                    // 2. Dot Product for Cone Check
                    const dist = Math.sqrt(distSq);
                    const dot = (toVictim.x / dist) * facing.x + (toVictim.y / dist) * facing.y;

                    if (dot > visionConeAngle) {
                        // 3. Optional: Raycast for walls (Obstruction)
                        // For now, automatic catch if in cone
                        catchCallback(entity.player?.sessionId || "", victimId);
                        return false; 
                    }
                }
                return true;
            });
        }
        input.analogDir = { x: 0, y: 0 }; // Stand guard
    } else {
        ai.state = 'idle';
    }
}
