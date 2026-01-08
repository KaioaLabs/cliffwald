"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOTAL_CARDS = exports.GET_ALL_CARDS = exports.ITEM_REGISTRY = void 0;
const items_json_1 = __importDefault(require("./items.json"));
exports.ITEM_REGISTRY = items_json_1.default;
// Helper to get only cards for the album
const GET_ALL_CARDS = () => {
    return Object.values(exports.ITEM_REGISTRY)
        .filter(item => item.Type === 'Card')
        .sort((a, b) => {
        const idA = parseInt(a.ID.split('_')[1]);
        const idB = parseInt(b.ID.split('_')[1]);
        if (!isNaN(idA) && !isNaN(idB))
            return idA - idB;
        if (!isNaN(idA))
            return -1; // Numbers first
        if (!isNaN(idB))
            return 1;
        return a.ID.localeCompare(b.ID); // String sort for rest
    });
};
exports.GET_ALL_CARDS = GET_ALL_CARDS;
exports.TOTAL_CARDS = (0, exports.GET_ALL_CARDS)().length;
