import { Schema, type, MapSchema, ArraySchema, view } from "@colyseus/schema";
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

    // Equipment
    @type("string") weapon: string = "";
    @type("string") armor: string = "";

    // Stats
    @type("number") hp: number = 100;
    @type("number") maxHp: number = 100;

    // Inventory
    @type([ InventoryItem ]) inventory = new ArraySchema<InventoryItem>();
}

export class GameState extends Schema {
    @view()
    @type({ map: Player }) players = new MapSchema<Player>();
}