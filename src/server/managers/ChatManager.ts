import { Room, Client } from "colyseus";
import { GameState, ChatMessage } from "../../shared/SchemaDef";
import { CONFIG } from "../../shared/Config";

export class ChatManager {
    private room: Room<GameState>;

    constructor(room: Room<GameState>) {
        this.room = room;
    }

    public handleChat(clientSessionId: string, text: string) {
        const player = this.room.state.players.get(clientSessionId);
        
        // Log request even if player not found (security audit)
        console.log(`[SERVER] Chat request from ${clientSessionId}. Player found: ${!!player}. Text: "${text}"`);

        if (!player || !text) return;

        let cleanText = text.slice(0, CONFIG.CHAT.MAX_LENGTH);
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