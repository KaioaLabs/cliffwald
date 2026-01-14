import { Room, Client } from "colyseus";
import { GameState, Player, ChatMessage, Projectile, InventoryItem } from "../shared/SchemaDef";
import { CONFIG, getGameHour, getAcademicProgress, getGameTime } from "../shared/Config";
import { PlayerInput, JoinOptions } from "../shared/types/NetworkTypes";
import RAPIER from "@dimforge/rapier2d-compat";
import { buildPhysics, MapData, parseEntities, parseLogic } from "../shared/MapParser";
import { createWorld, ECSWorld } from "../shared/ecs/world";
import { MovementSystem } from "../shared/systems/MovementSystem";
import { AISystem } from "../shared/systems/AISystem";
import { Pathfinding } from "../shared/systems/Pathfinding";
import { SpellSystem } from "./systems/SpellSystem";
import { PrestigeSystem } from "./systems/PrestigeSystem";
import { SPELL_REGISTRY } from "../shared/items/SpellRegistry";
import { Entity } from "../shared/ecs/components";
import { AuthService } from "./services/AuthService";
import { SpawnManager } from "./managers/SpawnManager";
import { LevelRegistry } from "./managers/LevelRegistry";
import { PlayerService } from "./services/PlayerService";
import * as fs from "fs/promises";
import path from "path";

import { DuelSystem } from "./systems/DuelSystem";
import { ItemSystem } from "./systems/ItemSystem";
import { ShopSystem } from "./systems/ShopSystem";
import { ChatManager } from "./managers/ChatManager";
import { PersistenceSystem } from "./systems/PersistenceSystem";
import { timeManager } from "../shared/managers/TimeManager";
import { HealthSystem } from "./systems/HealthSystem";

export class WorldRoom extends Room<GameState> {
    physicsWorld!: RAPIER.World;
    eventQueue!: RAPIER.EventQueue;
    world!: ECSWorld;
    spawnManager!: SpawnManager;
    pathfinder?: Pathfinding;
    spellSystem!: SpellSystem;
    prestigeSystem!: PrestigeSystem;
    duelSystem!: DuelSystem;
    itemSystem!: ItemSystem;
    shopSystem!: ShopSystem;
    chatManager!: ChatManager;
    persistenceSystem!: PersistenceSystem;
    healthSystem!: HealthSystem;
    entities = new Map<string, Entity>();
    playerDbIds = new Map<string, number>();
    
    // Hidden Server-Side State
    alignmentMap = new Map<string, number>(); // <sessionId, alignmentScore> (-100 to +100)
    attendanceLog = new Set<string>(); // Tracks awarded attendance: "Day_WindowIndex_SessionId"
    attendanceTimer = 0;
    minigameStartTimes = new Map<string, number>(); // <sessionId, startTime>

    spawnPos = { x: 300, y: 300 };
    
    // Security: Cooldown Tracking
    lastCastTimes = new Map<string, number>();

    async onAuth(client: Client, options: JoinOptions, request: any) {
        if (!options.token) return false;
        const userData = AuthService.verifyToken(options.token);
        if (!userData) return false;
        return userData;
    }

    async onCreate(options: JoinOptions) {
        this.setMetadata({ name: "Cliffwald World" });
        this.setState(new GameState());
        
        // Initialize Points
        this.state.ignisPoints = 0;
        this.state.axiomPoints = 0;
        this.state.vesperPoints = 0;
        
        // Time is absolute now
        this.state.worldStartTime = CONFIG.SEASON_START_DATE;

        await RAPIER.init();
        const gravity = { x: 0.0, y: 0.0 };
        this.physicsWorld = new RAPIER.World(gravity);
        this.eventQueue = new RAPIER.EventQueue(true);

        this.world = createWorld();
        this.spawnManager = new SpawnManager(this.world, this.physicsWorld, this.state, this.entities);
        this.spellSystem = new SpellSystem(this);
        this.prestigeSystem = new PrestigeSystem(this);
        this.duelSystem = new DuelSystem(this);
        this.itemSystem = new ItemSystem(this);
        this.shopSystem = new ShopSystem(this);
        this.chatManager = new ChatManager(this);
        this.persistenceSystem = new PersistenceSystem(this.entities, this.state.players, this.playerDbIds);
        this.healthSystem = new HealthSystem(this);

        try {
            const mapPath = path.join(process.cwd(), "assets/maps/world.json");
            const mapFile = await fs.readFile(mapPath, "utf-8");
            const mapData = JSON.parse(mapFile) as MapData;
            
            const result = buildPhysics(this.physicsWorld, mapData);
            const entitiesResult = parseEntities(mapData);
            const logicData = parseLogic(mapData);

            LevelRegistry.getInstance().setData(logicData);
            
            this.spawnPos = entitiesResult.spawnPos;
            this.pathfinder = new Pathfinding(result.navGrid);
            
            console.log(`[SERVER] Map loaded. Initializing 24 Student Slots...`);
            this.spawnManager.loadSeats(mapData);
            this.spawnManager.spawnEchoes(24, this.spawnPos);
            this.spawnManager.spawnFromMap(mapData);
            // Spawn initial cards
            for(let i=0; i<5; i++) this.itemSystem.spawnRandomItem();
        } catch (e) {
            console.error("[SERVER] Error loading map:", e);
        }

        let logTimer = 0;
        let lastRewardedHour = -1;
        let lastLogHour = -1;

        this.setSimulationInterval((deltaTime) => {
            const now = timeManager.getNow();
            // Sync Time Offset to Clients
            if (this.state.timeOffset !== timeManager.getOffset()) {
                this.state.timeOffset = timeManager.getOffset();
            }

            // Use decoupled time for logic
            // --- TIME & SCHEDULE ---
            const { hour: currentHour, isNight } = getGameTime(now);
            
            // Check Prefect Spawns (Night Watch)
            this.spawnManager.checkPrefectSpawns(isNight);

            if (Math.abs(currentHour - lastLogHour) > 0.1) {
                lastLogHour = currentHour;
                
                // Attendance Check (Every 0.1 hours = 6 mins game time)
                this.checkClassAttendance(currentHour);
                
                // Narrative / Day Cycle Events
                if (Math.floor(currentHour) !== Math.floor(lastRewardedHour)) {
                    // Hour changed
                    // console.log(`[TIME] Hour is now ${Math.floor(currentHour)}:00`);
                }
            }
            const { currentCourse, currentMonth, currentWeek, currentDay } = getAcademicProgress(this.state.worldStartTime, now);
            
            // Sync Calendar State
            if (this.state.currentMonth !== currentMonth) {
                console.log(`[CALENDAR] New Month: ${currentMonth}`);
                this.state.currentMonth = currentMonth;
            }
            
            // Note: We can also track Day changes here if needed for events
            // if (this.previousDay !== currentDay) { console.log(`[CALENDAR] Day ${currentDay} of Week ${currentWeek}`); }

            // --- ATTENDANCE CHECK (ECHO MAINTENANCE) ---
            this.attendanceTimer += deltaTime;
            if (this.attendanceTimer > 1000) { // Check every 1 second
                this.attendanceTimer = 0;
                this.checkClassAttendance(currentHour);
            }

            // Detect YEAR END / GRADUATION
            if (this.state.currentCourse < currentCourse) {
                let winner = "Tie";
                const scores = [
                    { name: 'IGNIS', score: this.state.ignisPoints },
                    { name: 'AXIOM', score: this.state.axiomPoints },
                    { name: 'VESPER', score: this.state.vesperPoints }
                ];
                scores.sort((a, b) => b.score - a.score);
                if (scores[0].score > scores[1].score) winner = scores[0].name;

                this.chatManager.broadcastSystemMessage(
                    `THE ACADEMIC YEAR ENDS! The winner of the Cup is: ${winner}!`,
                    "HEADMASTER"
                );

                this.state.ignisPoints = 0;
                this.state.axiomPoints = 0;
                this.state.vesperPoints = 0;
                this.state.currentCourse = currentCourse;
                console.log(`[GRADUATION] House ${winner} won! Resetting points.`);
            }
            
            /* PRESTIGE SYSTEM PAUSED (Pending Official Design)
            // PRESTIGE REWARDS
            if (currentHour !== lastRewardedHour) {
                lastRewardedHour = currentHour;
                // ... (Logic removed)
            }
            */
            
            MovementSystem(this.world);
            this.duelSystem.update();
            
            AISystem(
                this.world, 
                this.physicsWorld, 
                deltaTime, 
                currentHour, 
                this.pathfinder,
                (id, spell, vx, vy) => this.handleCast(id, spell, vx, vy),
                (id) => {
                    const p = this.state.players.get(id);
                    return p ? { x: p.x, y: p.y } : null;
                },
                (id, text) => this.chatManager.handleChat(id, text),
                (id) => {
                    // JUMP EVENT
                    this.broadcast("player_jump", { id });
                },
                (prefectId, victimId) => {
                    // CATCH EVENT
                    // Only send to detention if it's a real player (or maybe echoes too?)
                    // For now, punish everyone.
                    this.sendToDetention(victimId);
                }
            );
            
            this.spellSystem.update(deltaTime);
            this.itemSystem.update(deltaTime);
            this.healthSystem.update();
            this.physicsWorld.step(this.eventQueue);

            // SYNC PHYSICS TO STATE
            this.entities.forEach((entity, sessionId) => {
                if (entity.body) {
                    const pos = entity.body.translation();
                    const playerState = this.state.players.get(sessionId);
                    
                    if (playerState) {
                        // OPTIMIZATION: Round to 2 decimals to prevent micro-jitter network spam
                        const newX = Math.round(pos.x * 100) / 100;
                        const newY = Math.round(pos.y * 100) / 100;
                        
                        if (playerState.x !== newX || playerState.y !== newY) {
                            playerState.x = newX;
                            playerState.y = newY;
                        }

                        // --- DETENTION RELEASE CHECK ---
                        // Note: detentionWork is set to 50 on entry. If it was > 0 and now is <= 0, release.
                        // We need a way to know if they were PREVIOUSLY in detention.
                        // Using a simple check: if player is near detention and work is 0, we don't care.
                        // But if they are EXACTLY at detention coordinates and work is 0?
                        // Let's use a "flag" or just check work units.
                        // Actually, ItemSystem handles the reduction. 
                        // I will check here if work is 0 BUT they are in the detention zone.
                        const detentionLoc = LevelRegistry.getInstance().getLocation("DETENTION");
                        const distToDetention = Math.sqrt((playerState.x - detentionLoc.x)**2 + (playerState.y - detentionLoc.y)**2);
                        if (playerState.detentionWork <= 0 && distToDetention < 200) {
                             // They might have just been released or never detained.
                             // To avoid infinite teleport loops, we only release if we have a record they were detained.
                             // Or just check if work was > 0.
                             // Let's use a simpler approach: ItemSystem calls releaseFromDetention directly!
                        }
                    }
                }
            });

            logTimer += deltaTime;
        }, 1000 / CONFIG.SERVER_FPS);

        this.onMessage("move", (client, input: PlayerInput) => {
            // Check Unconscious State
            const playerState = this.state.players.get(client.sessionId);
            if (playerState && playerState.unconsciousUntil > 0) return; // INPUT BLOCKED

            const entity = this.entities.get(client.sessionId);
            if (entity && entity.input) {
                entity.input.left = !!input.left;
                entity.input.right = !!input.right;
                entity.input.up = !!input.up;
                entity.input.down = !!input.down;

                if (input.analogDir) {
                    entity.input.analogDir = {
                        x: Number(input.analogDir.x) || 0,
                        y: Number(input.analogDir.y) || 0
                    };
                } else {
                    entity.input.analogDir = undefined;
                }
            } else {
                console.warn(`[SERVER] No entity found for moving client ${client.sessionId}`);
            }
        });

        this.onMessage("cast", (client, data: { spellId: string, vx: number, vy: number }) => {
            console.log(`[SERVER] Received cast from ${client.sessionId}: ${data.spellId}`);
            this.handleCast(client.sessionId, data.spellId, data.vx, data.vy);
        });

        this.onMessage("collect", (client, itemId: string) => {
            this.itemSystem.tryCollectItem(client.sessionId, itemId);
        });

        this.onMessage("buy", (client, itemId: string) => {
            this.shopSystem.handleBuy(client.sessionId, itemId);
        });

        this.onMessage("ping", (client, timestamp) => {
            client.send("pong", timestamp);
        });

        this.onMessage("chat", (client, text: string) => {
            this.chatManager.handleChat(client.sessionId, text);
        });

        this.onMessage("jump", (client) => {
            this.broadcast("player_jump", { id: client.sessionId });
        });

        // --- ACADEMIC SYSTEM ---
        this.onMessage("submit_score", (client, data: { score: number }) => {
            const player = this.state.players.get(client.sessionId);
            if (!player || !player.isAttendingClass) return;

            // ANTI-CHEAT: Check duration
            const startTime = this.minigameStartTimes.get(client.sessionId) || 0;
            const elapsed = Date.now() - startTime;
            this.minigameStartTimes.delete(client.sessionId);

            if (elapsed < 25000) { // Minimum 25s for a 30s game
                console.warn(`[CLASS:CHEAT] ${player.username} submitted score too fast! (${elapsed}ms)`);
                player.isAttendingClass = false;
                client.send("class_completed", { grade: "T", points: 0 }); // Fail
                return;
            }

            const score = Math.min(100, Math.max(0, data.score || 0));
            let grade = "T";
            let prestige = 0;
            let gold = 10; // Participation gold
            let xp = 10;

            if (score >= 90) { grade = "S"; prestige = 20; gold = 100; xp = 100; }
            else if (score >= 70) { grade = "A"; prestige = 10; gold = 50; xp = 75; }
            else if (score >= 50) { grade = "B"; prestige = 5; gold = 20; xp = 50; }

            // Apply Rewards via System
            if (prestige > 0) this.prestigeSystem.addPrestige(client.sessionId, prestige);
            if (gold > 0) this.prestigeSystem.addGold(client.sessionId, gold);
            
            player.xp += xp;
            player.isAttendingClass = false;
            player.classEndsAt = 0;

            // Feedback
            client.send("class_completed", { grade, prestige, gold });
            this.chatManager.broadcastSystemMessage(`${player.username} finished class with Grade ${grade}!`, "TEACHER");
            
            console.log(`[CLASS] ${player.username} scored ${score} (${grade}). Gold: ${player.gold}, Prestige: ${player.personalPrestige}`);
        });

        // Start Auto-Save
        this.persistenceSystem.startAutoSave();
    }

    checkClassAttendance(currentHour: number) {
        // 1. Identify Schedule Window
        const scheduleIndex = CONFIG.ACADEMIC_SCHEDULE.findIndex(item => {
            if (item.start < item.end) return currentHour >= item.start && currentHour < item.end;
            return currentHour >= item.start || currentHour < item.end;
        });

        if (scheduleIndex === -1) return;
        const item = CONFIG.ACADEMIC_SCHEDULE[scheduleIndex];
        
        // We only care about CLASS activity for now
        if (item.activity !== 'class') return;

        const now = Date.now();
        const { currentCourse, currentDay } = getAcademicProgress(this.state.worldStartTime, now);

        this.entities.forEach((entity, sessionId) => {
            if (!entity.body) return;
            const playerState = this.state.players.get(sessionId);
            if (!playerState) return;

            // --- REAL PLAYER LOGIC ---
            if (!entity.ai) {
                // If already attending class
                if (playerState.isAttendingClass) {
                    // Check completion
                    if (now > playerState.classEndsAt) {
                        playerState.isAttendingClass = false;
                        playerState.classEndsAt = 0;
                        // Reward! (Legacy fallback for simple attendance)
                        this.prestigeSystem.addPrestige(sessionId, 5);
                        this.prestigeSystem.addGold(sessionId, 20);
                        playerState.xp += 50;
                        const client = this.clients.find(c => c.sessionId === sessionId);
                        if (client) {
                            client.send("class_completed", { grade: "A", prestige: 5, gold: 20 });
                            this.chatManager.broadcastSystemMessage(`${playerState.username} finished class!`, "TEACHER");
                        }
                    }
                    return; // Skip proximity check if already in class
                }

                // Check Proximity to Desks
                // Optimization: Only check if velocity is low (not running through room)
                const vel = entity.body.linvel();
                if (Math.abs(vel.x) < 0.1 && Math.abs(vel.y) < 0.1) {
                     const pos = entity.body.translation();
                     let foundDesk = false;
                     
                     // Check against all class seats
                     for (const [seatId, seatPos] of this.spawnManager.seats.class) {
                         const dx = pos.x - seatPos.x;
                         const dy = pos.y - seatPos.y;
                         if (dx*dx + dy*dy < 900) { // 30px radius
                             foundDesk = true;
                             break;
                         }
                     }

                     if (foundDesk) {
                         console.log(`[CLASS] Player ${playerState.username} sat at desk. Starting Class...`);
                         playerState.isAttendingClass = true;
                         playerState.classEndsAt = now + 180000; // 3 Minutes
                         
                         const client = this.clients.find(c => c.sessionId === sessionId);
                         if (client) {
                             client.send("start_minigame", { duration: 180000 });
                         }
                     }
                }
            }
            
            // --- ECHO LOGIC (Maintenance) ---
            else if (entity.ai) {
                 // Check Echo Attendance (Passive)
                 // Re-using the previous logic but inside this loop
                 let targetLoc = LevelRegistry.getInstance().getLocation("ACADEMIC_WING");
                 if (item.location === "Forest") targetLoc = LevelRegistry.getInstance().getLocation("FOREST");

                 const key = `${currentCourse}_${currentDay}_${scheduleIndex}_${sessionId}`;
                 if (!this.attendanceLog.has(key)) {
                    const pos = entity.body.translation();
                    const dx = pos.x - targetLoc.x;
                    const dy = pos.y - targetLoc.y;
                    
                    // Check broad area (Academic Wing) OR specific seat state
                    // If AI state is 'attending_class', we know they are there
                    if ((entity.ai as any).state === 'attending_class') {
                         this.attendanceLog.add(key);
                         playerState.academicPoints += 1;
                         
                         // Visual Sync: Set Schema State so clients see countdown
                         if (!playerState.isAttendingClass) {
                             playerState.isAttendingClass = true;
                             playerState.classEndsAt = now + 180000; // Fake timer for visuals
                         }
                    }
                 }
                 
                 // Reset Schema State if AI is done
                 if (playerState.isAttendingClass && (entity.ai as any).state !== 'attending_class') {
                     playerState.isAttendingClass = false;
                     playerState.classEndsAt = 0;
                 }
            }
        });
    }

    async onDispose() {
        console.log("[SERVER] Room disposing. Attempting final save for all players...");
        this.persistenceSystem.stopAutoSave();
        await this.persistenceSystem.saveAllPlayers();
    }

    public sendToDetention(sessionId: string) {
        const player = this.state.players.get(sessionId);
        const entity = this.entities.get(sessionId);
        
        if (player && entity && entity.body) {
            console.log(`[DISCIPLINE] Detaining ${player.username} (${sessionId})`);
            
            // 1. Teleport
            const detentionPos = LevelRegistry.getInstance().getLocation("DETENTION");
            entity.body.setTranslation(detentionPos, true);
            player.x = detentionPos.x;
            player.y = detentionPos.y;
            
            // 2. Set Work (Anti-AFK)
            player.detentionWork = 50; // Needs 5 tasks (10 units each)
            
            // 3. Spawn Tasks if not already present
            this.itemSystem.spawnDetentionTasks();
            
            // 4. Notify
            const client = this.clients.find(c => c.sessionId === sessionId);
            if (client) {
                client.send("notification", "YOU HAVE BEEN DETAINED! Complete 5 tasks to leave.");
            }
            
            this.chatManager.broadcastSystemMessage(`${player.username} has been sent to DETENTION.`, "PREFECT");
        }
    }

    public releaseFromDetention(sessionId: string) {
        const player = this.state.players.get(sessionId);
        const entity = this.entities.get(sessionId);
        if (player && entity && entity.body) {
            console.log(`[DISCIPLINE] Releasing ${player.username}`);
            
            // Return to Dorm based on house
            const registry = LevelRegistry.getInstance();
            let dormPos = registry.getLocation("DORM_IGNIS");
            if (player.house === 'axiom') dormPos = registry.getLocation("DORM_AXIOM");
            if (player.house === 'vesper') dormPos = registry.getLocation("DORM_VESPER");
            
            entity.body.setTranslation(dormPos, true);
            player.x = dormPos.x;
            player.y = dormPos.y;
            player.detentionWork = 0;
            
            const client = this.clients.find(c => c.sessionId === sessionId);
            if (client) {
                client.send("notification", "You are free! Return to your studies.");
            }
        }
    }

    handleCast(sessionId: string, spellId: string, vx: number, vy: number) {
        // Check Unconscious State
        const playerState = this.state.players.get(sessionId);
        if (playerState && playerState.unconsciousUntil > 0) return; // CAST BLOCKED

        const entity = this.entities.get(sessionId);
        if (!entity || !entity.body) {
            console.warn(`[SERVER] Cast failed: Entity ${sessionId} not found or has no body`);
            return;
        }

        const spellConfig = SPELL_REGISTRY[spellId];
        if (!spellConfig) {
            console.warn(`[SERVER] Cast failed: Spell ${spellId} not in registry`);
            return;
        }

        const now = Date.now();
        const lastCast = this.lastCastTimes.get(sessionId) || 0;
        if (now - lastCast < spellConfig.cooldown) {
            console.log(`[SERVER] Cast on cooldown for ${sessionId}`);
            return;
        }
        this.lastCastTimes.set(sessionId, now);

        // Spawn projectile
        const pos = entity.body.translation();
        const id = `proj_${sessionId}_${now}`;
        const proj = new Projectile();
        proj.id = id;
        proj.spellId = spellId;
        proj.x = pos.x;
        proj.y = pos.y;
        
        const mag = Math.sqrt(vx * vx + vy * vy);
        proj.vx = (mag > 0) ? (vx / mag) * spellConfig.speed : spellConfig.speed;
        proj.vy = (mag > 0) ? (vy / mag) * spellConfig.speed : 0;
        proj.ownerId = sessionId;
        
        proj.creationTime = now;
        proj.maxRange = CONFIG.SPELL_CONFIG.BASE_RANGE;

        this.state.projectiles.set(id, proj);
        console.log(`[SERVER] Projectile created: ${id} at ${proj.x},${proj.y}`);
    }

    async onJoin(client: Client, options: JoinOptions) {
        try {
            const authUser = client.auth as { userId: number, username: string };
            
            // 1. FIND AN AVAILABLE SLOT
            const targetHouse = options.skin?.includes('red') ? 'ignis' : (options.skin?.includes('blue') ? 'axiom' : 'vesper');
            
            let possessedEntity: Entity | undefined;
            let slotId: string | undefined;

            for (const [id, ent] of this.entities) {
                if (ent.ai && !ent.player?.sessionId.startsWith('sess_')) {
                    if (!targetHouse || ent.ai.house === targetHouse) {
                        possessedEntity = ent;
                        slotId = id;
                        break;
                    }
                }
            }

            if (!possessedEntity || !slotId) {
                console.error("[SERVER] No available student slots!");
                client.leave();
                return;
            }

            // 2. POSSESS SLOT
            const originalSpots = possessedEntity.ai!.routineSpots;
            const house = possessedEntity.ai!.house;
            const oldEchoState = this.state.players.get(slotId);
            const carriedPrestige = oldEchoState?.personalPrestige || 0;

            // Remove AI control but keep the entity
            possessedEntity.player!.sessionId = client.sessionId;
            possessedEntity.ai = undefined; 
            possessedEntity.input = { left: false, right: false, up: false, down: false }; 

            // Track slot info for restoration
            (possessedEntity as any).slotId = slotId; 
            (possessedEntity as any).tempSpots = originalSpots;
            (possessedEntity as any).house = house;

            this.entities.delete(slotId);
            this.entities.set(client.sessionId, possessedEntity);
            
            // LOAD DB SESSION
            const session = await PlayerService.initializeSession(authUser.userId, authUser.username, { ...options, house });
            this.playerDbIds.set(client.sessionId, session.dbPlayer.id);

            // 3. Setup State
            const playerState = new Player();
            playerState.id = client.sessionId;
            playerState.username = authUser.username;
            const pos = possessedEntity.body!.translation();
            playerState.x = pos.x;
            playerState.y = pos.y;
            playerState.skin = options.skin || "player_idle";
            playerState.personalPrestige = session.dbPlayer.prestige || 0;
            playerState.gold = session.dbPlayer.gold || 0;
            playerState.house = house || 'ignis';
            
            // Fable System & Grades
            playerState.xp = session.dbPlayer.xp || 0;
            playerState.academicPoints = session.dbPlayer.academicPoints || 0;
            this.alignmentMap.set(client.sessionId, session.dbPlayer.alignment || 0);

            // Hydrate Inventory (Universal + Legacy Cards)
            if (session.dbPlayer.inventory) {
                session.dbPlayer.inventory.forEach((dbItem: any) => {
                    // 1. Universal Inventory
                    const invItem = new InventoryItem();
                    invItem.itemId = dbItem.itemId;
                    invItem.qty = dbItem.count;
                    playerState.inventory.push(invItem);
                });
            }

            this.state.players.set(client.sessionId, playerState);
            this.state.players.delete(slotId); 

            console.log(`[SERVER] Player ${authUser.username} possessed slot ${slotId} with ${playerState.personalPrestige} prestige.`);

        } catch (e) {
            console.error(`[SERVER] Error joining player ${client.sessionId}:`, e);
            client.leave();
        }
    }

    async onLeave(client: Client) {
        const entity = this.entities.get(client.sessionId);
        const dbId = this.playerDbIds.get(client.sessionId);

        if (entity && entity.body) {
            const playerState = this.state.players.get(client.sessionId);
            
            // ATOMIC SAVE-ON-EXIT
            if (dbId && playerState) {
                // We update the schema X/Y with latest physics pos to ensure accuracy
                const pos = entity.body.translation();
                playerState.x = pos.x;
                playerState.y = pos.y;
                
                // Inject Hidden Data for Persistence
                const hiddenAlignment = this.alignmentMap.get(client.sessionId) || 0;
                (playerState as any).alignment = hiddenAlignment;

                await PlayerService.saveSession(dbId, playerState);
            }

            // UNPOSSESS: Restore original slot ID
            const slotId = (entity as any).slotId || `student_fallback_${Date.now()}`;
            const spots = (entity as any).tempSpots;
            const house = (entity as any).house;
            
            entity.player!.sessionId = slotId;
            entity.ai = {
                state: 'idle',
                timer: 0,
                home: entity.body.translation(),
                house: house,
                routineSpots: spots
            };

            this.entities.delete(client.sessionId);
            this.entities.set(slotId, entity);

            const oldState = this.state.players.get(client.sessionId);
            const echoState = new Player();
            echoState.id = slotId;
            // PERSISTENCE: The Echo keeps the Player's name while offline
            echoState.username = oldState?.username || `${house.charAt(0).toUpperCase() + house.slice(1)} Student`;
            echoState.x = entity.body.translation().x;
            echoState.y = entity.body.translation().y;
            echoState.skin = oldState?.skin || "player_idle";
            echoState.personalPrestige = oldState?.personalPrestige || 0; // RESTORE POINTS TO ECHO
            echoState.gold = oldState?.gold || 0;
            echoState.house = house || 'ignis';
            
            this.state.players.set(slotId, echoState);
        }
        
        this.state.players.delete(client.sessionId);
        this.playerDbIds.delete(client.sessionId);
        this.alignmentMap.delete(client.sessionId);
    }
}
