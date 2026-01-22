import 'reflect-metadata';
import 'reflect-metadata';
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { CONFIG } from "./Config";

export class InventoryItem extends Schema {
    @type("string") itemId: string = "";
    @type("number") qty: number = 1;
}

export class Player extends Schema {
    @type("string") id: string = "";
    @type("string") username: string = "Guest";
    @type("string") house: string = "ignis"; // Default to ignis or empty
    @type("float32") x: number = 0;
    @type("float32") y: number = 0;
    @type("string") skin: string = "player_idle";
    
    @type("number") personalPrestige: number = 0;
    @type("number") gold: number = 0;
    @type("number") xp: number = 0; // Global Experience (Classes + Alignment)
    @type("number") academicPoints: number = 0; // PA (School Grades)
    @type("number") alignment: number = 0; // -100 to 100

    // Duel Stats
    @type("number") duelScore: number = 0;
    @type("boolean") inDuel: boolean = false;
    @type("number") unconsciousUntil: number = 0; // Timestamp for waking up

    // Universal Inventory (String IDs)
    @type([ InventoryItem ]) inventory = new ArraySchema<InventoryItem>();

    // Class / Activity State
    @type("boolean") isAttendingClass: boolean = false;
    @type("number") classEndsAt: number = 0; // Timestamp when class finishes
    
    // Discipline
    @type("number") detentionWork: number = 0; // Remaining 'work units' to be free
    @type("number") currentOffenseLevel: number = 1; // 1 (Curfew), 2 (Magic), 3 (Assault)
    
    // Verticality
    @type("boolean") isSleepingUpstairs: boolean = false;

    // Dev / God Mode
    @type("boolean") isGhost: boolean = false;
}

export class WorldItem extends Schema {
    @type("string") id: string = "";
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("string") type: string = "card"; // 'card', 'resource', etc.
    @type("string") itemId: string = "";   // New String ID (e.g. "potion_small")
}

export class ChatMessage extends Schema {
    @type("string") sender: string = "";
    @type("string") senderId: string = ""; // Session ID for Bubble Chat
    @type("string") text: string = "";
    @type("number") timestamp: number = 0;
}

export class Projectile extends Schema {
    // Rebuild Trigger
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
    @type({ map: WorldItem }) items = new MapSchema<WorldItem>();
    @type([ ChatMessage ]) messages = new ArraySchema<ChatMessage>();
    @type("number") worldStartTime: number = 0; 
    @type("number") timeOffset: number = 0;
    
    // Authoritative House Points
    @type("number") ignisPoints: number = 0;
    @type("number") axiomPoints: number = 0;
    @type("number") vesperPoints: number = 0;

    // Academic Date
    @type("number") currentCourse: number = 1;
    @type("number") currentDay: number = 1;
    @type("string") currentMonth: string = "November";
}