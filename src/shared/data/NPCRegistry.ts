export interface NPCDef {
    name: string; // Display Name
    skin: string;
    behavior: 'teacher' | 'patrol' | 'static';
    dialogueId?: string;
}

export const NPC_DATA: Record<string, NPCDef> = {
    // Keys match the "name" property in Tiled Objects
    "Professor Hecate": {
        name: "Professor Hecate",
        skin: "teacher", // Can specialize later e.g. "teacher_hecate"
        behavior: 'teacher'
    },
    "Headmaster Aris": {
        name: "Headmaster Aris",
        skin: "teacher",
        behavior: 'static'
    },
    "Caretaker Filch": {
        name: "Caretaker Filch",
        skin: "teacher", // Needs a unique skin eventually
        behavior: 'patrol'
    },
    "Matron Pomfrey": {
        name: "Matron Pomfrey",
        skin: "teacher",
        behavior: 'static'
    },
    "Baba Yaga": {
        name: "Baba Yaga",
        skin: "teacher",
        behavior: 'teacher'
    },
    "Professor Merlin": {
        name: "Professor Merlin",
        skin: "teacher",
        behavior: 'teacher'
    }
};
