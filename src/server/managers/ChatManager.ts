import { Room } from "colyseus";
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

        if (player && text) {
            const cleanText = text.slice(0, CONFIG.CHAT_MAX_LENGTH);
            
            const msg = new ChatMessage();
            msg.sender = player.username;
            msg.text = cleanText;
            msg.timestamp = Date.now();

            this.room.state.messages.push(msg);
            
            // Broadcast to all clients
            this.room.broadcast("chat", msg);

            // Maintain history size
            if (this.room.state.messages.length > CONFIG.CHAT_HISTORY_SIZE) {
                this.room.state.messages.shift();
            }

            console.log(`[CHAT] ${msg.sender}: ${msg.text}`);
        } else {
            console.warn(`[SERVER] Chat ignored. Player: ${player ? player.username : 'Unknown'}, Text: ${text}`);
        }
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