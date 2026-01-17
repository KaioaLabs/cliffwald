export interface ZoneDef {
    displayName: string;
    isSanctuary?: boolean; // Safe 24/7 (Dorms, Infirmary)
    bgm?: string;
}

export const ZONE_DATA: Record<string, ZoneDef> = {
    "FOREST": { displayName: "Forbidden Forest" },
    "GREAT_HALL": { displayName: "Great Hall" }, // Dangerous at night!
    "TRAINING_GROUNDS": { displayName: "Dueling Club" },
    "INFIRMARY": { displayName: "Hospital Wing", isSanctuary: true },
    "LIBRARY": { displayName: "Library" },
    "DORM_IGNIS": { displayName: "Ignis Dormitory", isSanctuary: true },
    "DORM_AXIOM": { displayName: "Axiom Dormitory", isSanctuary: true },
    "DORM_VESPER": { displayName: "Vesper Dormitory", isSanctuary: true },
    "COURTYARD": { displayName: "Clocktower Courtyard" },
    "ACADEMIC_WING": { displayName: "Classrooms" }
};