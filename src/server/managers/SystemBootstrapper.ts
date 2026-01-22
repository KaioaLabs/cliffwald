import { WorldRoom } from "../WorldRoom";
import { ChatManager } from "../managers/ChatManager";
import { PhysicsManager } from "../managers/PhysicsManager";
import { PersistenceSystem } from "../systems/PersistenceSystem";
import { PrestigeSystem } from "../systems/PrestigeSystem";
import { ItemSystem } from "../systems/ItemSystem";
import { ShopSystem } from "../systems/ShopSystem";
import { SpellSystem } from "../systems/SpellSystem";
import { DuelSystem } from "../systems/DuelSystem";
import { HealthSystem } from "../systems/HealthSystem";
import { SpawnManager } from "../managers/SpawnManager";
import { AcademicManager } from "../managers/AcademicManager";
import { GameLoopManager } from "../managers/GameLoopManager";

export interface GameSystems {
    chatManager: ChatManager;
    physicsManager: PhysicsManager;
    persistenceSystem: PersistenceSystem;
    prestigeSystem: PrestigeSystem;
    itemSystem: ItemSystem;
    shopSystem: ShopSystem;
    spellSystem: SpellSystem;
    duelSystem: DuelSystem;
    healthSystem: HealthSystem;
    spawnManager: SpawnManager;
    academicManager: AcademicManager;
    gameLoopManager: GameLoopManager;
}

export class SystemBootstrapper {
    static initialize(room: WorldRoom): GameSystems {
        console.log("[BOOT] Initializing Game Systems...");

        // 1. Core Systems (Low Level)
        const chatManager = new ChatManager(room);
        const physicsManager = new PhysicsManager(room.state, room.entities);
        const persistenceSystem = new PersistenceSystem(room.entities, room.state);

        // 2. Gameplay Systems (Dependent on Core)
        const prestigeSystem = new PrestigeSystem(room);
        const itemSystem = new ItemSystem(room);
        const shopSystem = new ShopSystem(room);
        const spellSystem = new SpellSystem(room);
        const duelSystem = new DuelSystem(room);
        const healthSystem = new HealthSystem(room);
        
        // 3. Complex Managers (Dependent on Physics/ECS)
        const spawnManager = new SpawnManager(room.world, physicsManager.world, room.state, room.entities);
        const academicManager = new AcademicManager(room.state, spawnManager, chatManager, prestigeSystem, room.entities);
        
        // 4. The Loop (Dependent on everything)
        const gameLoopManager = new GameLoopManager(room);

        console.log("[BOOT] Systems Initialized.");

        return {
            chatManager,
            physicsManager,
            persistenceSystem,
            prestigeSystem,
            itemSystem,
            shopSystem,
            spellSystem,
            duelSystem,
            healthSystem,
            spawnManager,
            academicManager,
            gameLoopManager
        };
    }
}
