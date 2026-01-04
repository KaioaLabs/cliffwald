import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { CONFIG } from "./Config";

export class Player extends Schema {
    @type("string") id: string = "";
    @type("string") username: string = "Guest";
    @type("string") skin: string = "player_idle";
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") vx: number = 0;
    @type("number") vy: number = 0;
    
    // Prestige Balance
    @type("number") personalPrestige: number = 0;
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
    @type("number") creationTime: number = 0;
    @type("number") maxRange: number = 600;
}

export class GameState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
    @type({ map: Projectile }) projectiles = new MapSchema<Projectile>();
    @type([ ChatMessage ]) messages = new ArraySchema<ChatMessage>();
    @type("number") worldStartTime: number = 0; 
    
    // Authoritative House Points
    @type("number") ignisPoints: number = 0;
    @type("number") axiomPoints: number = 0;
    @type("number") vesperPoints: number = 0;

    // Academic Date
    @type("number") currentCourse: number = 1;
    @type("string") currentMonth: string = "November";
}