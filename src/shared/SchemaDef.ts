import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { CONFIG } from "./Config";

export class InventoryItem extends Schema {
    @type("string") itemId: string = "";
    @type("number") count: number = 0;
}

export class Player extends Schema {
    @type("string") id: string = "";
    @type("string") username: string = "Guest";
    @type("string") skin: string = "player_idle";
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") vx: number = 0;
    @type("number") vy: number = 0;

    // Equipment
    @type("string") weapon: string = "";
    @type("string") armor: string = "";

    // Stats
    @type("number") hp: number = 100;
    @type("number") maxHp: number = 100;

    // Inventory
    @type([ InventoryItem ]) inventory = new ArraySchema<InventoryItem>();
}

export class ChatMessage extends Schema {
    @type("string") sender: string = "";
    @type("string") text: string = "";
    @type("number") timestamp: number = 0;
}

export class Projectile extends Schema {
    @type("string") id: string = "";
    @type("string") spellId: string = "";
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") vx: number = 0;
    @type("number") vy: number = 0;
    @type("string") ownerId: string = "";
    
    // Cleanup metadata
    @type("number") startX: number = 0;
    @type("number") startY: number = 0;
    @type("number") maxRange: number = 600;
    @type("number") creationTime: number = 0;
}

export class GameState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
    @type({ map: Projectile }) projectiles = new MapSchema<Projectile>();
    @type([ ChatMessage ]) messages = new ArraySchema<ChatMessage>();
    @type("number") worldStartTime: number = 0; // Timestamp when the world timer started (t=0)
}