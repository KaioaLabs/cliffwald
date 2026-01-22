import RAPIER from "@dimforge/rapier2d-compat";
import { GameState } from "../../shared/SchemaDef";
import { CONFIG } from "../../shared/Config";
import { Entity } from "../../shared/ecs/components";
import { LevelRegistry } from "./LevelRegistry";
import { MapData, buildPhysics, parseEntities, parseLogic } from "../../shared/MapParser";
import * as fs from "fs/promises";
import path from "path";

export class PhysicsManager {
    public world: RAPIER.World;
    public eventQueue: RAPIER.EventQueue;
    private state: GameState;
    private entities: Map<string, Entity>;
    
    // Zone Logic
    private zoneSensors: Map<number, string> = new Map(); // ColliderHandle -> ZoneName
    private playerZones: Map<string, string> = new Map(); // SessionId -> CurrentZoneName
    public onZoneEnter?: (sessionId: string, zoneName: string) => void;

    public getPlayerZone(sessionId: string): string | undefined {
        return this.playerZones.get(sessionId);
    }

    // Sync Optimization
    private syncTimer = 0;

    constructor(state: GameState, entities: Map<string, Entity>) {
        this.state = state;
        this.entities = entities;
        
        const gravity = { x: 0.0, y: 0.0 };
        this.world = new RAPIER.World(gravity);
        this.eventQueue = new RAPIER.EventQueue(true);
    }

    public async loadMap(mapPath: string): Promise<{ 
        spawnPos: {x: number, y: number}, 
        prefectSpawns: {x: number, y: number, name?: string}[], 
        merchantSpawns: {x: number, y: number, name?: string}[],
        mapData: MapData, 
        navGrids: Map<number, number[][]> 
    }> {
        const mapFile = await fs.readFile(mapPath, "utf-8");
        const mapData = JSON.parse(mapFile) as MapData;
        
        const result = buildPhysics(this.world, mapData);
        const entitiesResult = parseEntities(mapData);
        const logicData = parseLogic(mapData);

        LevelRegistry.getInstance().setData(logicData);
        
        // Setup Zone Sensors
        this.setupZoneSensors(logicData);
        
        return { 
            spawnPos: entitiesResult.spawnPos, 
            prefectSpawns: entitiesResult.prefectSpawns || [],
            merchantSpawns: entitiesResult.merchantSpawns || [],
            mapData, 
            navGrids: result.navGrids 
        };
    }

    private setupZoneSensors(logic: any) {
        logic.locations.forEach((loc: any, key: string) => {
            // Only create sensors for areas with dimensions (Rectangles)
            // Points are just navigation targets.
            if (loc.width > 0 && loc.height > 0) {
                const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(loc.x, loc.y);
                const body = this.world.createRigidBody(bodyDesc);
                
                const colliderDesc = RAPIER.ColliderDesc.cuboid(loc.width / 2, loc.height / 2);
                colliderDesc.setSensor(true);
                colliderDesc.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
                
                // Sensor groups
                const groups = (CONFIG.COLLISION_GROUPS.SENSOR << 16) | CONFIG.COLLISION_GROUPS.PLAYER;
                colliderDesc.setCollisionGroups(groups);

                const collider = this.world.createCollider(colliderDesc, body);
                
                this.zoneSensors.set(collider.handle, key); // Key e.g. "CLASSROOM"
                console.log(`[PHYSICS] Created Zone Sensor for ${key} at ${loc.x},${loc.y} size ${loc.width}x${loc.height}`);
            }
        });
    }

    public update(deltaTime: number) {
        this.world.step(this.eventQueue);
        
        // Process Events
        this.eventQueue.drainCollisionEvents((handle1, handle2, started) => {
            if (!started) return;

            // Check if one is a sensor and other is a player
            const zoneName1 = this.zoneSensors.get(handle1);
            const zoneName2 = this.zoneSensors.get(handle2);
            
            // Handle Zones
            if (zoneName1 || zoneName2) {
                const zoneName = zoneName1 || zoneName2;
                const otherHandle = zoneName1 ? handle2 : handle1;
                const otherCollider = this.world.getCollider(otherHandle);
                const parent = otherCollider?.parent();
                
                if (parent) {
                    const userData = parent.userData as any;
                    if (userData && userData.sessionId) {
                        this.handleZoneEntry(userData.sessionId, zoneName!);
                    }
                }
            }
        });

        this.syncTimer += deltaTime;
        if (this.syncTimer >= CONFIG.NETWORK.SYNC_RATE) {
            this.syncTimer = 0;
            this.syncState();
        }
    }

    private handleZoneEntry(sessionId: string, zoneName: string) {
        const current = this.playerZones.get(sessionId);
        if (current !== zoneName) {
            this.playerZones.set(sessionId, zoneName);
            if (this.onZoneEnter) {
                this.onZoneEnter(sessionId, zoneName);
            }
        }
    }

    private syncState() {
        this.entities.forEach((entity, sessionId) => {
            if (entity.body) {
                const pos = entity.body.translation();
                const playerState = this.state.players.get(sessionId);
                
                if (playerState) {
                    const newX = Math.round(pos.x * 100) / 100;
                    const newY = Math.round(pos.y * 100) / 100;
                    
                    if (playerState.x !== newX || playerState.y !== newY) {
                        playerState.x = newX;
                        playerState.y = newY;
                    }
                }
            }
        });
    }
    
    public dispose() {
        // Rapier managed by JS GC mostly, but good practice to clear if binding was manually managed
    }

    public clearStaticBodies() {
        const bodiesToRemove: RAPIER.RigidBody[] = [];
        this.world.forEachRigidBody((body) => {
            const userData = body.userData as any;
            if (userData && userData.type === 'static_wall') {
                bodiesToRemove.push(body);
            }
        });
        
        bodiesToRemove.forEach(b => this.world.removeRigidBody(b));
        console.log(`[PHYSICS] Cleared ${bodiesToRemove.length} static bodies.`);
    }

    public setPlayerGhostMode(sessionId: string, isGhost: boolean) {
        const entity = this.entities.get(sessionId);
        if (entity && entity.body) {
            const collider = entity.body.collider(0); // Assuming 1 collider per player
            if (collider) {
                if (isGhost) {
                    // Ghost Group: Hits NOTHING (or only Sensors/Zones if we want zone triggers)
                    // Let's allow Sensors so we can test Zone Logic in God Mode
                    const groups = (CONFIG.COLLISION_GROUPS.GHOST << 16) | CONFIG.COLLISION_GROUPS.SENSOR;
                    collider.setCollisionGroups(groups);
                } else {
                    // Restore Normal Player Group
                    const groups = (CONFIG.COLLISION_GROUPS.PLAYER << 16) | CONFIG.COLLISION_GROUPS.PLAYER_MASK;
                    collider.setCollisionGroups(groups);
                }
            }
        }
    }
}
