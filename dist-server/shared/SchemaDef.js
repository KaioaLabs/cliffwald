"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameState = exports.Projectile = exports.ChatMessage = exports.WorldItem = exports.Player = exports.InventoryItem = void 0;
const schema_1 = require("@colyseus/schema");
class InventoryItem extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.itemId = "";
        this.qty = 1;
    }
}
exports.InventoryItem = InventoryItem;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], InventoryItem.prototype, "itemId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], InventoryItem.prototype, "qty", void 0);
class Player extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.username = "Guest";
        this.house = "ignis"; // Default to ignis or empty
        this.skin = "player_idle";
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        // Prestige Balance
        this.personalPrestige = 0;
        // Duel Stats
        this.duelScore = 0;
        this.inDuel = false;
        // Legacy: Numeric Card IDs (Deprecated)
        this.cardCollection = new schema_1.ArraySchema();
        // Universal Inventory (String IDs)
        this.inventory = new schema_1.ArraySchema();
    }
}
exports.Player = Player;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "username", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "house", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "skin", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "vx", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "vy", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "personalPrestige", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "duelScore", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Player.prototype, "inDuel", void 0);
__decorate([
    (0, schema_1.type)(["number"]),
    __metadata("design:type", Object)
], Player.prototype, "cardCollection", void 0);
__decorate([
    (0, schema_1.type)([InventoryItem]),
    __metadata("design:type", Object)
], Player.prototype, "inventory", void 0);
class WorldItem extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.id = "";
        this.x = 0;
        this.y = 0;
        this.type = "card"; // 'card', 'resource', etc.
        this.itemId = ""; // New String ID (e.g. "potion_small")
        this.dataId = 0; // Legacy Numeric ID (Deprecated)
    }
}
exports.WorldItem = WorldItem;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], WorldItem.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], WorldItem.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], WorldItem.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], WorldItem.prototype, "type", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], WorldItem.prototype, "itemId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], WorldItem.prototype, "dataId", void 0);
class ChatMessage extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.sender = "";
        this.text = "";
        this.timestamp = 0;
    }
}
exports.ChatMessage = ChatMessage;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatMessage.prototype, "sender", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ChatMessage.prototype, "text", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], ChatMessage.prototype, "timestamp", void 0);
class Projectile extends schema_1.Schema {
    constructor() {
        super(...arguments);
        // Rebuild Trigger
        this.id = "";
        this.spellId = "";
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.ownerId = "";
        this.type = "rock"; // rock, paper, scissors
        this.creationTime = 0;
        this.maxRange = 600;
    }
}
exports.Projectile = Projectile;
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Projectile.prototype, "id", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Projectile.prototype, "spellId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Projectile.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Projectile.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Projectile.prototype, "vx", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Projectile.prototype, "vy", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Projectile.prototype, "ownerId", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Projectile.prototype, "type", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Projectile.prototype, "creationTime", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Projectile.prototype, "maxRange", void 0);
class GameState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.players = new schema_1.MapSchema();
        this.projectiles = new schema_1.MapSchema();
        this.items = new schema_1.MapSchema();
        this.messages = new schema_1.ArraySchema();
        this.worldStartTime = 0;
        // Authoritative House Points
        this.ignisPoints = 0;
        this.axiomPoints = 0;
        this.vesperPoints = 0;
        // Academic Date
        this.currentCourse = 1;
        this.currentMonth = "November";
    }
}
exports.GameState = GameState;
__decorate([
    (0, schema_1.type)({ map: Player }),
    __metadata("design:type", Object)
], GameState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)({ map: Projectile }),
    __metadata("design:type", Object)
], GameState.prototype, "projectiles", void 0);
__decorate([
    (0, schema_1.type)({ map: WorldItem }),
    __metadata("design:type", Object)
], GameState.prototype, "items", void 0);
__decorate([
    (0, schema_1.type)([ChatMessage]),
    __metadata("design:type", Object)
], GameState.prototype, "messages", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "worldStartTime", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "ignisPoints", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "axiomPoints", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "vesperPoints", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], GameState.prototype, "currentCourse", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], GameState.prototype, "currentMonth", void 0);
