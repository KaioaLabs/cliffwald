import { Room, Client } from "colyseus";
import { GameState, ChatMessage } from "../../shared/SchemaDef";
import { CONFIG, getGameTime } from "../../shared/Config";
import { timeManager } from "../../shared/managers/TimeManager";
import { getStudentScheduleTarget } from "../../shared/utils/ScheduleUtils";

export class ChatManager {
    private room: Room<GameState>;

    constructor(room: Room<GameState>) {
        this.room = room;
    }

    private badWords = [
        "trash", "idiot", "stupid", "sucks", "noob", "diff", "gap", "inting", 
        "griefing", "scam", "bot", "dog", "cancer", "kys", "die"
    ];

    private filterText(text: string): string {
        let cleanText = text;
        this.badWords.forEach(word => {
            // Regex for case-insensitive whole word match
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            cleanText = cleanText.replace(regex, '*'.repeat(word.length));
        });
        return cleanText;
    }

    public handleChat(clientSessionId: string, text: string) {
        const player = this.room.state.players.get(clientSessionId);
        
        // Log request even if player not found (security audit)
        console.log(`[SERVER] Chat request from ${clientSessionId}. Player found: ${!!player}. Text: "${text}"`);

        if (!player || !text) return;

        let cleanText = text.slice(0, CONFIG.CHAT.MAX_LENGTH);
        
        // --- PROFANITY FILTER ---
        cleanText = this.filterText(cleanText);

        // --- COMMAND PARSING ---
        if (cleanText.startsWith('/')) {
            const parts = cleanText.split(' ');
            const command = parts[0].toLowerCase();

            // 1. /time [set/add/reset/check]
            if (command === '/time') {
                const subCmd = parts[1];
                const arg = parts[2];

                if (subCmd === 'set' && arg) {
                    const hour = parseInt(arg);
                    if (!isNaN(hour)) {
                        timeManager.setGameHour(hour);
                        this.broadcastSystemMessage(`Time Travel: Jumped to ${hour}:00 (Triggered by ${player.username})`);
                        
                        // FORCE TELEPORT LOGIC
                        const worldRoom = this.room as any; 
                        if (worldRoom.entities) {
                            let teleportCount = 0;
                            for (const [id, entity] of worldRoom.entities) {
                                if (entity.ai && entity.body && entity.ai.routineSpots) {
                                    const isPlayer = entity.player?.sessionId?.startsWith('sess_');
                                    if (!isPlayer) {
                                         const numericId = typeof entity.id === 'number' ? entity.id : (parseInt(entity.id || "0") || 0);
                                         const schedule = getStudentScheduleTarget(numericId, hour, entity.ai.routineSpots);
                                         entity.body.setTranslation(schedule.pos, true);
                                         entity.ai.state = 'idle'; 
                                         entity.ai.timer = 0;
                                         teleportCount++;
                                    }
                                }
                            }
                            console.log(`[TIME] Teleported ${teleportCount} NPCs.`);
                        }
                        return; 
                    }
                }
                
                if (subCmd === 'add' && arg) {
                     const mins = parseInt(arg);
                     if (!isNaN(mins)) {
                         timeManager.addTime(mins);
                         this.broadcastSystemMessage(`Time Warp: Shifted +${mins}m (Triggered by ${player.username})`);
                         return;
                     }
                }

                if (subCmd === 'reset') {
                    timeManager.reset();
                    this.broadcastSystemMessage(`Time Sync: Clock synchronized to reality by ${player.username}`);
                    return;
                }
                
                if (subCmd === 'check') {
                     const now = timeManager.getNow();
                     const gt = getGameTime(now);
                     const senderClient = this.room.clients.getById(clientSessionId);
                     if (senderClient) {
                         const msg = new ChatMessage();
                         msg.sender = "CHRONOS";
                         msg.text = `Current Game Time: ${gt.hour}:${gt.minute.toString().padStart(2, '0')} (Night: ${gt.isNight})`;
                         msg.timestamp = Date.now();
                         senderClient.send("chat", msg);
                     }
                     return;
                }
            }

            // 2. /tp [x] [y]
            if (command === '/tp') {
                const x = parseInt(parts[1]);
                const y = parseInt(parts[2]);
                
                if (!isNaN(x) && !isNaN(y)) {
                    const worldRoom = this.room as any;
                    const entity = worldRoom.entities.get(clientSessionId);
                    
                    if (entity && entity.body) {
                        entity.body.setTranslation({ x, y }, true);
                        
                        // Force state update immediately for rapid feedback
                        const pState = this.room.state.players.get(clientSessionId);
                        if (pState) {
                            pState.x = x;
                            pState.y = y;
                        }

                        this.broadcastSystemMessage(`${player.username} teleported to ${x}, ${y}`);
                    }
                    return;
                }
            }
        }
        // ----------------------

        const msg = new ChatMessage();
        msg.sender = player.username;
        msg.timestamp = Date.now();

        // 1. Determine Channel
        let channel = 'local';
        
        if (cleanText.startsWith('/g ')) {
            channel = 'global';
            cleanText = cleanText.substring(3);
        } else if (cleanText.startsWith('/h ')) {
            channel = 'house';
            cleanText = cleanText.substring(3);
        }

        msg.text = cleanText;

        // 2. Format Sender Name (Visual Cue)
        if (channel === 'global') msg.sender = `[G] ${player.username}`;
        if (channel === 'house') msg.sender = `[${player.house.toUpperCase()}] ${player.username}`;

        // 3. Distribution Logic
        if (channel === 'global') {
            this.room.broadcast("chat", msg);
        } else if (channel === 'house') {
            this.room.clients.forEach(client => {
                const targetPlayer = this.room.state.players.get(client.sessionId);
                if (targetPlayer && targetPlayer.house === player.house) {
                    client.send("chat", msg);
                }
            });
        } else {
            // LOCAL (Default) - AOI Check
            // Always send to sender
            const senderClient = this.room.clients.getById(clientSessionId);
            if (senderClient) senderClient.send("chat", msg);

            this.room.clients.forEach(client => {
                if (client.sessionId === clientSessionId) return; // Already sent
                
                const targetPlayer = this.room.state.players.get(client.sessionId);
                if (targetPlayer) {
                    const distSq = (player.x - targetPlayer.x)**2 + (player.y - targetPlayer.y)**2;
                    if (distSq <= CONFIG.CHAT.LOCAL_RADIUS_SQ) {
                        client.send("chat", msg);
                    }
                }
            });
        }

        // 4. Persistence (Only Global/House? Or All?)
        // Let's persist all for now in history, but marked.
        this.room.state.messages.push(msg);
        if (this.room.state.messages.length > CONFIG.CHAT.HISTORY_SIZE) {
            this.room.state.messages.shift();
        }

        console.log(`[CHAT:${channel.toUpperCase()}] ${msg.sender}: ${msg.text}`);
    }

    public broadcastSystemMessage(text: string, sender: string = "SYSTEM") {
        const msg = new ChatMessage();
        msg.sender = sender;
        msg.text = text;
        msg.timestamp = Date.now();
        
        this.room.state.messages.push(msg);
        this.room.broadcast("chat", msg);
    }
}