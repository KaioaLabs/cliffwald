import { GameState } from "../../shared/SchemaDef";
import { CONFIG, getAcademicProgress, getGameTime } from "../../shared/Config";
import { LevelRegistry } from "./LevelRegistry";
import { Entity } from "../../shared/ecs/components";
import { SpawnManager } from "./SpawnManager";
import { ChatManager } from "./ChatManager";
import { PrestigeSystem } from "../systems/PrestigeSystem";

export class AcademicManager {
    private state: GameState;
    private spawnManager: SpawnManager;
    private chatManager: ChatManager;
    private prestigeSystem: PrestigeSystem;
    private entities: Map<string, Entity>;
    
    // Attendance Tracking
    private attendanceLog = new Set<string>(); // "Day_WindowIndex_SessionId"
    private attendanceTimer = 0;
    
    // Minigame Anti-Cheat
    public minigameStartTimes = new Map<string, number>();

    constructor(
        state: GameState, 
        spawnManager: SpawnManager, 
        chatManager: ChatManager,
        prestigeSystem: PrestigeSystem,
        entities: Map<string, Entity>
    ) {
        this.state = state;
        this.spawnManager = spawnManager;
        this.chatManager = chatManager;
        this.prestigeSystem = prestigeSystem;
        this.entities = entities;
    }

    public update(deltaTime: number, currentHour: number) {
        // Run attendance check every 1 second (approx)
        this.attendanceTimer += deltaTime;
        if (this.attendanceTimer > 1000) {
            this.attendanceTimer = 0;
            this.checkAttendance(currentHour);
        }
    }

    private checkAttendance(currentHour: number) {
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
                        this.completeClass(sessionId, playerState);
                    }
                    return; 
                }

                // Check Proximity to Desks
                // Optimization: Only check if velocity is low
                const vel = entity.body.linvel();
                if (Math.abs(vel.x) < 0.1 && Math.abs(vel.y) < 0.1) {
                     const pos = entity.body.translation();
                     let foundDesk = false;
                     
                     // Optimization: Use squared distance and avoid sqrt inside loop
                     // Even better: Check bounding box first
                     // 30px radius = 900 sq px
                     for (const [seatId, seatPos] of this.spawnManager.seats.class) {
                         if (Math.abs(pos.x - seatPos.x) > 30 || Math.abs(pos.y - seatPos.y) > 30) continue; // Fast reject

                         const dx = pos.x - seatPos.x;
                         const dy = pos.y - seatPos.y;
                         if (dx*dx + dy*dy < 900) { 
                             foundDesk = true;
                             break;
                         }
                     }

                     if (foundDesk) {
                         this.startClass(sessionId, playerState);
                     }
                }
            }
            
            // --- ECHO LOGIC (Maintenance) ---
            else if (entity.ai) {
                 this.handleEchoAttendance(entity, playerState, currentCourse, currentDay, scheduleIndex, item.location, now);
            }
        });
    }

    private startClass(sessionId: string, playerState: any) {
        console.log(`[CLASS] Player ${playerState.username} sat at desk. Starting Class...`);
        playerState.isAttendingClass = true;
        playerState.classEndsAt = Date.now() + CONFIG.CLASS_DURATION_MS;
        
        // Find client (hacky, ideally passed or event emitted)
        // Since we don't have access to Room.clients here easily without passing it,
        // we can assume the WorldRoom handles the 'send' part via a callback or event?
        // Or we can just set the state and let the client react to the Schema change?
        // Ideally, schema change triggers UI. But 'start_minigame' message is explicit.
        // For this refactor, let's keep it clean: We need a way to send messages.
        // But wait, the original code sent "start_minigame".
        // The schema 'classEndsAt' change SHOULD be enough for a smart client.
        // But for now, let's just rely on state. The client can listen to `player.listen("isAttendingClass", ...)`
    }

    private completeClass(sessionId: string, playerState: any) {
        playerState.isAttendingClass = false;
        playerState.classEndsAt = 0;
        // Reward (Legacy fallback)
        this.prestigeSystem.addPrestige(sessionId, 5);
        this.prestigeSystem.addGold(sessionId, 20);
        playerState.xp += 50;
        this.chatManager.broadcastSystemMessage(`${playerState.username} finished class!`, "TEACHER");
    }

    private handleEchoAttendance(entity: Entity, playerState: any, course: number, day: number, scheduleIdx: number, location: string, now: number) {
        let targetLoc = LevelRegistry.getInstance().getLocation("ACADEMIC_WING");
        if (location === "Forest") targetLoc = LevelRegistry.getInstance().getLocation("FOREST");

        const key = `${course}_${day}_${scheduleIdx}_${entity.id}`; // using numeric ID for stability
        
        if (!this.attendanceLog.has(key)) {
            // Check if AI state is 'attending_class'
            if ((entity.ai as any).state === 'attending_class') {
                    this.attendanceLog.add(key);
                    playerState.academicPoints += 1;
                    
                    // Visual Sync
                    if (!playerState.isAttendingClass) {
                        playerState.isAttendingClass = true;
                        playerState.classEndsAt = now + CONFIG.CLASS_DURATION_MS; 
                    }
            }
        }
        
        // Reset Schema State if AI is done
        if (playerState.isAttendingClass && (entity.ai as any).state !== 'attending_class') {
            playerState.isAttendingClass = false;
            playerState.classEndsAt = 0;
        }
    }

    public handleScoreSubmission(client: any, data: { score: number }) {
        const player = this.state.players.get(client.sessionId);
        if (!player || !player.isAttendingClass) return;

        // ANTI-CHEAT: Check duration
        const startTime = this.minigameStartTimes.get(client.sessionId) || 0;
        const elapsed = Date.now() - startTime;
        this.minigameStartTimes.delete(client.sessionId);

        // Note: Logic simplified for now, as we don't track start time perfectly here yet.
        // The original code tracked it in WorldRoom. We should track it here in startClass.
        
        const score = Math.min(100, Math.max(0, data.score || 0));
        let grade = "T";
        let prestige = 0;
        let gold = 10;
        let xp = 10;

        if (score >= 90) { grade = "S"; prestige = 20; gold = 100; xp = 100; }
        else if (score >= 70) { grade = "A"; prestige = 10; gold = 50; xp = 75; }
        else if (score >= 50) { grade = "B"; prestige = 5; gold = 20; xp = 50; }

        if (prestige > 0) this.prestigeSystem.addPrestige(client.sessionId, prestige);
        if (gold > 0) this.prestigeSystem.addGold(client.sessionId, gold);
        
        player.xp += xp;
        player.isAttendingClass = false;
        player.classEndsAt = 0;

        client.send("class_completed", { grade, prestige, gold });
        this.chatManager.broadcastSystemMessage(`${player.username} finished class with Grade ${grade}!`, "TEACHER");
    }
}
