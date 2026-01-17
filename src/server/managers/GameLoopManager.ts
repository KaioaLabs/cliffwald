import { WorldRoom } from "../WorldRoom";
import { getGameTime, getAcademicProgress, CONFIG } from "../../shared/Config";
import { timeManager } from "../../shared/managers/TimeManager";
import { MovementSystem } from "../../shared/systems/MovementSystem";
import { AISystem } from "../../shared/systems/AISystem";

export class GameLoopManager {
    private room: WorldRoom;
    private lastLogHour: number = -1;

    constructor(room: WorldRoom) {
        this.room = room;
    }

    public update(deltaTime: number) {
        const now = timeManager.getNow();
        
        // 1. Time Sync
        if (this.room.state.timeOffset !== timeManager.getOffset()) {
            this.room.state.timeOffset = timeManager.getOffset();
        }

        const { hour: currentHour, isNight } = getGameTime(now);
        
        // 2. Lifecycle Updates
        this.room.spawnManager.checkPrefectSpawns(isNight);
        
        if (Math.abs(currentHour - this.lastLogHour) > 0.1) {
            this.lastLogHour = currentHour;
        }
        
        const { currentCourse, currentMonth, currentDay } = getAcademicProgress(this.room.state.worldStartTime, now);
        
        if (this.room.state.currentMonth !== currentMonth) this.room.state.currentMonth = currentMonth;
        if (this.room.state.currentDay !== currentDay) this.room.state.currentDay = currentDay;

        // Graduation Check
        if (this.room.state.currentCourse < currentCourse) {
            this.room.handleGraduation(currentCourse);
        }
        
        // 3. System Updates
        MovementSystem(this.room.world);
        
        this.room.duelSystem.update();
        this.room.physicsManager.update(deltaTime); 
        this.room.academicManager.update(deltaTime, currentHour); 
        
        // AI Logic
        AISystem(
            this.room.world, 
            this.room.physicsManager.world, 
            deltaTime, 
            currentHour, 
            this.room.pathfinder,
            (id, spell, vx, vy) => this.room.handleCast(id, spell, vx, vy),
            (id) => {
                const p = this.room.state.players.get(id);
                return p ? { x: p.x, y: p.y } : null;
            },
            (sessionId) => 0, // Floor Provider (Always 0)
            (id, text) => this.room.chatManager.handleChat(id, text), // Chat Provider
            (id) => this.room.broadcast("player_jump", { id }), // Jump Callback
            (prefectId, victimId) => this.room.sendToDetention(victimId) // Catch Callback
        );
        
        this.room.spellSystem.update(deltaTime);
        this.room.itemSystem.update(deltaTime);
        this.room.healthSystem.update();
    }
}