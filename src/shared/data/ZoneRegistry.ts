export interface ZoneDef {
    displayName: string;
    isSanctuary?: boolean; // Safe 24/7 (Dorms, Infirmary)
    bgm?: string;
    pvp?: boolean; // Always PVP enabled (Forest)
}

export const ZONE_DATA: Record<string, ZoneDef> = {
    // --- SAFE ZONES (SANCTUARIES) ---
    "DORM_IGNIS": { displayName: "Ignis Tower", isSanctuary: true },
    "DORM_AXIOM": { displayName: "Axiom Quarters", isSanctuary: true },
    "DORM_VESPER": { displayName: "Vesper Dungeon", isSanctuary: true },
    "INFIRMARY": { displayName: "Hospital Wing", isSanctuary: true },

    // --- CONDITIONAL ZONES (SAFE BY DAY, PVP BY NIGHT) ---
    "GREAT_HALL": { displayName: "Dining Hall" },
    "COURTYARD": { displayName: "Central Courtyard" },
    "CLASSROOM": { displayName: "Academic Wing" },
    "LIBRARY": { displayName: "Grand Library" },
    "DETENTION": { displayName: "Detention Chamber" },
    "SECRET_GARDEN": { displayName: "North Garden" },
    "BATHROOMS": { displayName: "Prefect's Washroom" },

    // --- WILD ZONES (ALWAYS PVP) ---
    "FOREST": { displayName: "The Wild Woods", pvp: true },
    "HIDDEN_ARCHIVE": { displayName: "Forbidden Archive", pvp: true },
    "THE_PLUMBING": { displayName: "The Plumbing", pvp: true },
    "STUDY_BRIDGE": { displayName: "The Study Bridge", pvp: true }
};
