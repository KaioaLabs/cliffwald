import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

export class InventoryItem extends Schema {
    @type("string") itemId: string = "";
    @type("number") count: number = 0;
}

export class Player extends Schema {
    @type("string") id: string = "";
    @type("number") x: number = 0;
    @type("number") y: number = 0;

    // Stats
    @type("number") hp: number = 100;
    @type("number") maxHp: number = 100;

    // Inventory
    @type([ InventoryItem ]) inventory = new ArraySchema<InventoryItem>();
}

export class GameState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
}