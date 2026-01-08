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
class WorldRoom extends colyseus_1.Room {
    constructor() {
        super(...arguments);
        this.entities = new Map();
        this.playerDbIds = new Map();
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
        this.state.worldStartTime = Date.now();
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
            const currentHour = (0, Config_1.getGameHour)(this.state.worldStartTime);
            const { currentCourse, currentMonth, currentWeek } = (0, Config_1.getAcademicProgress)(this.state.worldStartTime);
            // Sync Calendar State
            // Sync Calendar State
            if (this.state.currentMonth !== currentMonth) {
                console.log(`[CALENDAR] Welcome to ${currentMonth}`);
                this.state.currentMonth = currentMonth;
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
                const msg = new SchemaDef_1.ChatMessage();
                msg.sender = "HEADMASTER";
                msg.text = `THE ACADEMIC YEAR ENDS! The winner of the Cup is: ${winner}!`;
                msg.timestamp = Date.now();
                this.state.messages.push(msg);
                this.broadcast("chat", msg);
                this.state.ignisPoints = 0;
                this.state.axiomPoints = 0;
                this.state.vesperPoints = 0;
                this.state.currentCourse = currentCourse;
                console.log(`[GRADUATION] House ${winner} won! Resetting points.`);
            }
            // PRESTIGE REWARDS
            if (currentHour !== lastRewardedHour) {
                lastRewardedHour = currentHour;
                this.entities.forEach((entity, sessionId) => {
                    const spots = entity.ai?.routineSpots || entity.tempSpots;
                    if (spots) {
                        const pos = entity.body?.translation();
                        if (pos) {
                            let target = spots.sleep;
                            if (currentHour >= 7 && currentHour < 8)
                                target = spots.eat;
                            else if (currentHour >= 8 && currentHour < 10)
                                target = spots.class;
                            else if (currentHour >= 19 && currentHour < 21)
                                target = spots.eat;
                            else if (currentHour >= 17 && currentHour < 19)
                                target = spots.class;
                            if (Math.sqrt((target.x - pos.x) ** 2 + (target.y - pos.y) ** 2) < 50) {
                                this.prestigeSystem.addPrestige(sessionId, 5);
                            }
                        }
                    }
                });
            }
            (0, MovementSystem_1.MovementSystem)(this.world);
            this.duelSystem.update();
            (0, AISystem_1.AISystem)(this.world, this.physicsWorld, deltaTime, currentHour, this.pathfinder, (id, spell, vx, vy) => this.handleCast(id, spell, vx, vy), (id) => {
                const p = this.state.players.get(id);
                return p ? { x: p.x, y: p.y } : null;
            });
            this.spellSystem.update(deltaTime);
            this.itemSystem.update(deltaTime);
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
            // ... (stats) ...
        });
        this.onMessage("move", (client, input) => {
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
            this.handleCast(client.sessionId, data.spellId, data.vx, data.vy);
        });
        this.onMessage("collect", (client, itemId) => {
            this.itemSystem.tryCollectItem(client.sessionId, itemId);
        });
        this.onMessage("ping", (client, timestamp) => {
            client.send("pong", timestamp);
        });
        this.onMessage("chat", (client, text) => {
            const player = this.state.players.get(client.sessionId);
            if (player && text) {
                const msg = new SchemaDef_1.ChatMessage();
                msg.sender = player.username;
                msg.text = text.slice(0, Config_1.CONFIG.CHAT_MAX_LENGTH);
                msg.timestamp = Date.now();
                this.state.messages.push(msg);
                this.broadcast("chat", msg);
                if (this.state.messages.length > Config_1.CONFIG.CHAT_HISTORY_SIZE) {
                    this.state.messages.shift();
                }
                console.log(`[CHAT] ${msg.sender}: ${msg.text}`);
            }
        });
    }
    handleCast(sessionId, spellId, vx, vy) {
        const entity = this.entities.get(sessionId);
        if (!entity || !entity.body)
            return;
        const spellConfig = SpellRegistry_1.SPELL_REGISTRY[spellId];
        if (!spellConfig)
            return;
        const now = Date.now();
        const lastCast = this.lastCastTimes.get(sessionId) || 0;
        if (now - lastCast < spellConfig.cooldown)
            return;
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
        proj.maxRange = 600;
        this.state.projectiles.set(id, proj);
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
            playerState.personalPrestige = carriedPrestige + (session.dbPlayer.prestige || 0); // Add stored prestige? 
            // Warning: Double counting if echoed prestige is stored? 
            // Echo prestige is transient session prestige. DB prestige is permanent.
            // Let's assume DB prestige overwrites/is the source of truth for now.
            playerState.personalPrestige = session.dbPlayer.prestige || 0;
            playerState.house = house || 'ignis';
            // Hydrate Inventory (Universal + Legacy Cards)
            if (session.dbPlayer.inventory) {
                session.dbPlayer.inventory.forEach((dbItem) => {
                    // 1. Universal Inventory
                    const invItem = new SchemaDef_1.InventoryItem();
                    invItem.itemId = dbItem.itemId;
                    invItem.qty = dbItem.count;
                    playerState.inventory.push(invItem);
                    // 2. Legacy Card Support (for Album UI)
                    if (dbItem.itemId.startsWith("card_")) {
                        const cardId = parseInt(dbItem.itemId.split("_")[1]);
                        if (!isNaN(cardId))
                            playerState.cardCollection.push(cardId);
                    }
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
            echoState.username = `${house.charAt(0).toUpperCase() + house.slice(1)} Student`;
            echoState.x = entity.body.translation().x;
            echoState.y = entity.body.translation().y;
            echoState.skin = oldState?.skin || "player_idle";
            echoState.personalPrestige = oldState?.personalPrestige || 0; // RESTORE POINTS TO ECHO
            echoState.house = house || 'ignis';
            this.state.players.set(slotId, echoState);
        }
        this.state.players.delete(client.sessionId);
        this.playerDbIds.delete(client.sessionId);
    }
}
exports.WorldRoom = WorldRoom;
