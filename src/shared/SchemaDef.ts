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
}

export class ChatMessage extends Schema {
    @type("string") sender: string = "";
    @type("string") text: string = "";
    @type("number") timestamp: number = 0;
}

export class GameState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
    @type([ ChatMessage ]) messages = new ArraySchema<ChatMessage>();
    @type("number") worldStartTime: number = 0; // Timestamp when the world timer started (t=0)
}