"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldRoom = void 0;
const colyseus_1 = require("colyseus");
const SchemaDef_1 = require("../shared/SchemaDef");
const Config_1 = require("../shared/Config");
const rapier2d_compat_1 = __importDefault(require("@dimforge/rapier2d-compat"));
const MapParser_1 = require("../shared/MapParser");
const world_1 = require("../shared/ecs/world");
const MovementSystem_1 = require("../shared/systems/MovementSystem");
const AISystem_1 = require("../shared/systems/AISystem");
const Pathfinding_1 = require("../shared/systems/Pathfinding");
const SpellSystem_1 = require("./systems/SpellSystem");
const PrestigeSystem_1 = require("./systems/PrestigeSystem");
const SpellRegistry_1 = require("../shared/items/SpellRegistry");
const AuthService_1 = require("./services/AuthService");
const SpawnManager_1 = require("./managers/SpawnManager");
const PlayerService_1 = require("./services/PlayerService");
const fs = __importStar(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const DuelSystem_1 = require("./systems/DuelSystem");
const ItemSystem_1 = require("./systems/ItemSystem");
const ShopSystem_1 = require("./systems/ShopSystem");
const ChatManager_1 = require("./managers/ChatManager");
const PersistenceSystem_1 = require("./systems/PersistenceSystem");
const TimeManager_1 = require("../shared/managers/TimeManager");
const HealthSystem_1 = require("./systems/HealthSystem");
class WorldRoom extends colyseus_1.Room {
    constructor() {
        super(...arguments);
        this.entities = new Map();
        this.playerDbIds = new Map();
        // Hidden Server-Side State
        this.alignmentMap = new Map(); // <sessionId, alignmentScore> (-100 to +100)
        this.attendanceLog = new Set(); // Tracks awarded attendance: "Day_WindowIndex_SessionId"
        this.attendanceTimer = 0;
        this.spawnPos = { x: 300, y: 300 };
        // Security: Cooldown Tracking
        this.lastCastTimes = new Map();
    }
    async onAuth(client, options, request) {
        if (!options.token)
            return false;
        const userData = AuthService_1.AuthService.verifyToken(options.token);
        if (!userData)
            return false;
        return userData;
    }
    async onCreate(options) {
        this.setMetadata({ name: "Cliffwald World" });
        this.setState(new SchemaDef_1.GameState());
        // Initialize Points
        this.state.ignisPoints = 0;
        this.state.axiomPoints = 0;
        this.state.vesperPoints = 0;
        // Time is absolute now
        this.state.worldStartTime = Config_1.CONFIG.SEASON_START_DATE;
        await rapier2d_compat_1.default.init();
        const gravity = { x: 0.0, y: 0.0 };
        this.physicsWorld = new rapier2d_compat_1.default.World(gravity);
        this.eventQueue = new rapier2d_compat_1.default.EventQueue(true);
        this.world = (0, world_1.createWorld)();
        this.spawnManager = new SpawnManager_1.SpawnManager(this.world, this.physicsWorld, this.state, this.entities);
        this.spellSystem = new SpellSystem_1.SpellSystem(this);
        this.prestigeSystem = new PrestigeSystem_1.PrestigeSystem(this);
        this.duelSystem = new DuelSystem_1.DuelSystem(this);
        this.itemSystem = new ItemSystem_1.ItemSystem(this);
        this.shopSystem = new ShopSystem_1.ShopSystem(this);
        this.chatManager = new ChatManager_1.ChatManager(this);
        this.persistenceSystem = new PersistenceSystem_1.PersistenceSystem(this.entities, this.state.players, this.playerDbIds);
        this.healthSystem = new HealthSystem_1.HealthSystem(this);
        try {
            const mapPath = path_1.default.join(process.cwd(), "assets/maps/world.json");
            const mapFile = await fs.readFile(mapPath, "utf-8");
            const mapData = JSON.parse(mapFile);
            const result = (0, MapParser_1.buildPhysics)(this.physicsWorld, mapData);
            const entitiesResult = (0, MapParser_1.parseEntities)(mapData);
            this.spawnPos = entitiesResult.spawnPos;
            this.pathfinder = new Pathfinding_1.Pathfinding(result.navGrid);
            console.log(`[SERVER] Map loaded. Initializing 24 Student Slots...`);
            this.spawnManager.loadSeats(mapData);
            this.spawnManager.spawnEchoes(24, this.spawnPos);
            this.spawnManager.spawnFromMap(mapData);
            // Spawn initial cards
            for (let i = 0; i < 5; i++)
                this.itemSystem.spawnRandomItem();
        }
        catch (e) {
            console.error("[SERVER] Error loading map:", e);
        }
        let logTimer = 0;
        let lastRewardedHour = -1;
        this.setSimulationInterval((deltaTime) => {
            const now = TimeManager_1.timeManager.getNow();
            // Sync Time Offset to Clients
            if (this.state.timeOffset !== TimeManager_1.timeManager.getOffset()) {
                this.state.timeOffset = TimeManager_1.timeManager.getOffset();
            }
            // Use decoupled time for logic
            const currentHour = (0, Config_1.getGameTime)(now).hour;
            const { currentCourse, currentMonth, currentWeek, currentDay } = (0, Config_1.getAcademicProgress)(this.state.worldStartTime, now);
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
                if (scores[0].score > scores[1].score)
                    winner = scores[0].name;
                this.chatManager.broadcastSystemMessage(`THE ACADEMIC YEAR ENDS! The winner of the Cup is: ${winner}!`, "HEADMASTER");
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
            (0, MovementSystem_1.MovementSystem)(this.world);
            this.duelSystem.update();
            (0, AISystem_1.AISystem)(this.world, this.physicsWorld, deltaTime, currentHour, this.pathfinder, (id, spell, vx, vy) => this.handleCast(id, spell, vx, vy), (id) => {
                const p = this.state.players.get(id);
                return p ? { x: p.x, y: p.y } : null;
            });
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
                    }
                }
            });
            logTimer += deltaTime;
        }, 1000 / Config_1.CONFIG.SERVER_FPS);
        this.onMessage("move", (client, input) => {
            // Check Unconscious State
            const playerState = this.state.players.get(client.sessionId);
            if (playerState && playerState.unconsciousUntil > 0)
                return; // INPUT BLOCKED
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
                }
                else {
                    entity.input.analogDir = undefined;
                }
            }
            else {
                console.warn(`[SERVER] No entity found for moving client ${client.sessionId}`);
            }
        });
        this.onMessage("cast", (client, data) => {
            console.log(`[SERVER] Received cast from ${client.sessionId}: ${data.spellId}`);
            this.handleCast(client.sessionId, data.spellId, data.vx, data.vy);
        });
        this.onMessage("collect", (client, itemId) => {
            this.itemSystem.tryCollectItem(client.sessionId, itemId);
        });
        this.onMessage("buy", (client, itemId) => {
            this.shopSystem.handleBuy(client.sessionId, itemId);
        });
        this.onMessage("ping", (client, timestamp) => {
            client.send("pong", timestamp);
        });
        this.onMessage("chat", (client, text) => {
            this.chatManager.handleChat(client.sessionId, text);
        });
        // Start Auto-Save
        this.persistenceSystem.startAutoSave();
    }
    checkClassAttendance(currentHour) {
        // 1. Identify Schedule Window
        const scheduleIndex = Config_1.CONFIG.ACADEMIC_SCHEDULE.findIndex(item => {
            if (item.start < item.end)
                return currentHour >= item.start && currentHour < item.end;
            return currentHour >= item.start || currentHour < item.end;
        });
        if (scheduleIndex === -1)
            return;
        const item = Config_1.CONFIG.ACADEMIC_SCHEDULE[scheduleIndex];
        // We only care about CLASS activity for now
        if (item.activity !== 'class')
            return;
        const now = Date.now();
        const { currentCourse, currentDay } = (0, Config_1.getAcademicProgress)(this.state.worldStartTime, now);
        this.entities.forEach((entity, sessionId) => {
            if (!entity.body)
                return;
            const playerState = this.state.players.get(sessionId);
            if (!playerState)
                return;
            // --- REAL PLAYER LOGIC ---
            if (!entity.ai) {
                // If already attending class
                if (playerState.isAttendingClass) {
                    // Check completion
                    if (now > playerState.classEndsAt) {
                        playerState.isAttendingClass = false;
                        playerState.classEndsAt = 0;
                        // Reward!
                        playerState.academicPoints += 5; // Good job!
                        playerState.xp += 50;
                        const client = this.clients.find(c => c.sessionId === sessionId);
                        if (client) {
                            client.send("class_completed", { grade: "A", points: 5 });
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
                        if (dx * dx + dy * dy < 900) { // 30px radius
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
                let targetLoc = Config_1.CONFIG.SCHOOL_LOCATIONS.ACADEMIC_WING;
                if (item.location === "Forest")
                    targetLoc = Config_1.CONFIG.SCHOOL_LOCATIONS.FOREST;
                const key = `${currentCourse}_${currentDay}_${scheduleIndex}_${sessionId}`;
                if (!this.attendanceLog.has(key)) {
                    const pos = entity.body.translation();
                    const dx = pos.x - targetLoc.x;
                    const dy = pos.y - targetLoc.y;
                    // Check broad area (Academic Wing) OR specific seat state
                    // If AI state is 'attending_class', we know they are there
                    if (entity.ai.state === 'attending_class') {
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
                if (playerState.isAttendingClass && entity.ai.state !== 'attending_class') {
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
    handleCast(sessionId, spellId, vx, vy) {
        // Check Unconscious State
        const playerState = this.state.players.get(sessionId);
        if (playerState && playerState.unconsciousUntil > 0)
            return; // CAST BLOCKED
        const entity = this.entities.get(sessionId);
        if (!entity || !entity.body) {
            console.warn(`[SERVER] Cast failed: Entity ${sessionId} not found or has no body`);
            return;
        }
        const spellConfig = SpellRegistry_1.SPELL_REGISTRY[spellId];
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
        const proj = new SchemaDef_1.Projectile();
        proj.id = id;
        proj.spellId = spellId;
        proj.x = pos.x;
        proj.y = pos.y;
        const mag = Math.sqrt(vx * vx + vy * vy);
        proj.vx = (mag > 0) ? (vx / mag) * spellConfig.speed : spellConfig.speed;
        proj.vy = (mag > 0) ? (vy / mag) * spellConfig.speed : 0;
        proj.ownerId = sessionId;
        proj.creationTime = now;
        proj.maxRange = Config_1.CONFIG.SPELL_CONFIG.BASE_RANGE;
        this.state.projectiles.set(id, proj);
        console.log(`[SERVER] Projectile created: ${id} at ${proj.x},${proj.y}`);
    }
    async onJoin(client, options) {
        try {
            const authUser = client.auth;
            // 1. FIND AN AVAILABLE SLOT
            const targetHouse = options.skin?.includes('red') ? 'ignis' : (options.skin?.includes('blue') ? 'axiom' : 'vesper');
            let possessedEntity;
            let slotId;
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
            const originalSpots = possessedEntity.ai.routineSpots;
            const house = possessedEntity.ai.house;
            const oldEchoState = this.state.players.get(slotId);
            const carriedPrestige = oldEchoState?.personalPrestige || 0;
            // Remove AI control but keep the entity
            possessedEntity.player.sessionId = client.sessionId;
            possessedEntity.ai = undefined;
            possessedEntity.input = { left: false, right: false, up: false, down: false };
            // Track slot info for restoration
            possessedEntity.slotId = slotId;
            possessedEntity.tempSpots = originalSpots;
            possessedEntity.house = house;
            this.entities.delete(slotId);
            this.entities.set(client.sessionId, possessedEntity);
            // LOAD DB SESSION
            const session = await PlayerService_1.PlayerService.initializeSession(authUser.userId, authUser.username, { ...options, house });
            this.playerDbIds.set(client.sessionId, session.dbPlayer.id);
            // 3. Setup State
            const playerState = new SchemaDef_1.Player();
            playerState.id = client.sessionId;
            playerState.username = authUser.username;
            const pos = possessedEntity.body.translation();
            playerState.x = pos.x;
            playerState.y = pos.y;
            playerState.skin = options.skin || "player_idle";
            playerState.personalPrestige = session.dbPlayer.prestige || 0;
            playerState.house = house || 'ignis';
            // Fable System & Grades
            playerState.xp = session.dbPlayer.xp || 0;
            playerState.academicPoints = session.dbPlayer.academicPoints || 0;
            this.alignmentMap.set(client.sessionId, session.dbPlayer.alignment || 0);
            // Hydrate Inventory (Universal + Legacy Cards)
            if (session.dbPlayer.inventory) {
                session.dbPlayer.inventory.forEach((dbItem) => {
                    // 1. Universal Inventory
                    const invItem = new SchemaDef_1.InventoryItem();
                    invItem.itemId = dbItem.itemId;
                    invItem.qty = dbItem.count;
                    playerState.inventory.push(invItem);
                });
            }
            this.state.players.set(client.sessionId, playerState);
            this.state.players.delete(slotId);
            console.log(`[SERVER] Player ${authUser.username} possessed slot ${slotId} with ${playerState.personalPrestige} prestige.`);
        }
        catch (e) {
            console.error(`[SERVER] Error joining player ${client.sessionId}:`, e);
            client.leave();
        }
    }
    async onLeave(client) {
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
                playerState.alignment = hiddenAlignment;
                await PlayerService_1.PlayerService.saveSession(dbId, playerState);
            }
            // UNPOSSESS: Restore original slot ID
            const slotId = entity.slotId || `student_fallback_${Date.now()}`;
            const spots = entity.tempSpots;
            const house = entity.house;
            entity.player.sessionId = slotId;
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
            const echoState = new SchemaDef_1.Player();
            echoState.id = slotId;
            // PERSISTENCE: The Echo keeps the Player's name while offline
            echoState.username = oldState?.username || `${house.charAt(0).toUpperCase() + house.slice(1)} Student`;
            echoState.x = entity.body.translation().x;
            echoState.y = entity.body.translation().y;
            echoState.skin = oldState?.skin || "player_idle";
            echoState.personalPrestige = oldState?.personalPrestige || 0; // RESTORE POINTS TO ECHO
            echoState.house = house || 'ignis';
            this.state.players.set(slotId, echoState);
        }
        this.state.players.delete(client.sessionId);
        this.playerDbIds.delete(client.sessionId);
        this.alignmentMap.delete(client.sessionId);
    }
}
exports.WorldRoom = WorldRoom;
