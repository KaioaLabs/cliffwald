"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AISystem = void 0;
const Config_1 = require("../Config");
const rapier2d_compat_1 = __importDefault(require("@dimforge/rapier2d-compat"));
// Shared reuseable objects to reduce GC
const SHARED_SEARCH_SHAPE = new rapier2d_compat_1.default.Ball(24);
let frameCount = 0;
const AISystem = (world, physicsWorld, dt, currentHour, pathfinder, castCallback, targetProvider) => {
    const entities = world.with("ai", "body", "input");
    frameCount++;
    for (const entity of entities) {
        const { ai, body, input, id, facing } = entity;
        if (!ai)
            continue;
        ai.timer += dt;
        const currentPos = body.translation();
        const numericId = typeof entity.id === 'number' ? entity.id : (parseInt(entity.id || "0") || 0);
        // 0. DUEL STATE
        if (ai.state === 'duel' && ai.targetId && castCallback && targetProvider) {
            const targetPos = targetProvider(ai.targetId);
            if (targetPos) {
                const dx = targetPos.x - currentPos.x;
                const dy = targetPos.y - currentPos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const nx = dist > 0 ? dx / dist : 0;
                const ny = dist > 0 ? dy / dist : 0;
                // Movement: Maintain ~250px distance
                let moveX = 0, moveY = 0;
                if (dist > 300) {
                    moveX = nx;
                    moveY = ny;
                }
                else if (dist < 150) {
                    moveX = -nx;
                    moveY = -ny;
                }
                else {
                    // Random Strafe based on ID and time
                    const strafe = Math.sin(Date.now() / 1000 + (numericId)) > 0 ? 1 : -1;
                    moveX = -ny * strafe * 0.5;
                    moveY = nx * strafe * 0.5;
                }
                input.analogDir = { x: moveX, y: moveY };
                if (facing) {
                    facing.x = nx;
                    facing.y = ny;
                }
                // Casting
                if (ai.timer > 2500) { // Every 2.5s
                    const spells = ['circle', 'square', 'triangle'];
                    const spell = spells[Math.floor(Math.random() * spells.length)];
                    castCallback(entity.player?.sessionId || "", spell, nx * 400, ny * 400);
                    ai.timer = 0;
                }
            }
            else {
                ai.state = 'idle';
                ai.timer = 0;
            }
            continue; // Skip routine logic
        }
        // 1. DETERMINE DESIRED DESTINATION (Routine logic remains same)
        let desiredPos = ai.home;
        let forceFacing = { x: 0, y: 1 };
        if (ai.routineSpots) {
            const isEating = (currentHour >= 7 && currentHour < 8) || (currentHour >= 19 && currentHour < 21);
            const isClass = (currentHour >= 8 && currentHour < 10) || (currentHour >= 17 && currentHour < 19);
            const isSleeping = (currentHour >= 21 || currentHour < 7);
            if (isEating) {
                desiredPos = ai.routineSpots.eat;
                forceFacing = { x: 0, y: -1 };
            }
            else if (isClass) {
                desiredPos = ai.routineSpots.class;
                forceFacing = { x: 0, y: -1 };
            }
            else if (isSleeping) {
                desiredPos = ai.routineSpots.sleep;
                forceFacing = { x: 0, y: 1 };
            }
            else {
                // Deterministic Dispersion: Golden Angle spread
                const getSpread = (center, radius) => {
                    const angle = numericId * 2.399; // Golden Angle in radians (~137.5 deg)
                    const r = Math.sqrt(numericId + 1) * (radius / 5); // Spread outwards
                    // Clamp to max radius
                    const finalR = Math.min(r, radius);
                    return { x: center.x + Math.cos(angle) * finalR, y: center.y + Math.sin(angle) * finalR };
                };
                if (currentHour >= 10 && currentHour < 12)
                    desiredPos = getSpread(Config_1.CONFIG.SCHOOL_LOCATIONS.TRAINING_GROUNDS, 200);
                else if (currentHour >= 12 && currentHour < 14)
                    desiredPos = getSpread(Config_1.CONFIG.SCHOOL_LOCATIONS.COURTYARD, 150);
                else if (currentHour >= 14 && currentHour < 17)
                    desiredPos = getSpread(Config_1.CONFIG.SCHOOL_LOCATIONS.FOREST, 400);
                else
                    desiredPos = ai.routineSpots.sleep;
            }
        }
        // 2. STATE MACHINE & STAGGERED START
        const distToTarget = Math.sqrt(Math.pow(desiredPos.x - currentPos.x, 2) + Math.pow(desiredPos.y - currentPos.y, 2));
        if (distToTarget > 20) {
            // Check if we need to change target
            const targetChanged = !ai.targetPos || Math.abs(ai.targetPos.x - desiredPos.x) > 5 || Math.abs(ai.targetPos.y - desiredPos.y) > 5;
            if (targetChanged) {
                // STAGGERED START: Students wait a bit based on ID before moving to a new task
                const startDelay = (numericId % 8) * 500; // Up to 4 seconds delay (in ms)
                // Only reset if we haven't already started waiting
                if (ai.state !== 'idle' || ai.targetPos !== desiredPos) {
                    ai.state = 'idle';
                    ai.timer = 0;
                    ai.targetPos = desiredPos; // Tentative target
                }
                if (ai.state === 'idle' && ai.timer > startDelay) {
                    ai.state = 'routine';
                    ai.path = undefined;
                    ai.timer = 0; // Reset timer for stuck detection
                }
            }
        }
        else {
            // Arrived
            if (ai.state !== 'idle') {
                ai.state = 'idle';
                ai.timer = 0;
            }
        }
        // 3. EXECUTE ROUTINE
        if (ai.state === 'routine' && ai.targetPos) {
            if (!ai.path && pathfinder) {
                ai.path = pathfinder.findPath(currentPos, ai.targetPos) || undefined;
            }
            if (ai.path && ai.path.length > 0) {
                const nextWaypoint = ai.path[0];
                const dx = nextWaypoint.x - currentPos.x;
                const dy = nextWaypoint.y - currentPos.y;
                const distToNext = Math.sqrt(dx * dx + dy * dy);
                if (distToNext < 12) {
                    ai.path.shift();
                }
                else {
                    // --- OPTIMIZED STEERING BEHAVIOR (Spatial Query) ---
                    // 1. Seek Force (Target Direction)
                    const seekX = dx / distToNext;
                    const seekY = dy / distToNext;
                    let finalX = seekX;
                    let finalY = seekY;
                    // 2. Separation Force (Avoid crowded areas)
                    // THROTTLE: Only run every 3rd frame to save CPU
                    if (frameCount % 3 === (numericId % 3)) {
                        let sepX = 0;
                        let sepY = 0;
                        const separationRadius = 24;
                        physicsWorld.intersectionsWithShape(currentPos, 0, SHARED_SEARCH_SHAPE, (otherCollider) => {
                            const otherBody = otherCollider.parent();
                            if (!otherBody || otherBody === body)
                                return true; // continue
                            const oPos = otherBody.translation();
                            const vx = currentPos.x - oPos.x;
                            const vy = currentPos.y - oPos.y;
                            const distSq = vx * vx + vy * vy;
                            if (distSq < (separationRadius * separationRadius) && distSq > 0.001) {
                                const dist = Math.sqrt(distSq);
                                const strength = (separationRadius - dist) / separationRadius;
                                sepX += (vx / dist) * strength * 2.5;
                                sepY += (vy / dist) * strength * 2.5;
                            }
                            return true; // continue
                        });
                        finalX += sepX;
                        finalY += sepY;
                    }
                    // Normalize result
                    const finalLen = Math.sqrt(finalX * finalX + finalY * finalY);
                    if (finalLen > 0.001) {
                        finalX /= finalLen;
                        finalY /= finalLen;
                    }
                    // 4. Output to InputComponent (Analog)
                    input.analogDir = { x: finalX, y: finalY };
                    // Legacy Fallback
                    input.left = finalX < -0.3;
                    input.right = finalX > 0.3;
                    input.up = finalY < -0.3;
                    input.down = finalY > 0.3;
                    // STUCK DETECTION
                    const vel = body.linvel();
                    const currentSpeedSq = vel.x * vel.x + vel.y * vel.y;
                    // Speed < 5 (sq < 25)
                    if (currentSpeedSq < 25 && ai.timer > 2000) { // 2 seconds
                        ai.path = undefined;
                        ai.timer = 0;
                    }
                }
            }
            else {
                ai.state = 'idle';
                ai.timer = 0;
            }
        }
        else if (ai.state === 'idle') {
            input.left = false;
            input.right = false;
            input.up = false;
            input.down = false;
            if (facing) {
                facing.x = forceFacing.x;
                facing.y = forceFacing.y;
            }
        }
    }
};
exports.AISystem = AISystem;
