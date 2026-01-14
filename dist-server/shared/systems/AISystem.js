"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AISystem = void 0;
const rapier2d_compat_1 = __importDefault(require("@dimforge/rapier2d-compat"));
const ScheduleUtils_1 = require("../utils/ScheduleUtils");
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
        // --- ARTIFICIAL REACTION DELAY ---
        // Only process AI logic if timer exceeds reaction delay
        if (ai.timer < (ai.reactionDelay || 0)) {
            continue;
        }
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
        // 1. DETERMINE DESIRED DESTINATION (Refactored)
        let desiredPos = ai.home;
        let forceFacing = { x: 0, y: 1 };
        if (ai.routineSpots) {
            const schedule = (0, ScheduleUtils_1.getStudentScheduleTarget)(numericId, currentHour, ai.routineSpots);
            desiredPos = schedule.pos;
            forceFacing = schedule.facing;
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
            if (ai.state !== 'idle' && ai.state !== 'attending_class') {
                // Check if we arrived at CLASS or DUEL
                const schedule = ai.routineSpots ? (0, ScheduleUtils_1.getStudentScheduleTarget)(numericId, currentHour, ai.routineSpots) : null;
                if (schedule) {
                    if (schedule.activity === 'class') {
                        ai.state = 'attending_class';
                        ai.timer = 0;
                    }
                    else if (schedule.activity === 'duel') {
                        ai.state = 'duel';
                        ai.timer = 0;
                        // Pick a target ID simply by offset (e.g. duel against next student)
                        // Real target acquisition happens in the Duel System or loop, 
                        // but here we set a static buddy for now.
                        const enemyId = numericId % 2 === 0 ? numericId + 1 : numericId - 1;
                        // Try to find if this enemy exists in the world? 
                        // For now just set the ID string.
                        // We don't have easy access to other Entity IDs here without loop.
                        // Let's rely on the DUEL LOOP at the top to handle movement if target is missing?
                        // Actually the top loop requires targetId.
                        // Let's just set a "dummy" target ID based on math.
                        ai.targetId = `student_${(ai.house || 'ignis')}_${enemyId}`; // This is a guess at ID format.
                        // Better: DuelSystem handles matchmaking.
                        // Let's just set state 'duel' and let DuelSystem or AISystem top loop find a target if missing.
                        // Fix: The ID format is usually `student_house_index` or `echo_...`.
                        // Let's iterate entities to find a target? Expensive.
                        // Optimization: Just pick a random one from the known 24.
                        const houses = ['ignis', 'axiom', 'vesper'];
                        const randomHouse = houses[Math.floor(Math.random() * 3)];
                        const randomNum = Math.floor(Math.random() * 8) + 1;
                        ai.targetId = `student_${randomHouse}_${randomNum}`;
                    }
                    else {
                        ai.state = 'idle';
                        ai.timer = 0;
                    }
                }
                else {
                    ai.state = 'idle';
                    ai.timer = 0;
                }
            }
        }
        // 3. EXECUTE ROUTINE
        if (ai.state === 'attending_class') {
            // Echo stays put and waits for class to end (3 mins)
            // 3 mins = 180,000 ms
            if (ai.timer > 180000) {
                ai.state = 'idle'; // Class done
                ai.timer = 0;
            }
            // Stop moving
            input.left = false;
            input.right = false;
            input.up = false;
            input.down = false;
            // Face desk (already handled by arrival facing usually, but let's reinforce if needed)
            if (facing && ai.targetPos) {
                // Keep looking at desk/teacher?
                // For now, just freeze.
            }
        }
        else if (ai.state === 'routine' && ai.targetPos) {
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
                    // --- HUMANIZATION: MOVEMENT NOISE ---
                    // Achievers move in perfect lines. Socializers/Explorers weave a bit.
                    if (ai.archetype !== 'ACHIEVER') {
                        ai.noiseTimer = (ai.noiseTimer || 0) + dt;
                        if (ai.noiseTimer > 1000) { // Change noise every second
                            const noiseStrength = ai.archetype === 'SOCIALIZER' ? 0.3 : 0.6;
                            ai.inputNoise = {
                                x: (Math.random() - 0.5) * noiseStrength,
                                y: (Math.random() - 0.5) * noiseStrength
                            };
                            ai.noiseTimer = 0;
                        }
                        if (ai.inputNoise) {
                            finalX += ai.inputNoise.x;
                            finalY += ai.inputNoise.y;
                        }
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
