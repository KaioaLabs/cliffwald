export interface StudentDef {
    id: number;
    name: string;
    house: 'ignis' | 'axiom' | 'vesper';
    skin: string;
    gender: 'm' | 'f';
}

const ROSTER: StudentDef[] = [];

const NAMES = {
    ignis: ['Ivan', 'Isabella', 'Isaac', 'Ivy', 'Ian', 'Iris', 'Igor', 'Imogen', 'Ilya', 'Ingrid', 'Isaiah', 'Isla'],
    axiom: ['Arthur', 'Alice', 'Aaron', 'Ava', 'Adam', 'Amelia', 'Alex', 'Audrey', 'Alan', 'Anna', 'Adrian', 'Aria'],
    vesper: ['Victor', 'Victoria', 'Vincent', 'Violet', 'Vance', 'Vanessa', 'Vlad', 'Valerie', 'Vaughn', 'Vivian', 'Vernon', 'Veronica']
};

let globalId = 1;

// Generate 24 Students (8 per house)
(['ignis', 'axiom', 'vesper'] as const).forEach(house => {
    const list = NAMES[house];
    for (let i = 0; i < 8; i++) {
        const name = list[i % list.length];
        const skin = house === 'ignis' ? "player_red" : (house === 'axiom' ? "player_blue" : "player_idle");
        
        ROSTER.push({
            id: globalId++,
            name: name,
            house: house,
            skin: skin,
            gender: i % 2 === 0 ? 'm' : 'f'
        });
    }
});

export const StudentData = {
    getAll: () => ROSTER,
    getById: (id: number) => ROSTER.find(s => s.id === id),
    getByHouse: (house: string) => ROSTER.filter(s => s.house === house)
};
