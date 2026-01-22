export const LOCATIONS = {
    FOREST: { x: 6080, y: 10560 },
    ISTHMUS: { x: 8000, y: 6500 },
    GREAT_HALL: { x: 8000, y: 5360 },
    COURTYARD: { x: 7840, y: 4000 },
    DORM_VESPER: { x: 6640, y: 3600 },
    BATHROOMS: { x: 7200, y: 3600 },
    DORM_IGNIS: { x: 8000, y: 2080 },
    CLASSROOM: { x: 8720, y: 3600 },
    LIBRARY: { x: 8720, y: 4480 },
    DORM_AXIOM: { x: 9360, y: 3600 }
};

export type RouteStep = {
    name: string;
    target: { x: number, y: number };
    action?: 'LOOK_AROUND' | 'CAST_SPELL' | 'WAIT';
};

export const ROUTES: Record<string, RouteStep[]> = {
    NORTH_TO_SOUTH: [
        { name: "Start at Ignis", target: LOCATIONS.DORM_IGNIS, action: 'WAIT' },
        { name: "Go to Hub", target: LOCATIONS.COURTYARD, action: 'LOOK_AROUND' },
        { name: "Enter Dining Hall", target: LOCATIONS.GREAT_HALL, action: 'CAST_SPELL' },
        { name: "Cross Bridge", target: LOCATIONS.ISTHMUS },
        { name: "Enter Forest", target: LOCATIONS.FOREST, action: 'LOOK_AROUND' }
    ],
    ACADEMIC_LOOP: [
        { name: "Classroom", target: LOCATIONS.CLASSROOM },
        { name: "Library", target: LOCATIONS.LIBRARY, action: 'CAST_SPELL' },
        { name: "Axiom Dorm", target: LOCATIONS.DORM_AXIOM },
        { name: "Back to Class", target: LOCATIONS.CLASSROOM }
    ]
};
